import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { THROTTLE, Throttled } from '../common/throttler/throttle-policies.js';
import { FeedbackService } from './feedback.service.js';
import { CreateFeedbackDto } from './dto/create-feedback.dto.js';

@ApiTags('Feedback')
@Controller('feedback')
export class FeedbackController {
  constructor(private readonly feedbackService: FeedbackService) {}

  @Post()
  @Throttled(THROTTLE.FEEDBACK)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Submit feedback' })
  @ApiResponse({ status: 200, description: 'Feedback sent successfully' })
  async create(@Body() dto: CreateFeedbackDto) {
    return this.feedbackService.sendFeedback(dto);
  }
}
