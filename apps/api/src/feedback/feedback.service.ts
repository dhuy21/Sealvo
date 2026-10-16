import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EmailQueueService } from '../email/email-queue.service.js';
import { EmailService } from '../email/email.service.js';
import type { CreateFeedbackDto } from './dto/create-feedback.dto.js';

@Injectable()
export class FeedbackService {
  constructor(
    private readonly config: ConfigService,
    private readonly emailQueue: EmailQueueService,
    private readonly emailService: EmailService,
  ) {}

  async sendFeedback(dto: CreateFeedbackDto): Promise<{ message: string }> {
    const htmlContent = this.emailService.compileTemplate('feedback.hbs', {
      type: dto.type,
      subject: dto.subject,
      content: dto.content,
      email: dto.email || 'Non fourni',
      date: new Date().toISOString(),
    });

    const toEmail = this.config.getOrThrow<string>('FEEDBACK_RECIPIENT_EMAIL');
    const sent = await this.emailQueue.enqueue({
      to: toEmail,
      content: htmlContent,
      subject: 'Nouveau feedback pour votre site',
    });

    if (!sent) {
      throw new InternalServerErrorException(
        "Une erreur est survenue lors de l'envoi de votre feedback. Veuillez réessayer plus tard.",
      );
    }

    return { message: "Merci pour votre feedback! Nous l'avons bien reçu." };
  }
}
