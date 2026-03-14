const handlebars = require('handlebars');
const fs = require('fs');
const path = require('path');
const nodemailer = require('nodemailer');
const { SESv2Client, SendEmailCommand } = require('@aws-sdk/client-sesv2');
const { withTimeout, withRetry } = require('../core/resilience');

const sesClient = new SESv2Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

const transporter = nodemailer.createTransport({
  SES: { sesClient, SendEmailCommand },
});

class MailersendService {
  // Staging interceptor: redirect all emails to a test inbox.
  // Prevents real users from receiving emails triggered by staging tests.
  // Set STAGING_EMAIL_INTERCEPT in Railway staging variables.
  _resolveRecipient(user_email) {
    const isStaging = process.env.NODE_ENV === 'staging';
    const interceptAddress = process.env.STAGING_EMAIL_INTERCEPT;
    if (isStaging && interceptAddress) {
      return { to: interceptAddress, intercepted: true, original: user_email };
    }
    return { to: user_email, intercepted: false, original: user_email };
  }

  async sendEmail(user_email, content, subject = 'Révision quotidienne - SealVo') {
    try {
      const { to, intercepted, original } = this._resolveRecipient(user_email);
      const resolvedSubject = intercepted ? `[STAGING → ${original}] ${subject}` : subject;

      const result = await withRetry(
        () =>
          withTimeout(
            () =>
              transporter.sendMail({
                from: process.env.AWS_SES_FROM,
                to,
                subject: resolvedSubject,
                html: content,
              }),
            10000
          ),
        { retries: 2, delay: 1000 }
      );

      if (result?.messageId) {
        if (intercepted) {
          console.log(
            `[Email][STAGING] Intercepted: original=${original} → sent to ${to} | messageId: ${result.messageId}`
          );
        } else if (process.env.NODE_ENV !== 'production') {
          console.log(`[Email] Sent to ${to} | messageId: ${result.messageId}`);
        }
      }
      return result;
    } catch (error) {
      console.error("Erreur lors de l'envoi de l'email:", error);
      return false;
    }
  }

  async generateEmailVerification(username, token) {
    const verificationLink = `${process.env.BASE_URL}auth/verify/${token}`;
    const templatePath = path.join(__dirname, '../views/mails/mailVerification.hbs');
    const template = handlebars.compile(fs.readFileSync(templatePath, 'utf8'));
    return template({ username, verificationLink });
  }

  async generateEmail(allWords, totalWords, streakData, user) {
    const words = allWords.map((word) => ({
      ...word,
      isLevel0: word.level === 'x',
      isLevel1: word.level === '0',
      isLevel2: word.level === '1',
      isLevel3: word.level === '2',
      isLevel4: word.level === 'v',
    }));

    let streak = null;
    if (streakData && streakData.streak !== undefined) {
      const currentStreak = parseInt(streakData.streak) || 0;
      streak = {
        currentStreak,
        longestStreak: currentStreak,
        isAtRisk: currentStreak > 0 && totalWords > 0,
        isOnFire: currentStreak >= 7,
        isGood: currentStreak >= 3 && currentStreak < 7,
      };
    }

    const templatePath = path.join(__dirname, '../views/mails/mail.hbs');
    const template = handlebars.compile(fs.readFileSync(templatePath, 'utf8'));
    return template({
      user,
      wordCount: totalWords,
      wordsShown: words.length,
      hasMoreWords: totalWords > 5,
      words,
      streak,
      baseUrl: process.env.BASE_URL,
    });
  }

  async generateResetPasswordEmail(username, token) {
    const resetPasswordLink = `${process.env.BASE_URL}login/resetPassword?token=${token}`;
    const templatePath = path.join(__dirname, '../views/mails/mailResetPassword.hbs');
    const template = handlebars.compile(fs.readFileSync(templatePath, 'utf8'));
    return template({ username, resetPasswordLink });
  }
}

module.exports = new MailersendService();
