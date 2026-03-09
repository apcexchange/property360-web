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
   * Send tenant invitation email with login credentials
   */
  async sendTenantInvitation(
    email: string,
    firstName: string,
    tempPassword: string,
    landlordName: string,
    propertyName: string,
    unitNumber: string
  ): Promise<void> {
    const html = `
      <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff;">
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #0D2B36 0%, #1a4a5c 100%); padding: 40px 30px; text-align: center; border-radius: 12px 12px 0 0;">
          <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 600;">Welcome to Property360!</h1>
          <p style="color: #8ECAE6; margin: 10px 0 0 0; font-size: 14px;">You've been added as a tenant</p>
        </div>

        <!-- Body -->
        <div style="padding: 40px 30px; background-color: #f8fafc;">
          <h2 style="color: #0D2B36; margin: 0 0 20px 0; font-size: 24px; font-weight: 600;">Hello, ${firstName}!</h2>
          <p style="color: #4a5568; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
            <strong>${landlordName}</strong> has added you as a tenant for:
          </p>

          <!-- Property Info Box -->
          <div style="background-color: #E8F5E9; padding: 20px; border-radius: 8px; border-left: 4px solid #4CAF50; margin: 0 0 30px 0;">
            <p style="color: #2E7D32; font-size: 16px; margin: 0; font-weight: 600;">
              ${propertyName}
            </p>
            <p style="color: #4a5568; font-size: 14px; margin: 8px 0 0 0;">
              Unit: ${unitNumber}
            </p>
          </div>

          <p style="color: #4a5568; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
            An account has been created for you. Use the credentials below to log in:
          </p>

          <!-- Credentials Box -->
          <div style="background-color: #f1f5f9; padding: 20px; border-radius: 8px; margin: 0 0 30px 0;">
            <p style="color: #0D2B36; font-size: 14px; margin: 0 0 10px 0;">
              <strong>Email:</strong> ${email}
            </p>
            <p style="color: #0D2B36; font-size: 14px; margin: 0;">
              <strong>Temporary Password:</strong> <code style="background-color: #e2e8f0; padding: 4px 8px; border-radius: 4px; font-family: monospace;">${tempPassword}</code>
            </p>
          </div>

          <div style="background-color: #FFF3E0; padding: 16px; border-radius: 8px; border-left: 4px solid #FF9800; margin: 0 0 20px 0;">
            <p style="color: #E65100; font-size: 14px; margin: 0; font-weight: 500;">
              Please change your password after your first login for security.
            </p>
          </div>

          <p style="color: #4a5568; font-size: 16px; line-height: 1.6; margin: 0;">
            Download the Property360 app to manage your tenancy, view lease details, and make rent payments.
          </p>
        </div>

        <!-- Footer -->
        <div style="background-color: #0D2B36; padding: 30px; text-align: center; border-radius: 0 0 12px 12px;">
          <p style="color: #8ECAE6; font-size: 12px; margin: 0 0 10px 0;">
            &copy; ${new Date().getFullYear()} Property360. All rights reserved.
          </p>
          <p style="color: #6b7280; font-size: 11px; margin: 0;">
            This is an automated message. Please do not reply to this email.
          </p>
        </div>
      </div>
    `;

    const textContent = `Hello ${firstName}!

${landlordName} has added you as a tenant for ${propertyName}, Unit ${unitNumber}.

An account has been created for you. Use these credentials to log in:
- Email: ${email}
- Temporary Password: ${tempPassword}

Please change your password after your first login for security.

Download the Property360 app to manage your tenancy, view lease details, and make rent payments.

Property360`;

    await this.sendEmail(
      email,
      `You've been added as a tenant - ${propertyName}`,
      html,
      textContent
    );
  }

  /**
   * Send notification to landlord when tenant deletes their account
   */
  async sendTenantDeletedNotification(
    landlordEmail: string,
    landlordFirstName: string,
    tenantName: string,
    propertyName: string,
    unitNumber: string
  ): Promise<void> {
    const html = `
      <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff;">
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #0D2B36 0%, #1a4a5c 100%); padding: 40px 30px; text-align: center; border-radius: 12px 12px 0 0;">
          <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 600;">Property360</h1>
          <p style="color: #8ECAE6; margin: 10px 0 0 0; font-size: 14px;">Tenant Account Update</p>
        </div>

        <!-- Body -->
        <div style="padding: 40px 30px; background-color: #f8fafc;">
          <h2 style="color: #0D2B36; margin: 0 0 20px 0; font-size: 24px; font-weight: 600;">Hello, ${landlordFirstName}</h2>

          <p style="color: #4a5568; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
            We wanted to inform you that your tenant has deleted their account.
          </p>

          <!-- Tenant Info Box -->
          <div style="background-color: #FFF3E0; padding: 20px; border-radius: 8px; border-left: 4px solid #FF9800; margin: 0 0 30px 0;">
            <p style="color: #E65100; font-size: 16px; margin: 0 0 10px 0; font-weight: 600;">
              Tenant: ${tenantName}
            </p>
            <p style="color: #4a5568; font-size: 14px; margin: 0;">
              Property: ${propertyName} - Unit ${unitNumber}
            </p>
          </div>

          <p style="color: #4a5568; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
            <strong>What this means:</strong>
          </p>

          <ul style="color: #4a5568; font-size: 14px; line-height: 1.8; margin: 0 0 30px 0; padding-left: 20px;">
            <li>The lease for this unit has been terminated</li>
            <li>The unit is now marked as vacant</li>
            <li>Historical records (payments, lease details) are preserved for your reference</li>
            <li>You can now assign a new tenant to this unit</li>
          </ul>

          <p style="color: #4a5568; font-size: 16px; line-height: 1.6; margin: 0;">
            Log in to your Property360 app to view details or assign a new tenant.
          </p>
        </div>

        <!-- Footer -->
        <div style="background-color: #0D2B36; padding: 30px; text-align: center; border-radius: 0 0 12px 12px;">
          <p style="color: #8ECAE6; font-size: 12px; margin: 0 0 10px 0;">
            &copy; ${new Date().getFullYear()} Property360. All rights reserved.
          </p>
          <p style="color: #6b7280; font-size: 11px; margin: 0;">
            This is an automated message. Please do not reply to this email.
          </p>
        </div>
      </div>
    `;

    const textContent = `Hello ${landlordFirstName},

We wanted to inform you that your tenant has deleted their account.

Tenant: ${tenantName}
Property: ${propertyName} - Unit ${unitNumber}

What this means:
- The lease for this unit has been terminated
- The unit is now marked as vacant
- Historical records (payments, lease details) are preserved for your reference
- You can now assign a new tenant to this unit

Log in to your Property360 app to view details or assign a new tenant.

Property360`;

    await this.sendEmail(
      landlordEmail,
      `Tenant Account Deleted - ${propertyName} Unit ${unitNumber}`,
      html,
      textContent
    );
  }

  /**
   * Send payment reminder to tenant
   */
  async sendPaymentReminder(
    email: string,
    firstName: string,
    rentAmount: number,
    landlordName: string,
    propertyName: string,
    unitNumber: string
  ): Promise<void> {
    const formattedAmount = new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 0,
    }).format(rentAmount);

    const html = `
      <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff;">
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #0D2B36 0%, #1a4a5c 100%); padding: 40px 30px; text-align: center; border-radius: 12px 12px 0 0;">
          <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 600;">Property360</h1>
          <p style="color: #8ECAE6; margin: 10px 0 0 0; font-size: 14px;">Payment Reminder</p>
        </div>

        <!-- Body -->
        <div style="padding: 40px 30px; background-color: #f8fafc;">
          <h2 style="color: #0D2B36; margin: 0 0 20px 0; font-size: 24px; font-weight: 600;">Hello, ${firstName}!</h2>

          <p style="color: #4a5568; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
            This is a friendly reminder from <strong>${landlordName}</strong> that your rent payment is due.
          </p>

          <!-- Payment Info Box -->
          <div style="background-color: #FFF3E0; padding: 25px; border-radius: 12px; border-left: 4px solid #FF9800; margin: 0 0 30px 0;">
            <p style="color: #4a5568; font-size: 14px; margin: 0 0 8px 0;">Property</p>
            <p style="color: #0D2B36; font-size: 18px; font-weight: 600; margin: 0 0 15px 0;">
              ${propertyName} - Unit ${unitNumber}
            </p>
            <p style="color: #4a5568; font-size: 14px; margin: 0 0 8px 0;">Amount Due</p>
            <p style="color: #E65100; font-size: 28px; font-weight: 700; margin: 0;">
              ${formattedAmount}
            </p>
          </div>

          <p style="color: #4a5568; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
            Please ensure your payment is made on time to avoid any late fees or penalties.
          </p>

          <p style="color: #4a5568; font-size: 16px; line-height: 1.6; margin: 0;">
            If you have already made this payment, please disregard this reminder. For any questions, please contact your landlord.
          </p>
        </div>

        <!-- Footer -->
        <div style="background-color: #0D2B36; padding: 30px; text-align: center; border-radius: 0 0 12px 12px;">
          <p style="color: #8ECAE6; font-size: 12px; margin: 0 0 10px 0;">
            &copy; ${new Date().getFullYear()} Property360. All rights reserved.
          </p>
          <p style="color: #6b7280; font-size: 11px; margin: 0;">
            This is an automated message. Please do not reply to this email.
          </p>
        </div>
      </div>
    `;

    const textContent = `Hello ${firstName},

This is a friendly reminder from ${landlordName} that your rent payment is due.

Property: ${propertyName} - Unit ${unitNumber}
Amount Due: ${formattedAmount}

Please ensure your payment is made on time to avoid any late fees or penalties.

If you have already made this payment, please disregard this reminder.

Property360`;

    await this.sendEmail(
      email,
      `Payment Reminder - ${propertyName} Unit ${unitNumber}`,
      html,
      textContent
    );
  }

  /**
   * Send agent invitation email
   */
  async sendAgentInvitation(
    email: string,
    firstName: string,
    landlordName: string,
    propertyNames: string[]
  ): Promise<void> {
    const propertiesList = propertyNames.map((p) => `<li>${p}</li>`).join('');

    const html = `
      <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff;">
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #0D2B36 0%, #1a4a5c 100%); padding: 40px 30px; text-align: center; border-radius: 12px 12px 0 0;">
          <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 600;">Property360</h1>
          <p style="color: #8ECAE6; margin: 10px 0 0 0; font-size: 14px;">Agent Invitation</p>
        </div>

        <!-- Body -->
        <div style="padding: 40px 30px; background-color: #f8fafc;">
          <h2 style="color: #0D2B36; margin: 0 0 20px 0; font-size: 24px; font-weight: 600;">Hello, ${firstName}!</h2>

          <p style="color: #4a5568; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
            <strong>${landlordName}</strong> has invited you to manage the following properties:
          </p>

          <!-- Properties List -->
          <div style="background-color: #E8F5E9; padding: 20px; border-radius: 8px; border-left: 4px solid #4CAF50; margin: 0 0 30px 0;">
            <ul style="color: #2E7D32; font-size: 14px; margin: 0; padding-left: 20px;">
              ${propertiesList}
            </ul>
          </div>

          <p style="color: #4a5568; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
            Log in to your Property360 app to accept or decline this invitation. Once accepted, you'll be able to manage these properties based on the permissions granted to you.
          </p>

          <div style="background-color: #f1f5f9; padding: 16px; border-radius: 8px; margin: 0 0 20px 0;">
            <p style="color: #4a5568; font-size: 14px; margin: 0;">
              <strong>Note:</strong> This invitation will remain pending until you take action.
            </p>
          </div>
        </div>

        <!-- Footer -->
        <div style="background-color: #0D2B36; padding: 30px; text-align: center; border-radius: 0 0 12px 12px;">
          <p style="color: #8ECAE6; font-size: 12px; margin: 0 0 10px 0;">
            &copy; ${new Date().getFullYear()} Property360. All rights reserved.
          </p>
          <p style="color: #6b7280; font-size: 11px; margin: 0;">
            This is an automated message. Please do not reply to this email.
          </p>
        </div>
      </div>
    `;

    const textContent = `Hello ${firstName},

${landlordName} has invited you to manage the following properties:
${propertyNames.map((p) => `- ${p}`).join('\n')}

Log in to your Property360 app to accept or decline this invitation.

Property360`;

    await this.sendEmail(
      email,
      `Property Management Invitation from ${landlordName}`,
      html,
      textContent
    );
  }

  /**
   * Send notification when agent accepts invitation
   */
  async sendAgentInvitationAccepted(
    landlordEmail: string,
    landlordFirstName: string,
    agentName: string
  ): Promise<void> {
    const html = `
      <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff;">
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #0D2B36 0%, #1a4a5c 100%); padding: 40px 30px; text-align: center; border-radius: 12px 12px 0 0;">
          <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 600;">Property360</h1>
          <p style="color: #8ECAE6; margin: 10px 0 0 0; font-size: 14px;">Agent Update</p>
        </div>

        <!-- Body -->
        <div style="padding: 40px 30px; background-color: #f8fafc;">
          <h2 style="color: #0D2B36; margin: 0 0 20px 0; font-size: 24px; font-weight: 600;">Hello, ${landlordFirstName}!</h2>

          <div style="background-color: #E8F5E9; padding: 25px; border-radius: 12px; border-left: 4px solid #4CAF50; margin: 0 0 30px 0;">
            <p style="color: #2E7D32; font-size: 18px; margin: 0; font-weight: 600;">
              ✓ ${agentName} has accepted your invitation!
            </p>
          </div>

          <p style="color: #4a5568; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
            They can now manage your properties based on the permissions you've granted. You can update their permissions or assigned properties at any time from your dashboard.
          </p>
        </div>

        <!-- Footer -->
        <div style="background-color: #0D2B36; padding: 30px; text-align: center; border-radius: 0 0 12px 12px;">
          <p style="color: #8ECAE6; font-size: 12px; margin: 0 0 10px 0;">
            &copy; ${new Date().getFullYear()} Property360. All rights reserved.
          </p>
        </div>
      </div>
    `;

    await this.sendEmail(
      landlordEmail,
      `${agentName} accepted your agent invitation`,
      html
    );
  }

  /**
   * Send notification when agent status changes
   */
  async sendAgentStatusChange(
    agentEmail: string,
    agentFirstName: string,
    landlordName: string,
    isActive: boolean
  ): Promise<void> {
    const statusText = isActive ? 'reactivated' : 'deactivated';
    const statusColor = isActive ? '#4CAF50' : '#FF9800';
    const bgColor = isActive ? '#E8F5E9' : '#FFF3E0';

    const html = `
      <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff;">
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #0D2B36 0%, #1a4a5c 100%); padding: 40px 30px; text-align: center; border-radius: 12px 12px 0 0;">
          <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 600;">Property360</h1>
          <p style="color: #8ECAE6; margin: 10px 0 0 0; font-size: 14px;">Agent Status Update</p>
        </div>

        <!-- Body -->
        <div style="padding: 40px 30px; background-color: #f8fafc;">
          <h2 style="color: #0D2B36; margin: 0 0 20px 0; font-size: 24px; font-weight: 600;">Hello, ${agentFirstName}!</h2>

          <div style="background-color: ${bgColor}; padding: 25px; border-radius: 12px; border-left: 4px solid ${statusColor}; margin: 0 0 30px 0;">
            <p style="color: ${statusColor}; font-size: 16px; margin: 0; font-weight: 600;">
              Your agent access has been ${statusText} by ${landlordName}.
            </p>
          </div>

          <p style="color: #4a5568; font-size: 16px; line-height: 1.6; margin: 0;">
            ${
              isActive
                ? 'You can now continue managing the properties assigned to you.'
                : 'You will not be able to perform any actions on their properties until your access is reactivated.'
            }
          </p>
        </div>

        <!-- Footer -->
        <div style="background-color: #0D2B36; padding: 30px; text-align: center; border-radius: 0 0 12px 12px;">
          <p style="color: #8ECAE6; font-size: 12px; margin: 0 0 10px 0;">
            &copy; ${new Date().getFullYear()} Property360. All rights reserved.
          </p>
        </div>
      </div>
    `;

    await this.sendEmail(
      agentEmail,
      `Agent Access ${isActive ? 'Reactivated' : 'Deactivated'} - ${landlordName}`,
      html
    );
  }

  /**
   * Send invoice email with PDF attachment
   */
  async sendInvoiceEmail(
    email: string,
    tenantFirstName: string,
    invoiceNumber: string,
    propertyName: string,
    unitNumber: string | undefined,
    total: number,
    dueDate: Date,
    pdfBuffer: Buffer
  ): Promise<void> {
    const formattedTotal = new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 2,
    }).format(total);

    const formattedDueDate = new Date(dueDate).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });

    const html = `
      <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff;">
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #0D2B36 0%, #1a4a5c 100%); padding: 40px 30px; text-align: center; border-radius: 12px 12px 0 0;">
          <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 600;">Property360</h1>
          <p style="color: #8ECAE6; margin: 10px 0 0 0; font-size: 14px;">Invoice</p>
        </div>

        <!-- Body -->
        <div style="padding: 40px 30px; background-color: #f8fafc;">
          <h2 style="color: #0D2B36; margin: 0 0 20px 0; font-size: 24px; font-weight: 600;">Hello, ${tenantFirstName}!</h2>

          <p style="color: #4a5568; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
            Please find attached your invoice for the following:
          </p>

          <!-- Invoice Info Box -->
          <div style="background-color: #f1f5f9; padding: 25px; border-radius: 12px; margin: 0 0 30px 0;">
            <p style="color: #6B7280; font-size: 12px; margin: 0 0 4px 0; text-transform: uppercase; letter-spacing: 0.5px;">Invoice Number</p>
            <p style="color: #0D2B36; font-size: 18px; font-weight: 700; margin: 0 0 16px 0;">${invoiceNumber}</p>

            <p style="color: #6B7280; font-size: 12px; margin: 0 0 4px 0; text-transform: uppercase; letter-spacing: 0.5px;">Property</p>
            <p style="color: #0D2B36; font-size: 16px; font-weight: 600; margin: 0 0 16px 0;">
              ${propertyName}${unitNumber ? ` - Unit ${unitNumber}` : ''}
            </p>

            <div style="display: flex; justify-content: space-between;">
              <div>
                <p style="color: #6B7280; font-size: 12px; margin: 0 0 4px 0; text-transform: uppercase; letter-spacing: 0.5px;">Amount Due</p>
                <p style="color: #0D2B36; font-size: 24px; font-weight: 700; margin: 0;">${formattedTotal}</p>
              </div>
              <div style="text-align: right;">
                <p style="color: #6B7280; font-size: 12px; margin: 0 0 4px 0; text-transform: uppercase; letter-spacing: 0.5px;">Due Date</p>
                <p style="color: #EF4444; font-size: 16px; font-weight: 600; margin: 0;">${formattedDueDate}</p>
              </div>
            </div>
          </div>

          <p style="color: #4a5568; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
            The PDF invoice is attached to this email. Please ensure timely payment to avoid any late fees.
          </p>

          <p style="color: #4a5568; font-size: 14px; line-height: 1.6; margin: 0;">
            If you have any questions about this invoice, please contact your landlord or property manager.
          </p>
        </div>

        <!-- Footer -->
        <div style="background-color: #0D2B36; padding: 30px; text-align: center; border-radius: 0 0 12px 12px;">
          <p style="color: #8ECAE6; font-size: 12px; margin: 0 0 10px 0;">
            &copy; ${new Date().getFullYear()} Property360. All rights reserved.
          </p>
          <p style="color: #6b7280; font-size: 11px; margin: 0;">
            This is an automated message. Please do not reply to this email.
          </p>
        </div>
      </div>
    `;

    const textContent = `Hello ${tenantFirstName},

Please find attached your invoice (${invoiceNumber}) for ${propertyName}${unitNumber ? ` - Unit ${unitNumber}` : ''}.

Amount Due: ${formattedTotal}
Due Date: ${formattedDueDate}

Please ensure timely payment to avoid any late fees.

Property360`;

    try {
      const msg = {
        to: email,
        from: {
          email: this.fromEmail,
          name: this.fromName,
        },
        subject: `Invoice ${invoiceNumber} - ${propertyName}`,
        text: textContent,
        html,
        attachments: [
          {
            content: pdfBuffer.toString('base64'),
            filename: `${invoiceNumber}.pdf`,
            type: 'application/pdf',
            disposition: 'attachment',
          },
        ],
      };

      await sgMail.send(msg);
      console.log(`[EmailOTP] Invoice email sent successfully to ${email}`);
    } catch (error: any) {
      console.error('[EmailOTP] SendGrid error:', error);
      throw new AppError('Failed to send invoice email', 500);
    }
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
