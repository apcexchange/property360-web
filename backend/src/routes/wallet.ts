import { Router } from 'express';
import WalletController from '../controllers/WalletController';
import { protect, authorize } from '../middleware';
import { UserRole } from '../types';

const router = Router();

// All routes require authentication and landlord role
router.use(protect);
router.use(authorize(UserRole.LANDLORD));

// GET /wallet - Get wallet (creates if not exists)
router.get('/', WalletController.getWallet);

// GET /wallet/stats - Get wallet statistics
router.get('/stats', WalletController.getWalletStats);

// GET /wallet/transactions - Get wallet transaction history
router.get('/transactions', WalletController.getTransactions);

// PATCH /wallet/settings - Update wallet settings
router.patch('/settings', WalletController.updateSettings);

export default router;
