import { Router } from 'express';
import { AuthController } from '../controllers';
import { protect, validate } from '../middleware';
import {
  registerValidation,
  loginValidation,
  changePasswordValidation,
  updateProfileValidation,
  sendOtpValidation,
  verifyOtpValidation,
  requestPasswordResetValidation,
  confirmPasswordResetValidation,
  deleteAccountValidation,
} from '../validations';

const router = Router();

router.post('/register', validate(registerValidation), AuthController.register);
router.post('/login', validate(loginValidation), AuthController.login);

// OTP routes (public)
router.post('/otp/send', validate(sendOtpValidation), AuthController.sendOtp);
router.post('/otp/verify', validate(verifyOtpValidation), AuthController.verifyOtp);

// Password reset routes (public)
router.post('/password/reset', validate(requestPasswordResetValidation), AuthController.requestPasswordReset);
router.post('/password/reset/confirm', validate(confirmPasswordResetValidation), AuthController.confirmPasswordReset);

// Protected routes
router.get('/profile', protect, AuthController.getProfile);
router.put('/profile', protect, validate(updateProfileValidation), AuthController.updateProfile);
router.put(
  '/change-password',
  protect,
  validate(changePasswordValidation),
  AuthController.changePassword
);

router.delete(
  '/account',
  protect,
  validate(deleteAccountValidation),
  AuthController.deleteAccount
);

export default router;
