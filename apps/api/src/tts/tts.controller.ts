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
import { ThrottleMessage } from '../common/decorators/throttle-message.decorator.js';
import type { Response } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { TtsService } from './tts.service.js';
import { IsString, IsNotEmpty, MaxLength, Matches } from 'class-validator';

export class GenerateAudioDto {
  @IsString({ message: 'Le texte est requis' })
  @IsNotEmpty({ message: 'Le texte est requis' })
  @MaxLength(200, { message: 'Le texte ne doit pas dépasser 200 caractères' })
  text!: string;

  @IsString({ message: 'La langue est requise' })
  @Matches(/^[a-z]{2,3}-[A-Z]{2}$/, { message: 'Langue invalide. Format attendu : en-US' })
  language!: string;
}

@Controller('tts')
@UseGuards(JwtAuthGuard)
export class TtsController {
  private readonly logger = new Logger(TtsController.name);

  constructor(private readonly ttsService: TtsService) {}

  @Post('generate')
  @Throttle({ default: { ttl: 60_000, limit: 30 } })
  @ThrottleMessage('Trop de requêtes TTS. Réessayez dans 1 minute.')
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
