import { Inject, Injectable, Logger } from '@nestjs/common';
import { mailConfig, type MailConfig } from '../config/mail.config.js';
import { SESv2Client, SendEmailCommand } from '@aws-sdk/client-sesv2';
import nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';
import handlebars from 'handlebars';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { isTransientError, TimeoutError, withRetry, withTimeout } from '@sealvo/shared';

const SEND_TIMEOUT_MS = 10_000;
const SEND_RETRY_DELAY_MS = 1_000;

// The timeout does not cancel the underlying send, which may still be delivered: never resend after it
const isRetryableSendError = (err: unknown) =>
  !(err instanceof TimeoutError) && isTransientError(err);

// Same depth from src/email (tests) and dist/email (runtime), independent of the process cwd
const TEMPLATES_DIR = fileURLToPath(new URL('../../templates/mails/', import.meta.url));

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly templates = new Map<string, ReturnType<typeof handlebars.compile>>();
  private transporter: Transporter;
  constructor(@Inject(mailConfig.KEY) private readonly config: MailConfig) {
    const sesClient = new SESv2Client({
      region: config.region,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
    });

    this.transporter = nodemailer.createTransport({
      SES: { sesClient, SendEmailCommand },
    });
  }

  /** Staging interceptor: redirect emails to test inbox */
  private resolveRecipient(email: string) {
    if (this.config.interceptTo) {
      return { to: this.config.interceptTo, intercepted: true, original: email };
    }
    return { to: email, intercepted: false, original: email };
  }

  async sendEmail(
    userEmail: string,
    htmlContent: string,
    subject = 'Révision quotidienne - SealVo',
    { retries = 0 }: { retries?: number } = {},
  ): Promise<boolean> {
    try {
      const { to, intercepted, original } = this.resolveRecipient(userEmail);
      const resolvedSubject = intercepted ? `[STAGING → ${original}] ${subject}` : subject;

      const result = await withRetry(
        () =>
          withTimeout(
            () =>
              this.transporter.sendMail({
                from: this.config.from,
                to,
                subject: resolvedSubject,
                html: htmlContent,
              }),
            SEND_TIMEOUT_MS,
          ),
        { retries, delay: SEND_RETRY_DELAY_MS, shouldRetry: isRetryableSendError },
      );

      if (result?.messageId) {
        if (intercepted) {
          this.logger.log(
            `[STAGING] Intercepted: original=${original} → sent to ${to} | messageId: ${result.messageId}`,
          );
        }
      }
      return true;
    } catch (error) {
      if (error instanceof TimeoutError) {
        this.logger.warn(`Email possibly sent, not retrying: ${error.message}`);
        return true;
      }
      this.logger.error(`Failed to send email: ${error instanceof Error ? error.message : error}`);
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
