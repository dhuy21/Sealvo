import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { ThrottleMessage } from '../common/decorators/throttle-message.decorator.js';
import { FeedbackService } from './feedback.service.js';
import { CreateFeedbackDto } from './dto/create-feedback.dto.js';

@ApiTags('Feedback')
@Controller('feedback')
export class FeedbackController {
  constructor(private readonly feedbackService: FeedbackService) {}

  @Post()
  @Throttle({ default: { ttl: 60 * 60_000, limit: 5 } })
  @ThrottleMessage('Trop de feedbacks envoyés. Réessayez dans 1 heure.')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Submit feedback' })
  @ApiResponse({ status: 200, description: 'Feedback sent successfully' })
  async create(@Body() dto: CreateFeedbackDto) {
    return this.feedbackService.sendFeedback(dto);
  }
}
