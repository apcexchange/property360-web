import { Request, Response, NextFunction } from 'express';
import { AuthService, OtpService, EmailOtpService } from '../services';
import { AuthRequest, ApiResponse } from '../types';

export class AuthController {
  async register(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await AuthService.register(req.body);

      const response: ApiResponse = {
        success: true,
        message: 'Registration successful',
        data: result,
      };

      res.status(201).json(response);
    } catch (error) {
      next(error);
    }
  }

  async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await AuthService.login(req.body);

      const response: ApiResponse = {
        success: true,
        message: 'Login successful',
        data: result,
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  async getProfile(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = await AuthService.getProfile(req.user!._id.toString());

      const response: ApiResponse = {
        success: true,
        message: 'Profile retrieved successfully',
        data: user,
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  async updateProfile(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = await AuthService.updateProfile(req.user!._id.toString(), req.body);

      const response: ApiResponse = {
        success: true,
        message: 'Profile updated successfully',
        data: user,
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  async changePassword(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { currentPassword, newPassword } = req.body;
      await AuthService.changePassword(req.user!._id.toString(), currentPassword, newPassword);

      const response: ApiResponse = {
        success: true,
        message: 'Password changed successfully',
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  async sendOtp(req: Request, res: Response, next: NextFunction): Promise<void> {
    console.log('[SendOTP] Request received:', req.body);
    try {
      const { type, value } = req.body;
      console.log(`[SendOTP] type=${type}, value=${value}`);

      let result;

      if (type === 'email') {
        // Use Resend for email OTP
        console.log('[SendOTP] Using EmailOtpService for email');
        result = await EmailOtpService.sendOtp(value);
      } else {
        // Use Twilio for SMS OTP
        console.log('[SendOTP] Using OtpService (Twilio) for SMS');
        result = await OtpService.sendOtp(value, 'sms');
      }

      console.log('[SendOTP] Success:', result);

      const response: ApiResponse = {
        success: true,
        message: result.message,
        data: {
          message: result.message,
          expiresAt: result.expiresAt,
        },
      };

      res.status(200).json(response);
    } catch (error: any) {
      console.error('[SendOTP] Error:', error.message, error.statusCode || error.status);
      next(error);
    }
  }

  async verifyOtp(req: Request, res: Response, next: NextFunction): Promise<void> {
    console.log('[VerifyOTP] Request received:', req.body);
    try {
      const { type, value, otp } = req.body;
      console.log(`[VerifyOTP] type=${type}, value=${value}, otp=${otp}`);

      let result;

      if (type === 'email') {
        // Use Resend for email OTP verification
        // Don't consume the OTP here - it will be consumed when the action is taken
        // (e.g., password reset, registration completion)
        console.log('[VerifyOTP] Using EmailOtpService for email (peek mode)');
        result = await EmailOtpService.verifyOtp(value, otp, false);
      } else {
        // Use Twilio for SMS OTP verification
        console.log('[VerifyOTP] Using OtpService (Twilio) for SMS');
        result = await OtpService.verifyOtp(value, otp, 'sms');
      }

      console.log('[VerifyOTP] Result:', result);

      const response: ApiResponse = {
        success: true,
        message: result.verified ? 'Verification successful' : 'Invalid verification code',
        data: {
          verified: result.verified,
        },
      };

      res.status(200).json(response);
    } catch (error: any) {
      console.error('[VerifyOTP] Error:', error.message, error.statusCode || error.status);
      next(error);
    }
  }

  async requestPasswordReset(req: Request, res: Response, next: NextFunction): Promise<void> {
    console.log('[PasswordReset] Request received:', req.body);
    try {
      const { email } = req.body;

      // Check if user exists
      const user = await AuthService.findUserByEmail(email);
      if (!user) {
        // Don't reveal if user exists for security
        const response: ApiResponse = {
          success: true,
          message: 'If an account exists with this email, you will receive a verification code.',
          data: { sent: true },
        };
        res.status(200).json(response);
        return;
      }

      // Send OTP to email
      const result = await EmailOtpService.sendOtp(email);
      console.log('[PasswordReset] OTP sent:', result);

      const response: ApiResponse = {
        success: true,
        message: 'Verification code sent to your email',
        data: {
          message: result.message,
          expiresAt: result.expiresAt,
        },
      };

      res.status(200).json(response);
    } catch (error: any) {
      console.error('[PasswordReset] Error:', error.message);
      next(error);
    }
  }

  async confirmPasswordReset(req: Request, res: Response, next: NextFunction): Promise<void> {
    console.log('[PasswordResetConfirm] Request received:', req.body);
    try {
      const { email, otp, newPassword } = req.body;

      // Verify OTP first
      const otpResult = await EmailOtpService.verifyOtp(email, otp);
      if (!otpResult.verified) {
        const response: ApiResponse = {
          success: false,
          message: 'Invalid verification code',
          data: { verified: false },
        };
        res.status(400).json(response);
        return;
      }

      // Reset the password
      await AuthService.resetPassword(email, newPassword);
      console.log('[PasswordResetConfirm] Password reset successful for:', email);

      const response: ApiResponse = {
        success: true,
        message: 'Password reset successful',
        data: { reset: true },
      };

      res.status(200).json(response);
    } catch (error: any) {
      console.error('[PasswordResetConfirm] Error:', error.message);
      next(error);
    }
  }

  async deleteAccount(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    console.log('[DeleteAccount] Request received');
    try {
      const { password } = req.body;
      const userId = req.user!._id.toString();

      await AuthService.deleteAccount(userId, password);
      console.log('[DeleteAccount] Account deleted successfully for user:', userId);

      const response: ApiResponse = {
        success: true,
        message: 'Account deleted successfully',
        data: { deleted: true },
      };

      res.status(200).json(response);
    } catch (error: any) {
      console.error('[DeleteAccount] Error:', error.message);
      next(error);
    }
  }
}

export default new AuthController();
