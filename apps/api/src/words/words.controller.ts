import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseArrayPipe,
  ParseIntPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { PackageOwnershipGuard } from '../auth/guards/package-ownership.guard.js';
import { WordsService } from './words.service.js';
import { CreateWordDto } from './dto/create-word.dto.js';
import { UpdateWordDto } from './dto/update-word.dto.js';

@ApiTags('Words')
@Controller('packages/:packageId/words')
@UseGuards(JwtAuthGuard, PackageOwnershipGuard)
@ApiBearerAuth()
export class WordsController {
  constructor(private readonly wordsService: WordsService) {}

  @Get()
  @ApiOperation({ summary: 'Get all words in a package' })
  @ApiResponse({ status: 200, description: 'List of words' })
  async findAll(@Param('packageId', ParseIntPipe) packageId: number) {
    return this.wordsService.findByPackageId(packageId);
  }

  @Get('review')
  @ApiOperation({ summary: 'Get words due for review today (spaced repetition)' })
  @ApiResponse({ status: 200, description: 'Words with dueToday flag' })
  async findReview(@Param('packageId', ParseIntPipe) packageId: number) {
    return this.wordsService.findWordsToReview(packageId);
  }

  @Post()
  @ApiOperation({ summary: 'Add one or more words to a package' })
  @ApiResponse({ status: 201, description: 'Words added' })
  async addWords(
    @Param('packageId', ParseIntPipe) packageId: number,
    @Body(new ParseArrayPipe({ items: CreateWordDto })) dto: CreateWordDto[],
  ) {
    return this.wordsService.addWords(packageId, dto);
  }

  @Patch(':detailId')
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
  @ApiOperation({ summary: 'Delete all words from a package' })
  @ApiResponse({ status: 200, description: 'All words deleted' })
  async deleteAll(@Param('packageId', ParseIntPipe) packageId: number) {
    return this.wordsService.deleteAllWords(packageId);
  }
}
