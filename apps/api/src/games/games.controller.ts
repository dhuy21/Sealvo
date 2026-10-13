import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { PackageOwnershipGuard } from '../auth/guards/package-ownership.guard.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { GamesService } from './games.service.js';
import { SaveScoreDto } from './dto/save-score.dto.js';

@ApiTags('Games')
@Controller('games')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class GamesController {
  constructor(private readonly gamesService: GamesService) {}

  @Get(':gameType/data')
  @UseGuards(JwtAuthGuard, PackageOwnershipGuard)
  @ApiOperation({ summary: 'Get words for a game (filtered by level + spaced repetition)' })
  @ApiResponse({ status: 200, description: 'Game data with words' })
  async getGameData(
    @Param('gameType') gameType: string,
    @Query('packageId', ParseIntPipe) packageId: number,
  ) {
    return this.gamesService.getWordsForGame(packageId, gameType);
  }

  @Post('score')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Save game score' })
  @ApiResponse({ status: 200, description: 'Score saved' })
  async saveScore(@CurrentUser('id') userId: string, @Body() dto: SaveScoreDto) {
    return this.gamesService.saveScore(userId, dto.game_type, dto.score);
  }

  @Get('scores')
  @ApiOperation({ summary: "Get current user's best scores for all games" })
  @ApiResponse({ status: 200, description: 'List of best scores' })
  async getScores(@CurrentUser('id') userId: string) {
    return this.gamesService.getUserScores(userId);
  }
}
