import { Body, Controller, Get, HttpCode, HttpStatus, Post, UseGuards, UseInterceptors } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { PackageOwnershipGuard } from '../auth/guards/package-ownership.guard.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { InvalidateDashboardInterceptor } from '../packages/invalidate-dashboard.interceptor.js';
import { LearningService } from './learning.service.js';
import { TrackGameDto } from './dto/track-game.dto.js';
import { ResetLevelDto } from './dto/reset-level.dto.js';

@ApiTags('Learning')
@Controller('learning')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class LearningController {
  constructor(private readonly learningService: LearningService) {}

  @Post('streak')
  @UseInterceptors(InvalidateDashboardInterceptor)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Check and update daily streak' })
  @ApiResponse({ status: 200, description: 'Streak status' })
  async updateStreak(@CurrentUser('id') userId: string) {
    return this.learningService.checkAndUpdateStreak(userId);
  }

  @Post('level-progress/track')
  @UseGuards(PackageOwnershipGuard)
  @UseInterceptors(InvalidateDashboardInterceptor)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Track game completion for level progress' })
  @ApiResponse({ status: 200, description: 'Progress tracked' })
  async trackGame(@CurrentUser('id') userId: string, @Body() dto: TrackGameDto) {
    return this.learningService.trackGameCompletion(userId, dto.game_type, dto.completed, dto.packageId);
  }

  @Get('level-progress')
  @ApiOperation({ summary: 'Get current level progress' })
  @ApiResponse({ status: 200, description: 'Level progress' })
  async getProgress(@CurrentUser('id') userId: string) {
    return this.learningService.getLevelProgress(userId);
  }

  @Post('level-progress/reset')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reset level progress for a specific level' })
  @ApiResponse({ status: 200, description: 'Progress reset' })
  async resetProgress(@CurrentUser('id') userId: string, @Body() dto: ResetLevelDto) {
    return this.learningService.resetLevelProgress(userId, dto.level);
  }
}
