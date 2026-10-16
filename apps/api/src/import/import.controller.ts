import 'multer';
import {
  BadRequestException,
  Controller,
  Param,
  ParseIntPipe,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiConsumes, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { PackageOwnershipGuard } from '../auth/guards/package-ownership.guard.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { InvalidateDashboardInterceptor } from '../packages/invalidate-dashboard.interceptor.js';
import { ImportQueueService } from './import-queue.service.js';
import { ImportService } from './import.service.js';
import { JobTrackerService } from './job-tracker.service.js';
import { RabbitmqService } from '../rabbitmq/rabbitmq.service.js';
import { WordsService } from '../words/words.service.js';

@ApiTags('Import')
@Controller('packages/:packageId/import')
@UseGuards(JwtAuthGuard, PackageOwnershipGuard)
@ApiBearerAuth()
export class ImportController {
  constructor(
    private readonly importService: ImportService,
    private readonly importQueue: ImportQueueService,
    private readonly jobTracker: JobTrackerService,
    private readonly rabbitmq: RabbitmqService,
    private readonly wordsService: WordsService,
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
  ) {
    if (!file) {
      throw new BadRequestException("Aucun fichier n'a été téléchargé");
    }

    const words = this.importService.parseWords(file.buffer);

    // Try async via RabbitMQ
    if (this.rabbitmq.getChannel()) {
      const job = await this.jobTracker.create('import', { packageId: String(packageId), userId });
      if (job) {
        const published = this.importQueue.publish({
          jobId: job.id,
          wordsData: words,
          packageId,
          userId,
        });
        if (published) {
          return {
            success: true,
            jobId: job.id,
            async: true,
            message: 'Import en cours de traitement.',
          };
        }
        await this.jobTracker.remove(job.id);
      }
    }

    // Fallback: synchronous import
    await this.wordsService.addWords(packageId, words);
    return {
      success: true,
      async: false,
      message: `${words.length} mot(s) importé(s) avec succès.`,
    };
  }
}
