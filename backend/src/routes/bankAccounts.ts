import { Router } from 'express';
import BankAccountController from '../controllers/BankAccountController';
import { protect, authorize } from '../middleware';
import { UserRole } from '../types';

const router = Router();

// All routes require authentication and landlord role
router.use(protect);
router.use(authorize(UserRole.LANDLORD));

// GET /bank-accounts/banks - List all Nigerian banks
router.get('/banks', BankAccountController.listBanks);

// POST /bank-accounts/verify - Verify a bank account number
router.post('/verify', BankAccountController.verifyAccount);

// POST /bank-accounts - Add a bank account
router.post('/', BankAccountController.addBankAccount);

// GET /bank-accounts - Get all bank accounts
router.get('/', BankAccountController.getBankAccounts);

// PATCH /bank-accounts/:id/primary - Set as primary account
router.patch('/:id/primary', BankAccountController.setPrimaryAccount);

// DELETE /bank-accounts/:id - Delete a bank account
router.delete('/:id', BankAccountController.deleteBankAccount);

export default router;
