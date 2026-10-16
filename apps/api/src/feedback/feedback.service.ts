import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { encode } from 'html-entities';
import { EmailQueueService } from '../email/email-queue.service.js';
import type { CreateFeedbackDto } from './dto/create-feedback.dto.js';

@Injectable()
export class FeedbackService {
  constructor(
    private readonly config: ConfigService,
    private readonly emailQueue: EmailQueueService,
  ) {}

  async sendFeedback(dto: CreateFeedbackDto): Promise<{ message: string }> {
    const htmlContent = `<p>Type: ${encode(dto.type)}</p>
<p>Sujet: ${encode(dto.subject)}</p>
<p>Contenu: ${encode(dto.content)}</p>
<p>Email: ${encode(dto.email || 'Non fourni')}</p>
<p>Date: ${new Date().toISOString()}</p>`;

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
