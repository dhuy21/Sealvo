import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SESv2Client, SendEmailCommand } from '@aws-sdk/client-sesv2';
import nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';
import handlebars from 'handlebars';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

// Same depth from src/email (tests) and dist/email (runtime), independent of the process cwd
const TEMPLATES_DIR = fileURLToPath(new URL('../../templates/mails/', import.meta.url));

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly templates = new Map<string, ReturnType<typeof handlebars.compile>>();
  private transporter: Transporter;
  private readonly fromAddress: string;
  private readonly isStaging: boolean;
  private readonly stagingIntercept: string | undefined;

  constructor(private readonly config: ConfigService) {
    const sesClient = new SESv2Client({
      region: this.config.getOrThrow<string>('AWS_REGION'),
      credentials: {
        accessKeyId: this.config.getOrThrow<string>('AWS_ACCESS_KEY_ID'),
        secretAccessKey: this.config.getOrThrow<string>('AWS_SECRET_ACCESS_KEY'),
      },
    });

    this.transporter = nodemailer.createTransport({
      SES: { sesClient, SendEmailCommand },
    });

    this.fromAddress = this.config.getOrThrow<string>('AWS_SES_FROM');
    this.isStaging = this.config.get<string>('NODE_ENV') === 'staging';
    this.stagingIntercept = this.config.get<string>('STAGING_EMAIL_INTERCEPT');
  }

  /** Staging interceptor: redirect emails to test inbox */
  private resolveRecipient(email: string) {
    if (this.isStaging && this.stagingIntercept) {
      return { to: this.stagingIntercept, intercepted: true, original: email };
    }
    return { to: email, intercepted: false, original: email };
  }

  async sendEmail(
    userEmail: string,
    htmlContent: string,
    subject = 'Révision quotidienne - SealVo',
  ): Promise<boolean> {
    try {
      const { to, intercepted, original } = this.resolveRecipient(userEmail);
      const resolvedSubject = intercepted
        ? `[STAGING → ${original}] ${subject}`
        : subject;

      const result = await this.transporter.sendMail({
        from: this.fromAddress,
        to,
        subject: resolvedSubject,
        html: htmlContent,
      });

      if (result?.messageId) {
        if (intercepted) {
          this.logger.log(
            `[STAGING] Intercepted: original=${original} → sent to ${to} | messageId: ${result.messageId}`,
          );
        }
      }
      return true;
    } catch (error) {
      this.logger.error(
        `Failed to send email: ${error instanceof Error ? error.message : error}`,
      );
      return false;
    }
  }

  /** Render apps/api/templates/mails/<name>; each template is compiled once (#26) */
  compileTemplate(templateName: string, data: Record<string, unknown>): string {
    let template = this.templates.get(templateName);
    if (!template) {
      const source = fs.readFileSync(path.join(TEMPLATES_DIR, templateName), 'utf8');
      template = handlebars.compile(source);
      this.templates.set(templateName, template);
    }
    return template(data);
  }
}
