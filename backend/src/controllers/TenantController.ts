import { Response, NextFunction } from 'express';
import { TenantService } from '../services';
import { AuthRequestWithLandlord, ApiResponse } from '../types';

export class TenantController {
  async assignTenant(req: AuthRequestWithLandlord, res: Response, next: NextFunction): Promise<void> {
    try {
      // For agents, landlordId comes from middleware; for landlords, use their own ID
      const landlordId = req.landlordId?.toString() || req.user!._id.toString();
      const assignedById = req.user!._id.toString(); // Always the current user

      const result = await TenantService.assignTenantToUnit({
        unitId: req.params.unitId as string,
        landlordId,
        assignedById,
        tenantEmail: req.body.email,
        tenantPhone: req.body.phone,
        tenantFirstName: req.body.firstName,
        tenantLastName: req.body.lastName,
        leaseStartDate: new Date(req.body.leaseStartDate),
        leaseEndDate: new Date(req.body.leaseEndDate),
        rentAmount: req.body.rentAmount,
        paymentFrequency: req.body.paymentFrequency,
        // One-time fees
        securityDeposit: req.body.securityDeposit,
        cautionFee: req.body.cautionFee,
        agentFee: req.body.agentFee,
        agreementFee: req.body.agreementFee,
        legalFee: req.body.legalFee,
        serviceCharge: req.body.serviceCharge,
        otherFee: req.body.otherFee,
        otherFeeDescription: req.body.otherFeeDescription,
      });

      // Transform response to include 'id' field for mobile compatibility
      const response: ApiResponse = {
        success: true,
        message: 'Tenant assigned successfully',
        data: {
          tenant: {
            id: result.tenant._id.toString(),
            email: result.tenant.email,
            firstName: result.tenant.firstName,
            lastName: result.tenant.lastName,
            phone: result.tenant.phone,
            role: result.tenant.role,
          },
          lease: {
            id: result.lease._id.toString(),
            startDate: result.lease.startDate,
            endDate: result.lease.endDate,
            rentAmount: result.lease.rentAmount,
            paymentFrequency: result.lease.paymentFrequency,
            status: result.lease.status,
          },
          unit: result.unit,
        },
      };

      res.status(201).json(response);
    } catch (error) {
      next(error);
    }
  }

  async removeTenant(req: AuthRequestWithLandlord, res: Response, next: NextFunction): Promise<void> {
    try {
      await TenantService.removeTenantFromUnit(
        req.params.unitId as string,
        req.user!._id.toString()
      );

      const response: ApiResponse = {
        success: true,
        message: 'Tenant removed successfully',
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  async getTenantsByProperty(req: AuthRequestWithLandlord, res: Response, next: NextFunction): Promise<void> {
    try {
      // For agents, landlordId comes from middleware; for landlords, use their own ID
      const landlordId = req.landlordId?.toString() || req.user!._id.toString();

      const tenants = await TenantService.getTenantsByProperty(
        req.params.propertyId as string,
        landlordId
      );

      const response: ApiResponse = {
        success: true,
        message: 'Tenants retrieved successfully',
        data: tenants,
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  async getAllTenants(req: AuthRequestWithLandlord, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenants = await TenantService.getTenantsByLandlord(
        req.user!._id.toString()
      );

      const response: ApiResponse = {
        success: true,
        message: 'Tenants retrieved successfully',
        data: tenants,
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  async searchTenants(req: AuthRequestWithLandlord, res: Response, next: NextFunction): Promise<void> {
    try {
      const query = req.query.q as string || '';
      const tenants = await TenantService.searchTenants(
        query,
        req.user!._id.toString()
      );

      const response: ApiResponse = {
        success: true,
        message: 'Search completed',
        data: tenants,
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  async getVacantUnits(req: AuthRequestWithLandlord, res: Response, next: NextFunction): Promise<void> {
    try {
      const units = await TenantService.getVacantUnits(
        req.params.propertyId as string,
        req.user!._id.toString()
      );

      const response: ApiResponse = {
        success: true,
        message: 'Vacant units retrieved successfully',
        data: units,
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  async getOccupiedUnits(req: AuthRequestWithLandlord, res: Response, next: NextFunction): Promise<void> {
    try {
      const units = await TenantService.getOccupiedUnits(
        req.user!._id.toString()
      );

      const response: ApiResponse = {
        success: true,
        message: 'Occupied units retrieved successfully',
        data: units,
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  async renewLease(req: AuthRequestWithLandlord, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await TenantService.renewLease(
        req.params.leaseId as string,
        req.user!._id.toString(),
        {
          newStartDate: new Date(req.body.newStartDate),
          newEndDate: new Date(req.body.newEndDate),
          rentAmount: req.body.rentAmount,
          paymentFrequency: req.body.paymentFrequency,
        }
      );

      const response: ApiResponse = {
        success: true,
        message: 'Lease renewed successfully',
        data: {
          lease: result.lease,
          tenant: result.tenant,
          property: result.property,
          unit: result.unit,
        },
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  // Guarantor methods
  async getGuarantor(req: AuthRequestWithLandlord, res: Response, next: NextFunction): Promise<void> {
    try {
      const guarantor = await TenantService.getGuarantor(
        req.params.leaseId as string,
        req.user!._id.toString()
      );

      const response: ApiResponse = {
        success: true,
        message: guarantor ? 'Guarantor retrieved successfully' : 'No guarantor found',
        data: guarantor,
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  async updateGuarantor(req: AuthRequestWithLandlord, res: Response, next: NextFunction): Promise<void> {
    try {
      const guarantor = await TenantService.updateGuarantor(
        req.params.leaseId as string,
        req.user!._id.toString(),
        req.body
      );

      const response: ApiResponse = {
        success: true,
        message: 'Guarantor updated successfully',
        data: guarantor,
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  async deleteGuarantor(req: AuthRequestWithLandlord, res: Response, next: NextFunction): Promise<void> {
    try {
      await TenantService.deleteGuarantor(
        req.params.leaseId as string,
        req.user!._id.toString()
      );

      const response: ApiResponse = {
        success: true,
        message: 'Guarantor deleted successfully',
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  // Emergency contacts methods
  async getEmergencyContacts(req: AuthRequestWithLandlord, res: Response, next: NextFunction): Promise<void> {
    try {
      const contacts = await TenantService.getEmergencyContacts(
        req.params.leaseId as string,
        req.user!._id.toString()
      );

      const response: ApiResponse = {
        success: true,
        message: 'Emergency contacts retrieved successfully',
        data: contacts,
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  async addEmergencyContact(req: AuthRequestWithLandlord, res: Response, next: NextFunction): Promise<void> {
    try {
      const contacts = await TenantService.addEmergencyContact(
        req.params.leaseId as string,
        req.user!._id.toString(),
        req.body
      );

      const response: ApiResponse = {
        success: true,
        message: 'Emergency contact added successfully',
        data: contacts,
      };

      res.status(201).json(response);
    } catch (error) {
      next(error);
    }
  }

  async updateEmergencyContact(req: AuthRequestWithLandlord, res: Response, next: NextFunction): Promise<void> {
    try {
      const contacts = await TenantService.updateEmergencyContact(
        req.params.leaseId as string,
        req.user!._id.toString(),
        parseInt(req.params.contactIndex as string, 10),
        req.body
      );

      const response: ApiResponse = {
        success: true,
        message: 'Emergency contact updated successfully',
        data: contacts,
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  async deleteEmergencyContact(req: AuthRequestWithLandlord, res: Response, next: NextFunction): Promise<void> {
    try {
      const contacts = await TenantService.deleteEmergencyContact(
        req.params.leaseId as string,
        req.user!._id.toString(),
        parseInt(req.params.contactIndex as string, 10)
      );

      const response: ApiResponse = {
        success: true,
        message: 'Emergency contact deleted successfully',
        data: contacts,
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  // Payment reminder
  async sendPaymentReminder(req: AuthRequestWithLandlord, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await TenantService.sendPaymentReminder(
        req.params.leaseId as string,
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
}

export default new TenantController();
