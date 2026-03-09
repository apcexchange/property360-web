import twilio from 'twilio';
import { config } from '../config';
import { AppError } from '../middleware';

type OtpChannel = 'sms' | 'email';

interface SendOtpResult {
  success: boolean;
  message: string;
  expiresAt: string;
}

interface VerifyOtpResult {
  verified: boolean;
  token?: string;
}

class OtpService {
  private client: twilio.Twilio;
  private verifyServiceSid: string;
  private phoneNumber: string;

  constructor() {
    if (!config.twilio.accountSid || !config.twilio.authToken) {
      console.warn('Twilio credentials not configured');
    }

    this.client = twilio(config.twilio.accountSid, config.twilio.authToken);
    this.verifyServiceSid = config.twilio.verifyServiceSid;
    this.phoneNumber = config.twilio.phoneNumber;
  }

  /**
   * Send OTP to phone number or email
   */
  async sendOtp(to: string, channel: OtpChannel): Promise<SendOtpResult> {
    try {
      // Format phone number for SMS (must include country code)
      const formattedTo = channel === 'sms' ? this.formatPhoneNumber(to) : to;
      console.log(`Sending OTP to: ${formattedTo} via ${channel}`);

      const verification = await this.client.verify.v2
        .services(this.verifyServiceSid)
        .verifications.create({
          to: formattedTo,
          channel,
        });

      // Calculate expiry (Twilio Verify OTPs expire in 10 minutes by default)
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

      return {
        success: verification.status === 'pending',
        message: `Verification code sent to ${channel === 'sms' ? 'phone' : 'email'}`,
        expiresAt,
      };
    } catch (error: any) {
      console.error('Twilio send OTP error:', {
        message: error.message,
        code: error.code,
        status: error.status,
        moreInfo: error.moreInfo,
      });

      if (error.code === 60200) {
        throw new AppError('Invalid phone number format', 400);
      }
      if (error.code === 60203) {
        throw new AppError('Max send attempts reached. Please try again later.', 429);
      }
      if (error.code === 60205) {
        throw new AppError('SMS is not supported in this region', 400);
      }
      if (error.code === 60082) {
        throw new AppError(
          'Geographic permission not enabled for this region',
          403,
        );
      }
      if (error.status === 403) {
        throw new AppError(
          channel === 'email'
            ? 'Email verification not configured. Check Twilio email integration.'
            : 'SMS not allowed for this number. Check Twilio geo-permissions.',
          403,
        );
      }

      // Log the full error for debugging
      console.error('Full Twilio error:', JSON.stringify(error, null, 2));

      throw new AppError(`Failed to send verification code: ${error.message}`, 500);
    }
  }

  /**
   * Verify OTP code
   */
  async verifyOtp(to: string, code: string, channel: OtpChannel): Promise<VerifyOtpResult> {
    try {
      const formattedTo = channel === 'sms' ? this.formatPhoneNumber(to) : to;

      const verificationCheck = await this.client.verify.v2
        .services(this.verifyServiceSid)
        .verificationChecks.create({
          to: formattedTo,
          code,
        });

      if (verificationCheck.status === 'approved') {
        return {
          verified: true,
        };
      }

      return {
        verified: false,
      };
    } catch (error: any) {
      console.error('Twilio verify OTP error:', error);

      if (error.code === 60200) {
        throw new AppError('Invalid phone number format', 400);
      }
      if (error.code === 20404) {
        throw new AppError('Verification code expired or not found', 400);
      }

      throw new AppError('Failed to verify code', 500);
    }
  }

  /**
   * Send SMS notification (not OTP, just a message)
   */
  async sendSms(to: string, message: string): Promise<{ success: boolean }> {
    if (!this.phoneNumber) {
      console.warn('[OtpService] Twilio phone number not configured, skipping SMS');
      return { success: false };
    }

    try {
      const formattedTo = this.formatPhoneNumber(to);
      console.log(`[OtpService] Sending SMS to: ${formattedTo}`);

      await this.client.messages.create({
        body: message,
        from: this.phoneNumber,
        to: formattedTo,
      });

      console.log(`[OtpService] SMS sent successfully to ${formattedTo}`);
      return { success: true };
    } catch (error: any) {
      console.error('[OtpService] Failed to send SMS:', error.message);
      // Don't throw - SMS failure shouldn't break the flow
      return { success: false };
    }
  }

  /**
   * Send tenant invitation SMS
   */
  async sendTenantInvitationSms(
    phone: string,
    firstName: string,
    tempPassword: string,
    landlordName: string,
    propertyName: string,
    unitNumber: string
  ): Promise<{ success: boolean }> {
    const message = `Hi ${firstName}! ${landlordName} has added you as a tenant at ${propertyName}, Unit ${unitNumber}. Download Property360 to manage your tenancy. Login: Your email, Password: ${tempPassword}. Please change your password after first login.`;

    return this.sendSms(phone, message);
  }

  /**
   * Send payment reminder SMS
   */
  async sendPaymentReminderSms(
    phone: string,
    firstName: string,
    rentAmount: number,
    propertyName: string,
    unitNumber: string
  ): Promise<{ success: boolean }> {
    const formattedAmount = new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 0,
    }).format(rentAmount);

    const message = `Hi ${firstName}, this is a reminder that your rent payment of ${formattedAmount} for ${propertyName} Unit ${unitNumber} is due. Please ensure timely payment. - Property360`;

    return this.sendSms(phone, message);
  }

  /**
   * Format phone number to E.164 format
   * Assumes Nigerian numbers if no country code provided
   */
  private formatPhoneNumber(phone: string): string {
    // Check if already has + prefix before cleaning
    const hasPlus = phone.startsWith('+');

    // Remove all non-digit characters
    let cleaned = phone.replace(/\D/g, '');

    // If starts with 0, assume Nigerian number and replace with +234
    if (cleaned.startsWith('0')) {
      cleaned = '234' + cleaned.substring(1);
    }

    // Add + prefix if not already an international format
    if (!hasPlus && !cleaned.startsWith('234')) {
      // Assume it needs +234 prefix for Nigerian numbers
      cleaned = '234' + cleaned;
    }

    return '+' + cleaned;
  }
}

export default new OtpService();
