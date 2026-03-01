import { Response, NextFunction } from 'express';
import { PropertyService } from '../services';
import { AuthRequest, ApiResponse } from '../types';

export class PropertyController {
  async createProperty(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const property = await PropertyService.createProperty({
        ...req.body,
        owner: req.user!._id,
      });

      const response: ApiResponse = {
        success: true,
        message: 'Property created successfully',
        data: property,
      };

      res.status(201).json(response);
    } catch (error) {
      next(error);
    }
  }

  async getProperties(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await PropertyService.getProperties(
        req.user!._id.toString(),
        req.query as Record<string, string>
      );

      const response: ApiResponse = {
        success: true,
        message: 'Properties retrieved successfully',
        data: result.properties,
        meta: result.meta,
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  async getPropertyById(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const property = await PropertyService.getPropertyById(
        req.params.id as string,
        req.user!._id.toString()
      );

      const response: ApiResponse = {
        success: true,
        message: 'Property retrieved successfully',
        data: property,
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  async updateProperty(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const property = await PropertyService.updateProperty(
        req.params.id as string,
        req.user!._id.toString(),
        req.body
      );

      const response: ApiResponse = {
        success: true,
        message: 'Property updated successfully',
        data: property,
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  async deleteProperty(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      await PropertyService.deleteProperty(req.params.id as string, req.user!._id.toString());

      const response: ApiResponse = {
        success: true,
        message: 'Property deleted successfully',
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  async addUnit(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const unit = await PropertyService.addUnit(req.params.id as string, req.body);

      const response: ApiResponse = {
        success: true,
        message: 'Unit added successfully',
        data: unit,
      };

      res.status(201).json(response);
    } catch (error) {
      next(error);
    }
  }

  async getUnits(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const units = await PropertyService.getUnits(req.params.id as string);

      const response: ApiResponse = {
        success: true,
        message: 'Units retrieved successfully',
        data: units,
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  async assignAgent(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const property = await PropertyService.assignAgent(
        req.params.id as string,
        req.user!._id.toString(),
        req.body.agentId
      );

      const response: ApiResponse = {
        success: true,
        message: 'Agent assigned successfully',
        data: property,
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }
}

export default new PropertyController();
