import sgMail from '@sendgrid/mail';
import { config } from '../config';
import { AppError } from '../middleware';

interface SendEmailOtpResult {
  success: boolean;
  message: string;
  expiresAt: string;
}

interface VerifyEmailOtpResult {
  verified: boolean;
}

// In-memory store for OTPs (use Redis in production)
const otpStore = new Map<string, { code: string; expiresAt: Date }>();

class EmailOtpService {
  private fromEmail: string;
  private fromName: string;

  constructor() {
    sgMail.setApiKey(config.sendgrid?.apiKey || '');
    this.fromEmail = config.sendgrid?.fromEmail || 'noreply@property360.com';
    this.fromName = config.sendgrid?.fromName || 'Property360';
  }

  /**
   * Generate a 6-digit OTP
   */
  private generateOtp(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  /**
   * Send OTP to email
   */
  async sendOtp(email: string): Promise<SendEmailOtpResult> {
    try {
      const otp = this.generateOtp();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

      // Store OTP
      otpStore.set(email.toLowerCase(), { code: otp, expiresAt });

      console.log(`[EmailOTP] Sending OTP ${otp} to ${email}`);

      // Send email via SendGrid
      const msg = {
        to: email,
        from: {
          email: this.fromEmail,
          name: this.fromName,
        },
        subject: 'Your Property360 Verification Code',
        text: `Your verification code is: ${otp}. This code expires in 10 minutes.`,
        html: `
          <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff;">
            <!-- Header -->
            <div style="background: linear-gradient(135deg, #0D2B36 0%, #1a4a5c 100%); padding: 40px 30px; text-align: center; border-radius: 12px 12px 0 0;">
              <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 600;">Property360</h1>
              <p style="color: #8ECAE6; margin: 10px 0 0 0; font-size: 14px;">Property Management Made Simple</p>
            </div>

            <!-- Body -->
            <div style="padding: 40px 30px; background-color: #f8fafc;">
              <h2 style="color: #0D2B36; margin: 0 0 20px 0; font-size: 24px; font-weight: 600;">Verify Your Email</h2>
              <p style="color: #4a5568; font-size: 16px; line-height: 1.6; margin: 0 0 30px 0;">
                Use the verification code below to complete your registration. This code is valid for <strong>10 minutes</strong>.
              </p>

              <!-- OTP Box -->
              <div style="background: linear-gradient(135deg, #E8F5E9 0%, #C8E6C9 100%); padding: 30px; text-align: center; border-radius: 12px; margin: 0 0 30px 0; border: 2px solid #4CAF50;">
                <span style="font-size: 40px; font-weight: 700; letter-spacing: 12px; color: #2E7D32; font-family: 'Courier New', monospace;">${otp}</span>
              </div>

              <p style="color: #718096; font-size: 14px; line-height: 1.6; margin: 0;">
                If you didn't request this code, you can safely ignore this email. Someone may have entered your email address by mistake.
              </p>
            </div>

            <!-- Footer -->
            <div style="background-color: #0D2B36; padding: 30px; text-align: center; border-radius: 0 0 12px 12px;">
              <p style="color: #8ECAE6; font-size: 12px; margin: 0 0 10px 0;">
                © ${new Date().getFullYear()} Property360. All rights reserved.
              </p>
              <p style="color: #6b7280; font-size: 11px; margin: 0;">
                This is an automated message. Please do not reply to this email.
              </p>
            </div>
          </div>
        `,
      };

      await sgMail.send(msg);

      console.log(`[EmailOTP] Email sent successfully to ${email}`);

      return {
        success: true,
        message: 'Verification code sent to email',
        expiresAt: expiresAt.toISOString(),
      };
    } catch (error: any) {
      console.error('[EmailOTP] SendGrid error:', error);

      if (error.response) {
        console.error('[EmailOTP] SendGrid response body:', error.response.body);
      }

      throw new AppError('Failed to send verification email', 500);
    }
  }

  /**
   * Send a general email (for welcome messages, notifications, etc.)
   */
  async sendEmail(
    to: string,
    subject: string,
    htmlContent: string,
    textContent?: string
  ): Promise<void> {
    try {
      const msg = {
        to,
        from: {
          email: this.fromEmail,
          name: this.fromName,
        },
        subject,
        text: textContent || subject,
        html: htmlContent,
      };

      await sgMail.send(msg);
      console.log(`[EmailOTP] Email sent successfully to ${to}`);
    } catch (error: any) {
      console.error('[EmailOTP] SendGrid error:', error);
      throw new AppError('Failed to send email', 500);
    }
  }

  /**
   * Send welcome email to new user
   */
  async sendWelcomeEmail(email: string, firstName: string): Promise<void> {
    const html = `
      <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff;">
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #0D2B36 0%, #1a4a5c 100%); padding: 40px 30px; text-align: center; border-radius: 12px 12px 0 0;">
          <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 600;">Welcome to Property360!</h1>
        </div>

        <!-- Body -->
        <div style="padding: 40px 30px; background-color: #f8fafc;">
          <h2 style="color: #0D2B36; margin: 0 0 20px 0; font-size: 24px; font-weight: 600;">Hello, ${firstName}! 👋</h2>
          <p style="color: #4a5568; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
            Thank you for joining Property360. We're excited to have you on board!
          </p>
          <p style="color: #4a5568; font-size: 16px; line-height: 1.6; margin: 0 0 30px 0;">
            With Property360, you can easily manage your properties, track rent payments, handle tenant agreements, and much more.
          </p>

          <div style="background-color: #E8F5E9; padding: 20px; border-radius: 8px; border-left: 4px solid #4CAF50;">
            <p style="color: #2E7D32; font-size: 14px; margin: 0; font-weight: 500;">
              Get started by adding your first property to begin managing your real estate portfolio.
            </p>
          </div>
        </div>

        <!-- Footer -->
        <div style="background-color: #0D2B36; padding: 30px; text-align: center; border-radius: 0 0 12px 12px;">
          <p style="color: #8ECAE6; font-size: 12px; margin: 0 0 10px 0;">
            © ${new Date().getFullYear()} Property360. All rights reserved.
          </p>
        </div>
      </div>
    `;

    await this.sendEmail(email, 'Welcome to Property360!', html);
  }

  /**
   * Verify OTP code
   * @param email - The email address
   * @param code - The OTP code to verify
   * @param consume - Whether to consume (delete) the OTP after verification (default: true)
   */
  async verifyOtp(email: string, code: string, consume: boolean = true): Promise<VerifyEmailOtpResult> {
    const stored = otpStore.get(email.toLowerCase());

    if (!stored) {
      console.log(`[EmailOTP] No OTP found for ${email}`);
      return { verified: false };
    }

    if (new Date() > stored.expiresAt) {
      console.log(`[EmailOTP] OTP expired for ${email}`);
      otpStore.delete(email.toLowerCase());
      throw new AppError('Verification code has expired', 400);
    }

    if (stored.code !== code) {
      console.log(`[EmailOTP] Invalid OTP for ${email}: expected ${stored.code}, got ${code}`);
      return { verified: false };
    }

    // OTP verified, optionally remove from store
    if (consume) {
      otpStore.delete(email.toLowerCase());
      console.log(`[EmailOTP] OTP verified and consumed for ${email}`);
    } else {
      console.log(`[EmailOTP] OTP verified (not consumed) for ${email}`);
    }

    return { verified: true };
  }
}

export default new EmailOtpService();
