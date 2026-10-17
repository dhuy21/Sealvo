import { randomBytes } from 'crypto';
import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Inject,
  Logger,
  Post,
  Query,
  Redirect,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { THROTTLE, Throttled } from '../common/throttler/throttle-policies.js';
import type { CookieOptions, Request, Response } from 'express';
import { AuthService } from './auth.service.js';
import { EmailVerificationService } from './email-verification.service.js';
import { PasswordResetService } from './password-reset.service.js';
import { GoogleAuthService } from './google-auth.service.js';
import { SESSION_TTL_MS } from './auth.constants.js';
import { appConfig, type AppConfig } from '../config/app.config.js';
import { RegisterDto } from './dto/register.dto.js';
import { LoginDto } from './dto/login.dto.js';
import { ForgotPasswordDto } from './dto/forgot-password.dto.js';
import { ResetPasswordDto } from './dto/reset-password.dto.js';
import { VerifyEmailDto } from './dto/verify-email.dto.js';
import { ResendVerificationDto } from './dto/resend-verification.dto.js';
import { JwtAuthGuard } from './guards/jwt-auth.guard.js';
import { SameOriginGuard } from './guards/same-origin.guard.js';
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
    private readonly emailVerificationService: EmailVerificationService,
    private readonly passwordResetService: PasswordResetService,
    private readonly googleAuthService: GoogleAuthService,
    @Inject(appConfig.KEY) private readonly app: AppConfig,
  ) {}

  private get secureCookies(): boolean {
    return this.app.isDeployed;
  }

  // clearCookie must receive the same attributes as cookie, otherwise some browsers keep the cookie
  private get refreshCookieOptions(): CookieOptions {
    return { httpOnly: true, secure: this.secureCookies, sameSite: 'strict', path: '/auth' };
  }

  private get googleStateCookieOptions(): CookieOptions {
    return {
      httpOnly: true,
      secure: this.secureCookies,
      // Strict cookies are not sent on Google's cross-site redirect back to the callback
      sameSite: 'lax',
      path: GOOGLE_STATE_PATH,
    };
  }

  private setRefreshCookie(res: Response, refreshToken: string) {
    res.cookie(REFRESH_COOKIE, refreshToken, {
      ...this.refreshCookieOptions,
      maxAge: SESSION_TTL_MS,
    });
  }

  private clearRefreshCookie(res: Response) {
    res.clearCookie(REFRESH_COOKIE, this.refreshCookieOptions);
  }

  @Post('register')
  @UseGuards(SameOriginGuard)
  @Throttled(THROTTLE.REGISTER)
  @ApiOperation({ summary: 'Register a new user' })
  @ApiResponse({ status: 201, description: 'User registered successfully' })
  @ApiResponse({
    status: 409,
    description: 'Username already taken (a taken email gets the 201 response)',
  })
  async register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Post('login')
  @UseGuards(SameOriginGuard)
  @Throttled(THROTTLE.LOGIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login with username and password' })
  @ApiResponse({ status: 200, description: 'Login successful, returns access token' })
  @ApiResponse({ status: 401, description: 'Invalid credentials or unverified account' })
  async login(@Body() dto: LoginDto, @Res({ passthrough: true }) res: Response) {
    const { accessToken, refreshToken } = await this.authService.login(dto);
    this.setRefreshCookie(res, refreshToken);
    return { accessToken };
  }

  @Post('refresh')
  @UseGuards(SameOriginGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Rotate the refresh cookie and return a new access token' })
  @ApiResponse({ status: 200, description: 'New access token returned' })
  @ApiResponse({ status: 401, description: 'Invalid, expired or revoked session' })
  async refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    try {
      const { accessToken, refreshToken } = await this.authService.refreshTokens(
        req.cookies?.[REFRESH_COOKIE],
      );
      this.setRefreshCookie(res, refreshToken);
      return { accessToken };
    } catch (error) {
      this.clearRefreshCookie(res);
      throw error;
    }
  }

  @Post('logout')
  @UseGuards(SameOriginGuard, JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Logout: revokes this device session and clears the refresh cookie' })
  @ApiResponse({ status: 200, description: 'Logged out' })
  async logout(
    @CurrentUser('id') userId: string,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    await this.authService.logout(userId, req.cookies?.[REFRESH_COOKIE]);
    this.clearRefreshCookie(res);
    return { message: 'Vous avez été déconnecté' };
  }

  @Post('forgot-password')
  @Throttled(THROTTLE.FORGOT_PASSWORD)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Send password reset email' })
  @ApiResponse({
    status: 200,
    description: 'Generic message; the email is only sent if the account exists',
  })
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.passwordResetService.forgotPassword(dto.email);
  }

  @Post('reset-password')
  @Throttled(THROTTLE.RESET_PASSWORD)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reset password with token' })
  @ApiResponse({ status: 200, description: 'Password reset successful' })
  @ApiResponse({ status: 400, description: 'Invalid or expired token' })
  async resetPassword(@Body() dto: ResetPasswordDto) {
    return this.passwordResetService.resetPassword(dto.token, dto.password);
  }

  @Post('verify-email')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify email address with the token sent at registration' })
  @ApiResponse({ status: 200, description: 'Email verified' })
  @ApiResponse({ status: 400, description: 'Invalid, expired or already used token' })
  @ApiResponse({ status: 409, description: 'Email change: the new address was taken meanwhile' })
  async verifyEmail(@Body() dto: VerifyEmailDto) {
    return this.emailVerificationService.verifyEmail(dto.token);
  }

  @Post('resend-verification')
  @Throttled(THROTTLE.RESEND_VERIFICATION)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Resend the verification email of an unverified account' })
  @ApiResponse({
    status: 200,
    description: 'Generic message; the email is only sent if an unverified account matches',
  })
  async resendVerification(@Body() dto: ResendVerificationDto) {
    return this.emailVerificationService.resendVerification(dto.username);
  }

  @Get('google')
  @Redirect()
  @ApiOperation({ summary: 'Redirect to the Google OAuth consent screen' })
  @ApiResponse({ status: 302, description: 'Redirect to Google' })
  googleAuth(@Res({ passthrough: true }) res: Response) {
    const state = randomBytes(16).toString('hex');
    res.cookie(GOOGLE_STATE_COOKIE, state, {
      ...this.googleStateCookieOptions,
      maxAge: 10 * 60 * 1000, // 10 minutes
    });
    return { url: this.googleAuthService.getGoogleAuthUrl(state) };
  }

  @Get('google/callback')
  @Redirect()
  @ApiOperation({ summary: 'Google OAuth callback: sets refresh cookie, redirects to frontend' })
  @ApiResponse({
    status: 302,
    description: 'Redirect to /dashboard, or /login?error=... on failure',
  })
  async googleCallback(
    @Query('code') code: string | undefined,
    @Query('state') state: string | undefined,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { frontendUrl } = this.app;
    const expectedState: unknown = req.cookies?.[GOOGLE_STATE_COOKIE];
    res.clearCookie(GOOGLE_STATE_COOKIE, this.googleStateCookieOptions);

    if (!code) {
      return { url: `${frontendUrl}/login?error=google_no_code` };
    }

    try {
      if (!state || state !== expectedState) {
        throw new Error('OAuth state mismatch');
      }
      const { refreshToken } = await this.googleAuthService.googleLogin(code);
      this.setRefreshCookie(res, refreshToken);
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
