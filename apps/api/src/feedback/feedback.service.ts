import { Inject, Injectable, InternalServerErrorException } from '@nestjs/common';
import { appConfig, type AppConfig } from '../config/app.config.js';
import { EmailQueueService } from '../email/email-queue.service.js';
import { EmailService } from '../email/email.service.js';
import type { CreateFeedbackDto } from './dto/create-feedback.dto.js';

@Injectable()
export class FeedbackService {
  constructor(
    @Inject(appConfig.KEY) private readonly app: AppConfig,
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

    const sent = await this.emailQueue.enqueue({
      to: this.app.feedbackRecipient,
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
