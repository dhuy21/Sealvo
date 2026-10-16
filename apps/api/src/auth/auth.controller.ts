import { randomBytes } from 'crypto';
import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Logger,
  Post,
  Query,
  Redirect,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import type { CookieOptions, Request, Response } from 'express';
import { AuthService } from './auth.service.js';
import { RegisterDto } from './dto/register.dto.js';
import { LoginDto } from './dto/login.dto.js';
import { ForgotPasswordDto } from './dto/forgot-password.dto.js';
import { ResetPasswordDto } from './dto/reset-password.dto.js';
import { VerifyEmailDto } from './dto/verify-email.dto.js';
import { JwtAuthGuard } from './guards/jwt-auth.guard.js';
import { JwtRefreshGuard } from './guards/jwt-refresh.guard.js';
import { CurrentUser } from './decorators/current-user.decorator.js';

const REFRESH_COOKIE = 'refresh_token';
const GOOGLE_STATE_COOKIE = 'google_oauth_state';
const GOOGLE_STATE_PATH = '/auth/google';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(
    private readonly authService: AuthService,
    private readonly config: ConfigService,
  ) {}

  private get cookieOptions(): CookieOptions {
    return {
      httpOnly: true,
      secure: this.config.get<string>('NODE_ENV') === 'production',
      sameSite: 'strict',
      path: '/auth',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    };
  }

  @Post('register')
  @Throttle({ default: { ttl: 15 * 60_000, limit: 5 } })
  @ApiOperation({ summary: 'Register a new user' })
  @ApiResponse({ status: 201, description: 'User registered successfully' })
  @ApiResponse({ status: 409, description: 'Username or email already taken' })
  async register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Post('login')
  @Throttle({ default: { ttl: 15 * 60_000, limit: 10 } })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login with username and password' })
  @ApiResponse({ status: 200, description: 'Login successful, returns access token' })
  @ApiResponse({ status: 401, description: 'Invalid credentials or unverified account' })
  async login(@Body() dto: LoginDto, @Res({ passthrough: true }) res: Response) {
    const { accessToken, refreshToken } = await this.authService.login(dto);
    res.cookie(REFRESH_COOKIE, refreshToken, this.cookieOptions);
    return { accessToken };
  }

  @Post('refresh')
  @UseGuards(JwtRefreshGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refresh access token using refresh cookie' })
  @ApiResponse({ status: 200, description: 'New access token returned' })
  @ApiResponse({ status: 401, description: 'Invalid or expired refresh token' })
  async refresh(
    @CurrentUser('id') userId: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { accessToken, refreshToken } = await this.authService.refreshTokens(userId);
    res.cookie(REFRESH_COOKIE, refreshToken, this.cookieOptions);
    return { accessToken };
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Logout (clears refresh cookie)' })
  @ApiResponse({ status: 200, description: 'Logged out' })
  async logout(@Res({ passthrough: true }) res: Response) {
    res.clearCookie(REFRESH_COOKIE, { path: '/auth' });
    return { message: 'Logged out' };
  }

  @Post('forgot-password')
  @Throttle({ default: { ttl: 60 * 60_000, limit: 3 } })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Send password reset email' })
  @ApiResponse({ status: 200, description: 'Reset email sent' })
  @ApiResponse({ status: 400, description: 'Email not found' })
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto.email);
  }

  @Post('reset-password')
  @Throttle({ default: { ttl: 15 * 60_000, limit: 10 } })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reset password with token' })
  @ApiResponse({ status: 200, description: 'Password reset successful' })
  @ApiResponse({ status: 400, description: 'Invalid or expired token' })
  async resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto.token, dto.password);
  }

  @Post('verify-email')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify email address with the token sent at registration' })
  @ApiResponse({ status: 200, description: 'Email verified' })
  @ApiResponse({ status: 400, description: 'Invalid, expired or already used token' })
  async verifyEmail(@Body() dto: VerifyEmailDto) {
    return this.authService.verifyEmail(dto.token);
  }

  @Get('google')
  @Redirect()
  @ApiOperation({ summary: 'Redirect to the Google OAuth consent screen' })
  @ApiResponse({ status: 302, description: 'Redirect to Google' })
  googleAuth(@Res({ passthrough: true }) res: Response) {
    const state = randomBytes(16).toString('hex');
    res.cookie(GOOGLE_STATE_COOKIE, state, {
      httpOnly: true,
      secure: this.config.get<string>('NODE_ENV') === 'production',
      // Strict cookies are not sent on Google's cross-site redirect back to the callback
      sameSite: 'lax',
      path: GOOGLE_STATE_PATH,
      maxAge: 10 * 60 * 1000, // 10 minutes
    });
    return { url: this.authService.getGoogleAuthUrl(state) };
  }

  @Get('google/callback')
  @Redirect()
  @ApiOperation({ summary: 'Google OAuth callback: sets refresh cookie, redirects to frontend' })
  @ApiResponse({ status: 302, description: 'Redirect to /dashboard, or /login?error=... on failure' })
  async googleCallback(
    @Query('code') code: string | undefined,
    @Query('state') state: string | undefined,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const frontendUrl = this.config.get<string>('FRONTEND_URL') ?? 'http://localhost:3000';
    const expectedState: unknown = req.cookies?.[GOOGLE_STATE_COOKIE];
    res.clearCookie(GOOGLE_STATE_COOKIE, { path: GOOGLE_STATE_PATH });

    if (!code) {
      return { url: `${frontendUrl}/login?error=google_no_code` };
    }

    try {
      if (!state || state !== expectedState) {
        throw new Error('OAuth state mismatch');
      }
      const { refreshToken } = await this.authService.googleLogin(code);
      res.cookie(REFRESH_COOKIE, refreshToken, this.cookieOptions);
      return { url: `${frontendUrl}/dashboard` };
    } catch (error) {
      this.logger.error(
        `Google authentication error: ${error instanceof Error ? error.message : String(error)}`,
      );
      return { url: `${frontendUrl}/login?error=google_failed` };
    }
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user profile' })
  @ApiResponse({ status: 200, description: 'User profile' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async me(@CurrentUser('id') userId: string) {
    return this.authService.getMe(userId);
  }
}
