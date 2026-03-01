import { Response, NextFunction } from 'express';
import { TenantService } from '../services';
import { AuthRequest, ApiResponse } from '../types';

export class TenantController {
  async assignTenant(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await TenantService.assignTenantToUnit({
        unitId: req.params.unitId as string,
        landlordId: req.user!._id.toString(),
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

      const response: ApiResponse = {
        success: true,
        message: 'Tenant assigned successfully',
        data: result,
      };

      res.status(201).json(response);
    } catch (error) {
      next(error);
    }
  }

  async removeTenant(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
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

  async getTenantsByProperty(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenants = await TenantService.getTenantsByProperty(
        req.params.propertyId as string,
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

  async getAllTenants(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
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

  async searchTenants(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
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

  async getVacantUnits(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
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
}

export default new TenantController();
