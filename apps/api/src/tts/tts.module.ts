import { Module } from '@nestjs/common';
import { TtsController } from './tts.controller.js';
import { TtsService } from './tts.service.js';
import { RedisModule } from '../redis/redis.module.js';

@Module({
  imports: [RedisModule],
  controllers: [TtsController],
  providers: [TtsService],
  exports: [TtsService],
})
export class TtsModule {}
