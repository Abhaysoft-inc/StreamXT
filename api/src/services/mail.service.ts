import nodemailer from 'nodemailer';
import { env } from '../config/env';
import { ExternalServiceError } from '../errors/AppError';
import { ErrorCode } from '../errors/errorCodes';

export interface SendOtpEmailParams {
  to: string;
  code: string;
  purpose: 'signup_verify' | 'signin_otp';
}

class MailService {
  private readonly isConfigured: boolean;
  private readonly transporter: nodemailer.Transporter | null;

  constructor() {
    this.isConfigured = Boolean(env.SMTP_HOST && env.SMTP_USER && env.SMTP_PASS);

    this.transporter = this.isConfigured
      ? nodemailer.createTransport({
          host: env.SMTP_HOST,
          port: env.SMTP_PORT,
          secure: env.SMTP_SECURE,
          auth: {
            user: env.SMTP_USER,
            pass: env.SMTP_PASS,
          },
        })
      : null;
  }

  async sendOtpEmail({ to, code, purpose }: SendOtpEmailParams): Promise<void> {
    if (!this.transporter) {
      // Email delivery is kept on hold until SMTP credentials are added to .env.
      console.info(
        `[MAIL:HOLD] ${purpose} verification code for ${to}: ${code} (configure SMTP_* in .env to send emails)`,
      );
      return;
    }

    const subject =
      purpose === 'signup_verify'
        ? 'Verify your StreamXT email address'
        : 'Your StreamXT sign-in code';

    const text = `Your StreamXT verification code is ${code}. It expires in 10 minutes.`;
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
        <h2 style="margin-bottom: 12px;">${subject}</h2>
        <p style="color: #555; margin-bottom: 20px;">Enter this 6-digit code to continue:</p>
        <div style="font-size: 28px; font-weight: bold; letter-spacing: 6px; padding: 14px 20px; background: #111; color: #fff; border-radius: 8px; display: inline-block;">
          ${code}
        </div>
        <p style="color: #777; font-size: 13px; margin-top: 20px;">This code expires in 10 minutes.</p>
      </div>
    `;

    try {
      await this.transporter.sendMail({
        from: env.SMTP_FROM,
        to,
        subject,
        text,
        html,
      });
    } catch (error) {
      throw new ExternalServiceError(
        'Failed to send verification email',
        ErrorCode.EMAIL_DELIVERY_FAILED,
        error,
      );
    }
  }
}

export const mailService = new MailService();
