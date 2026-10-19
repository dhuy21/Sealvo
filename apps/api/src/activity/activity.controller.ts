import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { ActivityQueryService } from './activity-query.service.js';

@ApiTags('Activities')
@Controller('activities')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ActivityController {
  constructor(private readonly activities: ActivityQueryService) {}

  @Get()
  @ApiOperation({ summary: "Journal of the current user's activity, newest first" })
  list(
    @CurrentUser('id') userId: string,
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: string,
  ) {
    const parsed = limit === undefined ? 20 : Number(limit);
    return this.activities.list(userId, cursor, Number.isInteger(parsed) ? parsed : 20);
  }
}
