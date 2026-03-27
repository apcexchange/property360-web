import { Response, NextFunction } from 'express';
import { LandlordAgent, Property, Unit } from '../models';
import {
  AuthRequestWithLandlord,
  UserRole,
  IAgentPermissions,
  AgentInvitationStatus,
} from '../types';
import { AppError } from './errorHandler';

/**
 * Middleware to check if an agent has a specific permission for a property.
 * - Landlords always have full access to their own properties
 * - Agents must have the specific permission granted by the landlord
 *
 * This middleware:
 * 1. Extracts propertyId from request (params, body, or derived from unitId)
 * 2. For landlords: verifies property ownership
 * 3. For agents: checks they have the required permission for this property
 * 4. Attaches landlordId to request for service layer use
 */
export const checkAgentPermission = (permission: keyof IAgentPermissions) => {
  return async (
    req: AuthRequestWithLandlord,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const user = req.user;

      if (!user) {
        throw new AppError('User not authenticated', 401);
      }

      // Get propertyId from various sources
      let propertyId: string | undefined =
        req.params.propertyId || req.body?.propertyId;

      // If we have a unitId, derive the propertyId from it
      if (!propertyId && (req.params.unitId || req.body?.unitId)) {
        const unitId = req.params.unitId || req.body?.unitId;
        const unit = await Unit.findById(unitId).select('property');
        if (!unit) {
          throw new AppError('Unit not found', 404);
        }
        propertyId = unit.property.toString();
      }

      // If we have a leaseId, we need to get the property from it
      if (!propertyId && req.params.leaseId) {
        const { Lease } = await import('../models');
        const lease = await Lease.findById(req.params.leaseId).select('property landlord');
        if (!lease) {
          throw new AppError('Lease not found', 404);
        }
        propertyId = lease.property.toString();

        // For landlord, verify they own this lease
        if (user.role === UserRole.LANDLORD) {
          if (lease.landlord.toString() !== user._id.toString()) {
            throw new AppError('You do not have permission to access this lease', 403);
          }
          req.landlordId = user._id;
          return next();
        }
      }

      if (!propertyId) {
        throw new AppError('Property ID is required', 400);
      }

      // Landlords always have full access to their own properties
      if (user.role === UserRole.LANDLORD) {
        const property = await Property.findOne({
          _id: propertyId,
          owner: user._id,
        });

        if (!property) {
          throw new AppError(
            'Property not found or you do not have permission',
            403
          );
        }

        // Landlord owns this property, set landlordId and proceed
        req.landlordId = user._id;
        return next();
      }

      // For agents, check their permission for this property
      if (user.role === UserRole.AGENT) {
        const agentAssignment = await LandlordAgent.findOne({
          agent: user._id,
          properties: propertyId,
          status: AgentInvitationStatus.ACCEPTED,
          isActive: true,
        });

        if (!agentAssignment) {
          throw new AppError(
            'You are not assigned to manage this property',
            403
          );
        }

        if (!agentAssignment.permissions[permission]) {
          throw new AppError(
            `You do not have permission to ${formatPermissionName(permission)}`,
            403
          );
        }

        // Attach landlordId to request for service layer
        req.landlordId = agentAssignment.landlord;
        return next();
      }

      // If we get here, the user role is not allowed
      throw new AppError('Unauthorized', 403);
    } catch (error) {
      next(error);
    }
  };
};

/**
 * Helper to format permission name for error messages
 */
function formatPermissionName(permission: keyof IAgentPermissions): string {
  const mapping: Record<keyof IAgentPermissions, string> = {
    canAddTenant: 'add tenants',
    canRemoveTenant: 'remove tenants',
    canRecordPayment: 'record payments',
    canViewPayments: 'view payments',
    canRenewLease: 'renew leases',
    canManageMaintenance: 'manage maintenance requests',
    canViewReports: 'view reports',
    canUploadAgreements: 'upload agreements',
  };
  return mapping[permission] || permission;
}

/**
 * Middleware to check if an agent has access to a specific landlord's data.
 * Used for routes that work with landlord-specific data without property context.
 */
export const checkAgentAccessToLandlord = async (
  req: AuthRequestWithLandlord,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const user = req.user;

    if (!user) {
      throw new AppError('User not authenticated', 401);
    }

    // Landlords only access their own data
    if (user.role === UserRole.LANDLORD) {
      req.landlordId = user._id;
      return next();
    }

    // Agents need a landlordId parameter or we use their first active assignment
    if (user.role === UserRole.AGENT) {
      const landlordId = req.params.landlordId || req.query.landlordId;

      if (landlordId) {
        // Verify the agent is assigned to this landlord
        const assignment = await LandlordAgent.findOne({
          agent: user._id,
          landlord: landlordId,
          status: AgentInvitationStatus.ACCEPTED,
          isActive: true,
        });

        if (!assignment) {
          throw new AppError(
            'You are not authorized to access this landlord\'s data',
            403
          );
        }

        req.landlordId = assignment.landlord;
        return next();
      }

      // No specific landlord requested, this endpoint might not make sense for agents
      throw new AppError(
        'Landlord ID is required for agent access',
        400
      );
    }

    throw new AppError('Unauthorized', 403);
  } catch (error) {
    next(error);
  }
};

export default { checkAgentPermission, checkAgentAccessToLandlord };
