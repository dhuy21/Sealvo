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
import * as xlsx from 'xlsx';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { PackageOwnershipGuard } from '../auth/guards/package-ownership.guard.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { ImportQueueService } from './import-queue.service.js';
import { JobTrackerService } from './job-tracker.service.js';
import { RabbitmqService } from '../rabbitmq/rabbitmq.service.js';
import { WordsService } from '../words/words.service.js';
import type { CreateWordDto } from '../words/dto/create-word.dto.js';

interface ParsedWord {
  word: string;
  language_code: string;
  subject: string;
  type: string;
  pronunciation: string;
  meaning: string;
  example: string;
  synonyms: string;
  antonyms: string;
  grammar: string;
}

function parseExcelBuffer(buffer: Buffer): ParsedWord[] {
  const workbook = xlsx.read(buffer, { type: 'buffer' });
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  const data: unknown[][] = xlsx.utils.sheet_to_json(worksheet, { header: 1 });

  if (!data.length) return [];

  const startRow = data[0]?.[0] === 'Mot' || data[0]?.[0] === 'Word' ? 1 : 0;

  const words: ParsedWord[] = [];
  for (let i = startRow; i < data.length; i++) {
    const row = data[i];
    if (!row || row[0] == null || String(row[0]).trim() === '') continue;

    words.push({
      word: String(row[0]).trim(),
      language_code: row[1]
        ? String(row[1])
            .replace(/\([^)]*\)/g, '')
            .trim()
        : '',
      subject: row[2] ? String(row[2]).trim() : '',
      type: row[3] ? String(row[3]).trim() : '',
      pronunciation: row[4] ? String(row[4]).trim() : '',
      meaning: row[5] ? String(row[5]).trim() : '',
      example: row[6] ? String(row[6]).trim() : '',
      synonyms: row[7] ? String(row[7]).trim() : '',
      antonyms: row[8] ? String(row[8]).trim() : '',
      grammar: row[9] ? String(row[9]).trim() : '',
    });
  }

  return words;
}

@ApiTags('Import')
@Controller('packages/:packageId/import')
@UseGuards(JwtAuthGuard, PackageOwnershipGuard)
@ApiBearerAuth()
export class ImportController {
  constructor(
    private readonly importQueue: ImportQueueService,
    private readonly jobTracker: JobTrackerService,
    private readonly rabbitmq: RabbitmqService,
    private readonly wordsService: WordsService,
  ) {}

  @Post()
  @UseInterceptors(
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
  async importFile(
    @Param('packageId', ParseIntPipe) packageId: number,
    @CurrentUser('id') userId: string,
    @UploadedFile() file: Express.Multer.File | undefined,
  ) {
    if (!file) {
      throw new BadRequestException("Aucun fichier n'a été téléchargé");
    }

    const words = parseExcelBuffer(file.buffer);
    if (words.length === 0) {
      throw new BadRequestException('Le fichier ne contient aucun mot valide.');
    }

    // Try async via RabbitMQ
    if (this.rabbitmq.getChannel()) {
      const job = await this.jobTracker.create('import', { packageId: String(packageId), userId });
      if (job) {
        const published = this.importQueue.publish({
          jobId: job.id,
          wordsData: words as unknown as CreateWordDto[],
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
    await this.wordsService.addWords(packageId, words as unknown as CreateWordDto[]);
    return {
      success: true,
      async: false,
      message: `${words.length} mot(s) importé(s) avec succès.`,
    };
  }
}
