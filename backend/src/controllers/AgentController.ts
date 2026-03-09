import { Response, NextFunction } from 'express';
import { AgentService } from '../services';
import { AuthRequest, ApiResponse } from '../types';

export class AgentController {
  /**
   * Invite an agent to manage properties (Landlord only)
   */
  async inviteAgent(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await AgentService.inviteAgent({
        landlordId: req.user!._id.toString(),
        agentEmail: req.body.email,
        propertyIds: req.body.propertyIds,
        permissions: req.body.permissions,
      });

      const response: ApiResponse = {
        success: true,
        message: 'Agent invitation sent successfully',
        data: {
          id: result._id.toString(),
          status: result.status,
          invitedAt: result.invitedAt,
        },
      };

      res.status(201).json(response);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get all agents for landlord
   */
  async getAgents(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const agents = await AgentService.getAgentsByLandlord(req.user!._id.toString());

      const response: ApiResponse = {
        success: true,
        message: 'Agents retrieved successfully',
        data: agents.map((a) => ({
          id: a._id.toString(),
          agent: a.agent,
          properties: a.properties,
          permissions: a.permissions,
          isActive: a.isActive,
          status: a.status,
          invitedAt: a.invitedAt,
          acceptedAt: a.acceptedAt,
        })),
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get agent details
   */
  async getAgentDetails(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const agentId = req.params.agentId as string;
      const agent = await AgentService.getAgentDetails(
        req.user!._id.toString(),
        agentId
      );

      if (!agent) {
        const response: ApiResponse = {
          success: false,
          message: 'Agent not found',
        };
        res.status(404).json(response);
        return;
      }

      const response: ApiResponse = {
        success: true,
        message: 'Agent retrieved successfully',
        data: {
          id: agent._id.toString(),
          agent: agent.agent,
          properties: agent.properties,
          permissions: agent.permissions,
          isActive: agent.isActive,
          status: agent.status,
          invitedAt: agent.invitedAt,
          acceptedAt: agent.acceptedAt,
        },
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update agent (permissions and/or properties)
   */
  async updateAgent(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const agentId = req.params.agentId as string;
      const result = await AgentService.updateAgent(
        req.user!._id.toString(),
        agentId,
        {
          permissions: req.body.permissions,
          propertyIds: req.body.propertyIds,
        }
      );

      const response: ApiResponse = {
        success: true,
        message: 'Agent updated successfully',
        data: {
          id: result._id.toString(),
          permissions: result.permissions,
          properties: result.properties,
        },
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Set agent active/inactive status
   */
  async setAgentStatus(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const agentId = req.params.agentId as string;
      const result = await AgentService.setAgentStatus(
        req.user!._id.toString(),
        agentId,
        req.body.isActive
      );

      const response: ApiResponse = {
        success: true,
        message: `Agent ${req.body.isActive ? 'activated' : 'deactivated'} successfully`,
        data: {
          id: result._id.toString(),
          isActive: result.isActive,
        },
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Remove agent from landlord's properties
   */
  async removeAgent(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const agentId = req.params.agentId as string;
      await AgentService.removeAgent(
        req.user!._id.toString(),
        agentId
      );

      const response: ApiResponse = {
        success: true,
        message: 'Agent removed successfully',
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  // ========== Agent-side endpoints ==========

  /**
   * Get all landlords an agent works for
   */
  async getLandlords(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const relationships = await AgentService.getLandlordsByAgent(req.user!._id.toString());

      const response: ApiResponse = {
        success: true,
        message: 'Landlords retrieved successfully',
        data: relationships.map((r) => ({
          id: r._id.toString(),
          landlord: r.landlord,
          properties: r.properties,
          permissions: r.permissions,
          isActive: r.isActive,
        })),
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get pending invitations for agent
   */
  async getPendingInvitations(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const invitations = await AgentService.getPendingInvitations(req.user!._id.toString());

      const response: ApiResponse = {
        success: true,
        message: 'Pending invitations retrieved successfully',
        data: invitations.map((i) => ({
          id: i._id.toString(),
          landlord: i.landlord,
          properties: i.properties,
          permissions: i.permissions,
          invitedAt: i.invitedAt,
        })),
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Accept an invitation
   */
  async acceptInvitation(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const invitationId = req.params.invitationId as string;
      const result = await AgentService.acceptInvitation(
        invitationId,
        req.user!._id.toString()
      );

      const response: ApiResponse = {
        success: true,
        message: 'Invitation accepted successfully',
        data: {
          id: result._id.toString(),
          status: result.status,
          acceptedAt: result.acceptedAt,
        },
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Reject an invitation
   */
  async rejectInvitation(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const invitationId = req.params.invitationId as string;
      const result = await AgentService.rejectInvitation(
        invitationId,
        req.user!._id.toString()
      );

      const response: ApiResponse = {
        success: true,
        message: 'Invitation rejected',
        data: {
          id: result._id.toString(),
          status: result.status,
        },
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get properties an agent can manage
   */
  async getAgentProperties(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const properties = await AgentService.getAgentProperties(req.user!._id.toString());

      const response: ApiResponse = {
        success: true,
        message: 'Properties retrieved successfully',
        data: properties,
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }
}

export default new AgentController();
