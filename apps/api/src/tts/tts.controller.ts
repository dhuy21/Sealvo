import { Controller, Post, Body, Res, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { THROTTLE, Throttled } from '../common/throttler/throttle-policies.js';
import type { Response } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { CACHE_TTL } from '../redis/cache-keys.constants.js';
import { TtsService } from './tts.service.js';
import { GenerateAudioDto } from './dto/generate-audio.dto.js';

@ApiTags('TTS')
@Controller('tts')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class TtsController {
  constructor(private readonly ttsService: TtsService) {}

  @Post('generate')
  @Throttled(THROTTLE.TTS)
  @ApiOperation({ summary: 'Synthesize a short text to MP3 audio' })
  @ApiResponse({ status: 200, description: 'MP3 audio' })
  @ApiResponse({ status: 422, description: 'No voice available for the language' })
  @ApiResponse({ status: 503, description: 'Speech synthesis unavailable' })
  async generateAudio(@Body() dto: GenerateAudioDto, @Res() res: Response): Promise<void> {
    const audioBuffer = await this.ttsService.synthesize(dto.text, dto.language);

    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Content-Length', audioBuffer.length);
    res.setHeader('Cache-Control', `public, max-age=${CACHE_TTL.TTS_AUDIO}`);
    res.send(audioBuffer);
  }
}
