import { Response, NextFunction } from 'express';
import {
  Lease,
  Property,
  LandlordAgent,
  SharedBill,
  BillShare,
} from '../models';
import {
  AuthRequestBuilding,
  AuthRequest,
  UserRole,
  AgentInvitationStatus,
} from '../types';
import { AppError } from './errorHandler';

/**
 * Gate a route to users who are part of a building (Property):
 *   - TENANT: must have an active Lease on the property → `buildingViewerRole = 'member'`
 *   - LANDLORD: must own the property → `buildingViewerRole = 'monitor'`
 *   - AGENT: must be assigned to the property via LandlordAgent → `buildingViewerRole = 'monitor'`
 *   - else: 403
 *
 * Routes that mutate state (send chat message, create bill, mark/confirm/dispute
 * shares) must additionally check `req.buildingViewerRole === 'member'` since
 * monitors are read-only.
 */
export const checkTenantBuildingMembership = (propertyIdParam = 'propertyId') => {
  return async (
    req: AuthRequestBuilding,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const user = req.user;
      if (!user) throw new AppError('User not authenticated', 401);

      const propertyId = req.params[propertyIdParam] || req.body?.[propertyIdParam];
      if (!propertyId) throw new AppError('Property ID is required', 400);

      if (user.role === UserRole.TENANT) {
        const lease = await Lease.findOne({
          property: propertyId,
          tenant: user._id,
          status: 'active',
        }).select('unit');

        if (!lease) {
          throw new AppError('You are not a tenant of this building', 403);
        }

        req.buildingViewerRole = 'member';
        req.buildingUnit = lease.unit;
        return next();
      }

      if (user.role === UserRole.LANDLORD) {
        const property = await Property.findOne({
          _id: propertyId,
          owner: user._id,
        }).select('_id');

        if (!property) throw new AppError('Property not found or not yours', 403);
        req.buildingViewerRole = 'monitor';
        return next();
      }

      if (user.role === UserRole.AGENT) {
        const assignment = await LandlordAgent.findOne({
          agent: user._id,
          properties: propertyId,
          status: AgentInvitationStatus.ACCEPTED,
          isActive: true,
        }).select('_id');

        if (!assignment) {
          throw new AppError('You are not assigned to this building', 403);
        }
        req.buildingViewerRole = 'monitor';
        return next();
      }

      throw new AppError('Unauthorized', 403);
    } catch (error) {
      next(error);
    }
  };
};

/**
 * Reject the request unless the caller is the bill creator.
 * Used by routes where only the creator may act: confirm a payment, dispute,
 * cancel a bill.
 */
export const checkBillCreator = (billIdParam = 'billId') => {
  return async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const user = req.user;
      if (!user) throw new AppError('User not authenticated', 401);

      const billId = req.params[billIdParam];
      const bill = await SharedBill.findById(billId).select('creator property');
      if (!bill) throw new AppError('Bill not found', 404);

      if (bill.creator.toString() !== user._id.toString()) {
        throw new AppError('Only the bill creator can perform this action', 403);
      }
      next();
    } catch (error) {
      next(error);
    }
  };
};

/**
 * Reject unless the caller owns the share they're acting on.
 * Used by `mark-paid` — a tenant can only mark their own share as paid.
 */
export const checkOwnShare = (shareIdParam = 'shareId') => {
  return async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const user = req.user;
      if (!user) throw new AppError('User not authenticated', 401);

      const shareId = req.params[shareIdParam];
      const share = await BillShare.findById(shareId).select('tenant bill');
      if (!share) throw new AppError('Share not found', 404);

      if (share.tenant.toString() !== user._id.toString()) {
        throw new AppError('You can only mark your own share as paid', 403);
      }
      next();
    } catch (error) {
      next(error);
    }
  };
};

/**
 * Reject unless the caller is a participant of the bill (creator, share-holder,
 * landlord, or agent). Used by `getDetail` so non-participants can't see other
 * buildings' bills via guessable IDs.
 */
export const checkBillParticipant = (billIdParam = 'billId') => {
  return async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const user = req.user;
      if (!user) throw new AppError('User not authenticated', 401);

      const billId = req.params[billIdParam];
      const bill = await SharedBill.findById(billId).select(
        'creator participantSnapshot property'
      );
      if (!bill) throw new AppError('Bill not found', 404);

      const userId = user._id.toString();
      const isCreator = bill.creator.toString() === userId;
      const isShareHolder = bill.participantSnapshot.some(
        (p: { tenant: { toString(): string } }) => p.tenant.toString() === userId
      );

      if (isCreator || isShareHolder) {
        return next();
      }

      // Landlords + agents can monitor — reuse the building-membership check
      if (user.role === UserRole.LANDLORD) {
        const owns = await Property.findOne({
          _id: bill.property,
          owner: user._id,
        }).select('_id');
        if (owns) return next();
      }

      if (user.role === UserRole.AGENT) {
        const assigned = await LandlordAgent.findOne({
          agent: user._id,
          properties: bill.property,
          status: AgentInvitationStatus.ACCEPTED,
          isActive: true,
        }).select('_id');
        if (assigned) return next();
      }

      throw new AppError('You are not a participant of this bill', 403);
    } catch (error) {
      next(error);
    }
  };
};

export default {
  checkTenantBuildingMembership,
  checkBillCreator,
  checkOwnShare,
  checkBillParticipant,
};
