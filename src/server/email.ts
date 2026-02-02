import { Resend } from 'resend';

export interface PasswordResetEmailParams {
  email: string;
  userName: string;
  noteId: number;
  resetToken: string;
}

type PasswordResetTemplateInput = {
  userName: string;
  resetUrl: string;
};

const PasswordResetEmailTemplate = {
  subject: '🔐 Reset Your Note Password - Kairos',
  renderHtml: ({ userName, resetUrl }: PasswordResetTemplateInput) => `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Reset Your Note Password</title>
          </head>
          <body style="margin: 0; padding: 0; font-family: Kairos, KairosSans, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #FCFBF9;">
            <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
              
              <!-- Header -->
              <div style="text-align: center; margin-bottom: 40px;">
                <div style="width: 60px; height: 60px; background: linear-gradient(135deg, #9448F2 0%, #80C49B 100%); border-radius: 16px; display: inline-flex; align-items: center; justify-content: center; margin-bottom: 16px;">
                  <span style="color: white; font-size: 28px;">🔐</span>
                </div>
                <h1 style="margin: 0; color: #222B32; font-size: 28px; font-weight: bold;">Reset Your Note Password</h1>
              </div>

              <!-- Main Content -->
              <div style="background: white; border-radius: 16px; padding: 32px; border: 1px solid #DDE3E9; box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);">
                <p style="margin: 0 0 20px 0; color: #222B32; font-size: 16px; line-height: 1.6;">
                  Hi <strong>${userName}</strong>,
                </p>
                
                <p style="margin: 0 0 20px 0; color: #59677C; font-size: 16px; line-height: 1.6;">
                  We received a request to reset the password for one of your encrypted notes. 
                  Click the button below to create a new password:
                </p>

                <div style="text-align: center; margin: 32px 0;">
                  <a href="${resetUrl}" 
                     style="display: inline-block; padding: 16px 32px; background: linear-gradient(135deg, #9448F2 0%, #80C49B 100%); color: white; text-decoration: none; border-radius: 12px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 12px rgba(148, 72, 242, 0.3);">
                    Reset Password
                  </a>
                </div>

                <!-- Security Notice -->
                <div style="background: #FFC53D20; border-left: 4px solid #FFC53D; padding: 16px; border-radius: 8px; margin: 24px 0;">
                  <p style="margin: 0; color: #59677C; font-size: 14px; line-height: 1.6;">
                    <strong style="color: #222B32;">⚠️ Security Notice:</strong><br>
                    This link will expire in <strong>1 hour</strong>. If you didn't request this reset, you can safely ignore this email.
                  </p>
                </div>

                <p style="margin: 24px 0 0 0; color: #59677C; font-size: 14px; line-height: 1.6;">
                  If the button doesn't work, copy and paste this link into your browser:
                </p>
                <p style="margin: 8px 0 0 0; color: #9448F2; font-size: 13px; word-break: break-all;">
                  ${resetUrl}
                </p>
              </div>

              <!-- Footer -->
              <div style="text-align: center; margin-top: 32px; padding-top: 24px; border-top: 1px solid #DDE3E9;">
                <p style="margin: 0 0 8px 0; color: #59677C; font-size: 14px;">
                  Best regards,<br>
                  <strong style="color: #222B32;">The Kairos Team</strong>
                </p>
                <p style="margin: 16px 0 0 0; color: #59677C; font-size: 12px;">
                  This is an automated email. Please do not reply to this message.
                </p>
              </div>

            </div>
          </body>
        </html>
      `,
  renderText: ({ userName, resetUrl }: PasswordResetTemplateInput) => `
Hi ${userName},

We received a request to reset the password for one of your encrypted notes.

Click this link to reset your password:
${resetUrl}

This link will expire in 1 hour.

If you didn't request this reset, you can safely ignore this email.

Best regards,
The Kairos Team
      `,
} as const;

type EmailServiceOptions = {
  appUrl: string;
  fromEmail: string;
};

export class EmailService {
  constructor(
    private readonly resend: Resend,
    private readonly options: EmailServiceOptions
  ) {}

  async sendPasswordResetEmail({
    email,
    userName,
    noteId,
    resetToken,
  }: PasswordResetEmailParams): Promise<{ id: string } | null> {
    const resetUrl = `${this.options.appUrl}/reset-password?noteId=${noteId}&token=${resetToken}`;

    try {
      const { data, error } = await this.resend.emails.send({
        from: this.options.fromEmail,
        to: [email],
        subject: PasswordResetEmailTemplate.subject,
        html: PasswordResetEmailTemplate.renderHtml({ userName, resetUrl }),
        text: PasswordResetEmailTemplate.renderText({ userName, resetUrl }),
      });

      if (error) {
        console.error('❌ Resend Error:', error);
        throw new Error(`Failed to send email: ${error.message}`);
      }

      return data;
    } catch (error) {
      console.error('❌ Email Service Error:', error);
      throw error;
    }
  }
}

let cachedEmailService: EmailService | null = null;

export function getEmailService(): EmailService {
  if (cachedEmailService) return cachedEmailService;

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error('RESEND_API_KEY is not set in environment variables');
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (!appUrl) {
    throw new Error('NEXT_PUBLIC_APP_URL is not set in environment variables');
  }

  cachedEmailService = new EmailService(new Resend(apiKey), {
    appUrl,
    fromEmail: process.env.RESEND_FROM_EMAIL ?? 'Kairos <onboarding@resend.dev>',
  });
  return cachedEmailService;
}

export async function sendPasswordResetEmail(
  params: PasswordResetEmailParams
): Promise<{ id: string } | null> {
  return getEmailService().sendPasswordResetEmail(params);
}
