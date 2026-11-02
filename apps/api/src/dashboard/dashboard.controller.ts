import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { DashboardService } from './dashboard.service.js';

@ApiTags('Dashboard')
@Controller('dashboard')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get()
  @ApiOperation({ summary: 'Get dashboard stats for current user' })
  @ApiResponse({ status: 200, description: 'Dashboard stats' })
  async getStats(@CurrentUser('id') userId: string) {
    const stats = await this.dashboardService.getStats(userId);
    return { success: true, ...stats };
  }
}
