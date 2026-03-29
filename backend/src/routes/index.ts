import { Router } from 'express';
import authRoutes from './auth';
import propertyRoutes from './property';
import kycRoutes from './kyc';
import dashboardRoutes from './dashboard';
import tenantRoutes from './tenant';
import tenancyAgreementRoutes from './tenancyAgreement';
import agentRoutes from './agent';
import tenantAppRoutes from './tenantApp';
import invoiceRoutes from './invoice';
import receiptRoutes from './receipt';
import walletRoutes from './wallet';
import bankAccountRoutes from './bankAccounts';
import payoutRoutes from './payouts';
import notificationRoutes from './notifications';
import listingRoutes from './listings';
import chatRoutes from './chat';
import TenancyAgreementController from '../controllers/TenancyAgreementController';
import ListingController from '../controllers/ListingController';
import TenantPaymentController from '../controllers/TenantPaymentController';
import PayoutController from '../controllers/PayoutController';
import reservationRoutes from './reservations';
import ReservationController from '../controllers/ReservationController';

const router = Router();

router.use('/auth', authRoutes);
router.use('/properties', propertyRoutes);
router.use('/kyc', kycRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/tenants', tenantRoutes);
router.use('/tenancy-agreements', tenancyAgreementRoutes);
router.use('/agents', agentRoutes);
router.use('/tenant', tenantAppRoutes); // Tenant app specific routes
router.use('/invoices', invoiceRoutes);
router.use('/receipts', receiptRoutes);
router.use('/wallet', walletRoutes);
router.use('/bank-accounts', bankAccountRoutes);
router.use('/payouts', payoutRoutes);
router.use('/notifications', notificationRoutes);
router.use('/listings', listingRoutes);
router.use('/chat', chatRoutes);
router.use('/reservations', reservationRoutes);

// Webhooks (no authentication required)
router.post('/webhooks/docuseal', TenancyAgreementController.handleWebhook);
router.post('/webhooks/paystack', TenantPaymentController.handlePaystackWebhook);
router.post('/webhooks/paystack/transfer', PayoutController.handleTransferWebhook);
router.post('/webhooks/paystack/reservation', ReservationController.handleReservationWebhook);

export default router;
