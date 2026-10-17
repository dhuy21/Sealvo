import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { DashboardService } from './dashboard.service.js';
import { UpdateProfileDto } from './dto/update-profile.dto.js';
import { THROTTLE, Throttled } from '../common/throttler/throttle-policies.js';

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
  @Throttled(THROTTLE.PROFILE)
  @ApiOperation({
    summary:
      'Update user profile (username, avatar); an email change is confirmed via the new address',
  })
  @ApiResponse({
    status: 200,
    description: 'Profile updated; `pendingEmail` set when an email change awaits confirmation',
  })
  @ApiResponse({ status: 400, description: 'current_password missing for an email change' })
  @ApiResponse({ status: 403, description: 'Wrong current_password' })
  @ApiResponse({ status: 409, description: 'Username or email already taken' })
  async updateProfile(@CurrentUser('id') userId: string, @Body() dto: UpdateProfileDto) {
    const { pendingEmail } = await this.dashboardService.updateProfile(userId, dto);
    if (pendingEmail) {
      return {
        success: true,
        message: `Un email de confirmation a été envoyé à ${pendingEmail}. Votre email sera modifié après confirmation.`,
        pendingEmail,
      };
    }
    return { success: true, message: 'Informations modifiées avec succès' };
  }
}
