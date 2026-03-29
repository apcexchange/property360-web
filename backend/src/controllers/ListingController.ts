import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import ListingService from '../services/ListingService';
import { AuthRequest, ApiResponse, UserRole } from '../types';
import { AppError } from '../middleware';
import { PaymentGateway, Unit } from '../models';
import { config } from '../config';
import axios from 'axios';

class ListingController {
  /**
   * Get all active listings (PUBLIC)
   */
  async getListings(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await ListingService.getListings({
        state: req.query.state as string,
        city: req.query.city as string,
        propertyType: req.query.propertyType as string,
        minPrice: req.query.minPrice ? parseInt(req.query.minPrice as string) : undefined,
        maxPrice: req.query.maxPrice ? parseInt(req.query.maxPrice as string) : undefined,
        bedrooms: req.query.bedrooms ? parseInt(req.query.bedrooms as string) : undefined,
        search: req.query.search as string,
        page: req.query.page ? parseInt(req.query.page as string) : 1,
        limit: req.query.limit ? parseInt(req.query.limit as string) : 20,
      });

      const response: ApiResponse = {
        success: true,
        message: 'Listings retrieved',
        data: result.listings,
        meta: result.meta,
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get a single listing (PUBLIC)
   */
  async getListingById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const listing = await ListingService.getListingById(req.params.id as string);

      const response: ApiResponse = {
        success: true,
        message: 'Listing retrieved',
        data: listing,
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  /**
   * List a unit on the marketplace (Landlord)
   */
  async listUnit(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await ListingService.listUnit(
        req.params.unitId as string,
        req.user!._id.toString(),
        {
          listingTitle: req.body.listingTitle,
          listingDescription: req.body.listingDescription,
        }
      );

      const response: ApiResponse = {
        success: true,
        message: 'Unit listed on marketplace',
        data: result,
      };

      res.status(201).json(response);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Remove a unit from marketplace (Landlord)
   */
  async unlistUnit(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await ListingService.unlistUnit(
        req.params.unitId as string,
        req.user!._id.toString()
      );

      const response: ApiResponse = {
        success: true,
        message: result.message,
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update listing details (Landlord)
   */
  async updateListing(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await ListingService.updateListing(
        req.params.unitId as string,
        req.user!._id.toString(),
        {
          listingTitle: req.body.listingTitle,
          listingDescription: req.body.listingDescription,
        }
      );

      const response: ApiResponse = {
        success: true,
        message: result.message,
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get landlord's own listings
   */
  async getLandlordListings(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const listings = await ListingService.getLandlordListings(
        req.user!._id.toString(),
        req.query.status as string
      );

      const response: ApiResponse = {
        success: true,
        message: 'Landlord listings retrieved',
        data: listings,
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Initiate reservation payment (Tenant)
   */
  async initiateReservation(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const unitId = req.params.unitId as string;
      const tenantId = req.user!._id.toString();
      const email = req.user!.email;

      const unit = await Unit.findById(unitId);
      if (!unit) throw new AppError('Unit not found', 404);
      if (!unit.isListed || unit.listingStatus !== 'active') {
        throw new AppError('This unit is no longer available', 400);
      }

      // Payment amount: body.amount or default to rentAmount
      const amount = req.body.amount || unit.rentAmount;

      const reference = `P360-RES-${Date.now().toString(36)}-${crypto.randomBytes(4).toString('hex')}`.toUpperCase();

      const paymentGateway = await PaymentGateway.create({
        reference,
        tenant: tenantId,
        landlord: (unit.property as any).owner || unit.property,
        amount,
        gateway: 'paystack',
        status: 'pending',
        metadata: {
          type: 'reservation',
          unitId,
        },
      });

      const paystackSecretKey = config.paystack?.secretKey || '';
      const paystackResponse = await axios.post<any>(
        'https://api.paystack.co/transaction/initialize',
        {
          email,
          amount: Math.round(amount * 100),
          reference,
          callback_url: req.body.callbackUrl || config.paystack?.callbackUrl,
          metadata: {
            type: 'reservation',
            unitId,
            tenantId,
            paymentGatewayId: paymentGateway._id.toString(),
          },
        },
        {
          headers: {
            Authorization: `Bearer ${paystackSecretKey}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!paystackResponse.data.status) {
        throw new AppError('Failed to initialize payment', 500);
      }

      const response: ApiResponse = {
        success: true,
        message: 'Reservation payment initialized',
        data: {
          authorizationUrl: paystackResponse.data.data.authorization_url,
          reference: paystackResponse.data.data.reference,
          amount,
        },
      };

      res.status(200).json(response);
    } catch (error: any) {
      if (error instanceof AppError) return next(error);
      console.error('Reservation payment error:', error.response?.data || error.message);
      next(new AppError('Failed to initialize reservation payment', 500));
    }
  }

  /**
   * Handle reservation webhook from Paystack
   */
  async handleReservationWebhook(req: Request, res: Response): Promise<void> {
    try {
      const signature = req.headers['x-paystack-signature'] as string;
      if (!signature) {
        res.status(400).json({ success: false, message: 'Missing signature' });
        return;
      }

      const hash = crypto
        .createHmac('sha512', config.paystack?.webhookSecret || config.paystack?.secretKey || '')
        .update(JSON.stringify(req.body))
        .digest('hex');

      if (hash !== signature) {
        res.status(400).json({ success: false, message: 'Invalid signature' });
        return;
      }

      const event = req.body;
      if (event.event === 'charge.success') {
        const reference = event.data.reference;
        const paymentGateway = await PaymentGateway.findOne({ reference });

        if (paymentGateway && paymentGateway.metadata?.type === 'reservation') {
          paymentGateway.status = 'success';
          paymentGateway.paidAt = new Date(event.data.paid_at);
          paymentGateway.gatewayResponse = event.data;
          await paymentGateway.save();

          const unitId = paymentGateway.metadata.unitId as string;
          const tenantId = paymentGateway.tenant.toString();

          await ListingService.reserveUnit(unitId, tenantId, reference);
        }
      }

      res.status(200).json({ received: true });
    } catch (error) {
      console.error('Reservation webhook error:', error);
      res.status(200).json({ received: true });
    }
  }
}

export default new ListingController();
