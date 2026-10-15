import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { DashboardService } from './dashboard.service.js';
import { UpdateProfileDto } from './dto/update-profile.dto.js';

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

  @Patch('profile')
  @ApiOperation({ summary: 'Update user profile (username, email, avatar)' })
  @ApiResponse({ status: 200, description: 'Profile updated' })
  @ApiResponse({ status: 409, description: 'Username or email already taken' })
  async updateProfile(@CurrentUser('id') userId: string, @Body() dto: UpdateProfileDto) {
    await this.dashboardService.updateProfile(userId, dto);
    return { success: true, message: 'Informations modifiées avec succès' };
  }
}
