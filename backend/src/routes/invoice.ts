import { Router } from 'express';
import InvoiceController from '../controllers/InvoiceController';
import { protect, authorize, validate } from '../middleware';
import { checkAgentPermission } from '../middleware/agentPermission';
import { UserRole } from '../types';
import {
  createInvoiceValidation,
  updateInvoiceValidation,
  invoiceIdValidation,
  markPaidValidation,
  getInvoicesValidation,
} from '../validations/invoice';

const router = Router();

// All routes require authentication
router.use(protect);

// Get invoice statistics (must be before /:invoiceId to avoid conflict)
router.get(
  '/stats',
  authorize(UserRole.LANDLORD, UserRole.AGENT),
  InvoiceController.getInvoiceStats
);

// Get all invoices for landlord (with filters)
router.get(
  '/',
  authorize(UserRole.LANDLORD, UserRole.AGENT),
  validate(getInvoicesValidation),
  InvoiceController.getInvoices
);

// Get single invoice
router.get(
  '/:invoiceId',
  authorize(UserRole.LANDLORD, UserRole.AGENT),
  validate(invoiceIdValidation),
  InvoiceController.getInvoiceById
);

// Create new invoice
router.post(
  '/',
  authorize(UserRole.LANDLORD, UserRole.AGENT),
  validate(createInvoiceValidation),
  checkAgentPermission('canRecordPayment'),
  InvoiceController.createInvoice
);

// Update draft invoice
router.put(
  '/:invoiceId',
  authorize(UserRole.LANDLORD, UserRole.AGENT),
  validate([...invoiceIdValidation, ...updateInvoiceValidation]),
  InvoiceController.updateInvoice
);

// Send invoice (change status from draft to sent)
router.post(
  '/:invoiceId/send',
  authorize(UserRole.LANDLORD, UserRole.AGENT),
  validate(invoiceIdValidation),
  InvoiceController.sendInvoice
);

// Mark invoice as paid
router.post(
  '/:invoiceId/paid',
  authorize(UserRole.LANDLORD, UserRole.AGENT),
  validate([...invoiceIdValidation, ...markPaidValidation]),
  InvoiceController.markAsPaid
);

// Cancel invoice
router.post(
  '/:invoiceId/cancel',
  authorize(UserRole.LANDLORD, UserRole.AGENT),
  validate(invoiceIdValidation),
  InvoiceController.cancelInvoice
);

// Email invoice PDF to tenant
router.post(
  '/:invoiceId/email',
  authorize(UserRole.LANDLORD, UserRole.AGENT),
  validate(invoiceIdValidation),
  InvoiceController.emailInvoice
);

// Delete draft invoice
router.delete(
  '/:invoiceId',
  authorize(UserRole.LANDLORD, UserRole.AGENT),
  validate(invoiceIdValidation),
  InvoiceController.deleteInvoice
);

export default router;
