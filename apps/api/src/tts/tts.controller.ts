import {
  Controller,
  Post,
  Body,
  Res,
  UseGuards,
  HttpException,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { Response } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { TtsService } from './tts.service.js';
import { IsString, IsNotEmpty, MaxLength, Matches } from 'class-validator';

export class GenerateAudioDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  text!: string;

  @IsString()
  @Matches(/^[a-z]{2,3}-[A-Z]{2}$/, { message: 'language must be a code like en-US' })
  language!: string;
}

@Controller('tts')
@UseGuards(JwtAuthGuard)
export class TtsController {
  private readonly logger = new Logger(TtsController.name);

  constructor(private readonly ttsService: TtsService) {}

  @Post('generate')
  @Throttle({ default: { ttl: 60_000, limit: 30 } })
  async generateAudio(
    @Body() dto: GenerateAudioDto,
    @Res() res: Response,
  ): Promise<void> {
    try {
      const audioBuffer = await this.ttsService.synthesize(
        dto.text,
        dto.language,
      );

      res.setHeader('Content-Type', 'audio/mpeg');
      res.setHeader('Content-Length', audioBuffer.length);
      res.setHeader('Cache-Control', 'public, max-age=86400');
      res.send(audioBuffer);
    } catch (error) {
      if (error instanceof HttpException) throw error;
      this.logger.error(
        `TTS synthesis failed: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw new ServiceUnavailableException(
        'Le service de synthèse vocale est momentanément indisponible.',
      );
    }
  }
}
