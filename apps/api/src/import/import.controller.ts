import 'multer';
import {
  BadRequestException,
  Controller,
  HttpStatus,
  Param,
  ParseIntPipe,
  Post,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiConsumes, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { PackageOwnershipGuard } from '../auth/guards/package-ownership.guard.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { InvalidateDashboardInterceptor } from '../packages/invalidate-dashboard.interceptor.js';
import { BulkWordsService } from './bulk-words.service.js';
import { ImportService } from './import.service.js';

@ApiTags('Import')
@Controller('packages/:packageId/import')
@UseGuards(JwtAuthGuard, PackageOwnershipGuard)
@ApiBearerAuth()
export class ImportController {
  constructor(
    private readonly importService: ImportService,
    private readonly bulkWords: BulkWordsService,
  ) {}

  @Post()
  @UseInterceptors(
    InvalidateDashboardInterceptor,
    FileInterceptor('file', {
      limits: { fileSize: 5 * 1024 * 1024 },
      fileFilter: (_req, file, cb) => {
        const ext = file.originalname.toLowerCase();
        if (ext.endsWith('.xlsx') || ext.endsWith('.xls')) {
          cb(null, true);
        } else {
          cb(
            new BadRequestException(
              'Type de fichier non supporté. Utilisez des fichiers Excel (xlsx, xls)',
            ),
            false,
          );
        }
      },
    }),
  )
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Import words from Excel file' })
  @ApiResponse({ status: 202, description: 'Import queued (async via RabbitMQ)' })
  @ApiResponse({ status: 200, description: 'Import processed synchronously' })
  @ApiResponse({ status: 400, description: 'Invalid file or rows (message lists the invalid rows)' })
  async importFile(
    @Param('packageId', ParseIntPipe) packageId: number,
    @CurrentUser('id') userId: string,
    @UploadedFile() file: Express.Multer.File | undefined,
    @Res({ passthrough: true }) res: Response,
  ) {
    if (!file) {
      throw new BadRequestException("Aucun fichier n'a été téléchargé");
    }

    const words = this.importService.parseWords(file.buffer);
    const result = await this.bulkWords.add('import', packageId, userId, words);

    if (result.async) {
      res.status(HttpStatus.ACCEPTED);
      return {
        success: true,
        jobId: result.jobId,
        async: true,
        message: 'Import en cours de traitement.',
      };
    }

    res.status(HttpStatus.OK);
    return {
      success: true,
      async: false,
      message: `${result.imported} mot(s) importé(s) avec succès.`,
    };
  }
}
