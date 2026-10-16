import {
  Controller,
  Post,
  Body,
  Res,
  UseGuards,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { Response } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { TtsService } from './tts.service.js';
import { IsString, IsNotEmpty } from 'class-validator';

export class GenerateAudioDto {
  @IsString()
  @IsNotEmpty()
  text!: string;

  @IsString()
  @IsNotEmpty()
  language!: string;
}

@Controller('tts')
@UseGuards(JwtAuthGuard)
export class TtsController {
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
      const message =
        error instanceof Error ? error.message : 'TTS synthesis failed';
      throw new HttpException(message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
}
