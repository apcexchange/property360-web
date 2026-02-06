import { Request, Response, NextFunction } from 'express';
import { AuthService, OtpService } from '../services';
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

      // Map 'phone' to 'sms' for Twilio channel
      const channel = type === 'phone' ? 'sms' : 'email';
      console.log(`[SendOTP] Calling OtpService.sendOtp with channel=${channel}`);

      const result = await OtpService.sendOtp(value, channel);
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

      // Map 'phone' to 'sms' for Twilio channel
      const channel = type === 'phone' ? 'sms' : 'email';
      console.log(`[VerifyOTP] Calling OtpService.verifyOtp with channel=${channel}`);

      const result = await OtpService.verifyOtp(value, otp, channel);
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
}

export default new AuthController();
