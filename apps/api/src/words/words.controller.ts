import {
  Body,
  Controller,
  Delete,
  Get,
  HttpStatus,
  Param,
  ParseArrayPipe,
  ParseIntPipe,
  Patch,
  Post,
  Res,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { PackageOwnershipGuard } from '../auth/guards/package-ownership.guard.js';
import { PackageReadGuard } from '../auth/guards/package-read.guard.js';
import { InvalidateDashboardInterceptor } from '../packages/invalidate-dashboard.interceptor.js';
import { BulkWordsService } from '../import/bulk-words.service.js';
import { WordsService } from './words.service.js';
import { CreateWordDto } from './dto/create-word.dto.js';
import { UpdateWordDto } from './dto/update-word.dto.js';

@ApiTags('Words')
@Controller('packages/:packageId/words')
@UseGuards(JwtAuthGuard)
@UseInterceptors(InvalidateDashboardInterceptor)
@ApiBearerAuth()
export class WordsController {
  constructor(
    private readonly wordsService: WordsService,
    private readonly bulkWords: BulkWordsService,
  ) {}

  @Get()
  @UseGuards(PackageReadGuard)
  @ApiOperation({ summary: 'Get all words in a package (owner, or anyone for public/protected)' })
  @ApiResponse({ status: 200, description: 'List of words' })
  @ApiResponse({ status: 403, description: 'Private package of another user' })
  async findAll(@Param('packageId', ParseIntPipe) packageId: number) {
    return this.wordsService.findByPackageId(packageId);
  }

  @Get('review')
  @UseGuards(PackageOwnershipGuard)
  @ApiOperation({ summary: 'Get words due for review today (spaced repetition)' })
  @ApiResponse({ status: 200, description: 'Words with dueToday flag' })
  async findReview(@Param('packageId', ParseIntPipe) packageId: number) {
    return this.wordsService.findWordsToReview(packageId);
  }

  @Post()
  @UseGuards(PackageOwnershipGuard)
  @ApiOperation({ summary: 'Add one or more words to a package' })
  @ApiResponse({ status: 202, description: '3 words or more: queued (async via RabbitMQ)' })
  @ApiResponse({ status: 200, description: 'Words added synchronously' })
  async addWords(
    @Param('packageId', ParseIntPipe) packageId: number,
    @CurrentUser('id') userId: string,
    @Body(new ParseArrayPipe({ items: CreateWordDto })) dto: CreateWordDto[],
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.bulkWords.add('addWords', packageId, userId, dto);

    if (result.async) {
      res.status(HttpStatus.ACCEPTED);
      return { success: true, jobId: result.jobId, async: true, message: 'Traitement en cours.' };
    }

    res.status(HttpStatus.OK);
    return {
      success: true,
      async: false,
      message: `${result.imported} mot(s) importé(s) avec succès.`,
    };
  }

  @Patch(':detailId')
  @UseGuards(PackageOwnershipGuard)
  @ApiOperation({ summary: 'Update a word' })
  @ApiResponse({ status: 200, description: 'Word updated' })
  @ApiResponse({ status: 404, description: 'Word not found' })
  async update(
    @Param('packageId', ParseIntPipe) packageId: number,
    @Param('detailId', ParseIntPipe) detailId: number,
    @Body() dto: UpdateWordDto,
  ) {
    return this.wordsService.updateWord(packageId, detailId, dto);
  }

  @Delete(':detailId')
  @UseGuards(PackageOwnershipGuard)
  @ApiOperation({ summary: 'Delete a word from a package' })
  @ApiResponse({ status: 200, description: 'Word deleted' })
  @ApiResponse({ status: 404, description: 'Word not found' })
  async deleteOne(
    @Param('packageId', ParseIntPipe) packageId: number,
    @Param('detailId', ParseIntPipe) detailId: number,
  ) {
    return this.wordsService.deleteWord(packageId, detailId);
  }

  @Delete()
  @UseGuards(PackageOwnershipGuard)
  @ApiOperation({ summary: 'Delete all words from a package' })
  @ApiResponse({ status: 200, description: 'All words deleted' })
  async deleteAll(@Param('packageId', ParseIntPipe) packageId: number) {
    return this.wordsService.deleteAllWords(packageId);
  }
}
