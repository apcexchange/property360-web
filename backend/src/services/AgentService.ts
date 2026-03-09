import { User, Property, LandlordAgent } from '../models';
import {
  IUser,
  ILandlordAgent,
  IAgentPermissions,
  UserRole,
  AgentInvitationStatus,
} from '../types';
import { AppError } from '../middleware';
import emailOtpService from './EmailOtpService';

// Default permissions - all false initially
const DEFAULT_PERMISSIONS: IAgentPermissions = {
  canAddTenant: false,
  canRemoveTenant: false,
  canRecordPayment: false,
  canViewPayments: false,
  canRenewLease: false,
  canManageMaintenance: false,
  canViewReports: false,
  canUploadAgreements: false,
};

interface InviteAgentData {
  landlordId: string;
  agentEmail: string;
  propertyIds: string[];
  permissions?: Partial<IAgentPermissions>;
}

interface UpdateAgentData {
  permissions?: Partial<IAgentPermissions>;
  propertyIds?: string[];
}

export class AgentService {
  /**
   * Invite an agent to manage properties
   * Creates a pending invitation that the agent must accept
   */
  async inviteAgent(data: InviteAgentData): Promise<ILandlordAgent> {
    const { landlordId, agentEmail, propertyIds, permissions } = data;

    // Verify landlord exists and is actually a landlord
    const landlord = await User.findById(landlordId);
    if (!landlord || landlord.role !== UserRole.LANDLORD) {
      throw new AppError('Only landlords can invite agents', 403);
    }

    // Find the agent user by email
    const agent = await User.findOne({
      email: agentEmail.toLowerCase(),
      isDeleted: { $ne: true },
    });

    if (!agent) {
      throw new AppError('No user found with this email address', 404);
    }

    // Verify the user is an agent
    if (agent.role !== UserRole.AGENT) {
      throw new AppError('The specified user is not registered as an agent', 400);
    }

    // Check if invitation already exists
    const existingInvitation = await LandlordAgent.findOne({
      landlord: landlordId,
      agent: agent._id,
    });

    if (existingInvitation) {
      if (existingInvitation.status === AgentInvitationStatus.PENDING) {
        throw new AppError('An invitation is already pending for this agent', 400);
      }
      if (
        existingInvitation.status === AgentInvitationStatus.ACCEPTED &&
        existingInvitation.isActive
      ) {
        throw new AppError('This agent is already assigned to your properties', 400);
      }
    }

    // Verify all properties belong to the landlord
    const properties = await Property.find({
      _id: { $in: propertyIds },
      owner: landlordId,
    });

    if (properties.length !== propertyIds.length) {
      throw new AppError(
        'One or more properties do not exist or do not belong to you',
        400
      );
    }

    // Merge provided permissions with defaults
    const mergedPermissions: IAgentPermissions = {
      ...DEFAULT_PERMISSIONS,
      ...permissions,
    };

    // Create or update the landlord-agent relationship
    let landlordAgent: ILandlordAgent;

    if (existingInvitation) {
      // Reactivate/update existing relationship
      existingInvitation.properties = propertyIds.map((id) => id as any);
      existingInvitation.permissions = mergedPermissions;
      existingInvitation.status = AgentInvitationStatus.PENDING;
      existingInvitation.isActive = false;
      existingInvitation.invitedAt = new Date();
      existingInvitation.acceptedAt = undefined;
      await existingInvitation.save();
      landlordAgent = existingInvitation;
    } else {
      // Create new invitation
      landlordAgent = await LandlordAgent.create({
        landlord: landlordId,
        agent: agent._id,
        properties: propertyIds,
        permissions: mergedPermissions,
        status: AgentInvitationStatus.PENDING,
        isActive: false,
      });
    }

    // Send invitation email to agent
    try {
      await emailOtpService.sendAgentInvitation(
        agent.email,
        agent.firstName,
        `${landlord.firstName} ${landlord.lastName}`,
        properties.map((p) => p.name)
      );
    } catch (error) {
      console.error('[AgentService] Failed to send invitation email:', error);
    }

    return landlordAgent;
  }

  /**
   * Get all agents for a landlord
   */
  async getAgentsByLandlord(landlordId: string): Promise<ILandlordAgent[]> {
    const agents = await LandlordAgent.find({ landlord: landlordId })
      .populate('agent', 'firstName lastName email phone avatar')
      .populate('properties', 'name address')
      .sort({ createdAt: -1 });

    return agents;
  }

  /**
   * Get all landlords an agent works for
   */
  async getLandlordsByAgent(agentId: string): Promise<ILandlordAgent[]> {
    const relationships = await LandlordAgent.find({
      agent: agentId,
      status: AgentInvitationStatus.ACCEPTED,
    })
      .populate('landlord', 'firstName lastName email phone avatar')
      .populate('properties', 'name address')
      .sort({ createdAt: -1 });

    return relationships;
  }

  /**
   * Get pending invitations for an agent
   */
  async getPendingInvitations(agentId: string): Promise<ILandlordAgent[]> {
    const invitations = await LandlordAgent.find({
      agent: agentId,
      status: AgentInvitationStatus.PENDING,
    })
      .populate('landlord', 'firstName lastName email phone avatar')
      .populate('properties', 'name address')
      .sort({ invitedAt: -1 });

    return invitations;
  }

  /**
   * Accept an invitation from a landlord
   */
  async acceptInvitation(
    invitationId: string,
    agentId: string
  ): Promise<ILandlordAgent> {
    const invitation = await LandlordAgent.findOne({
      _id: invitationId,
      agent: agentId,
      status: AgentInvitationStatus.PENDING,
    });

    if (!invitation) {
      throw new AppError('Invitation not found or already processed', 404);
    }

    invitation.status = AgentInvitationStatus.ACCEPTED;
    invitation.isActive = true;
    invitation.acceptedAt = new Date();
    await invitation.save();

    // Notify landlord
    const landlord = await User.findById(invitation.landlord);
    const agent = await User.findById(agentId);
    if (landlord && agent) {
      try {
        await emailOtpService.sendAgentInvitationAccepted(
          landlord.email,
          landlord.firstName,
          `${agent.firstName} ${agent.lastName}`
        );
      } catch (error) {
        console.error('[AgentService] Failed to send acceptance email:', error);
      }
    }

    return invitation;
  }

  /**
   * Reject an invitation from a landlord
   */
  async rejectInvitation(
    invitationId: string,
    agentId: string
  ): Promise<ILandlordAgent> {
    const invitation = await LandlordAgent.findOne({
      _id: invitationId,
      agent: agentId,
      status: AgentInvitationStatus.PENDING,
    });

    if (!invitation) {
      throw new AppError('Invitation not found or already processed', 404);
    }

    invitation.status = AgentInvitationStatus.REJECTED;
    invitation.isActive = false;
    await invitation.save();

    return invitation;
  }

  /**
   * Update agent's permissions
   */
  async updateAgentPermissions(
    landlordId: string,
    agentId: string,
    permissions: Partial<IAgentPermissions>
  ): Promise<ILandlordAgent> {
    const relationship = await LandlordAgent.findOne({
      landlord: landlordId,
      agent: agentId,
      status: AgentInvitationStatus.ACCEPTED,
    });

    if (!relationship) {
      throw new AppError('Agent relationship not found', 404);
    }

    // Merge new permissions with existing
    relationship.permissions = {
      ...relationship.permissions,
      ...permissions,
    } as IAgentPermissions;

    await relationship.save();

    return relationship;
  }

  /**
   * Update agent's assigned properties
   */
  async updateAgentProperties(
    landlordId: string,
    agentId: string,
    propertyIds: string[]
  ): Promise<ILandlordAgent> {
    const relationship = await LandlordAgent.findOne({
      landlord: landlordId,
      agent: agentId,
      status: AgentInvitationStatus.ACCEPTED,
    });

    if (!relationship) {
      throw new AppError('Agent relationship not found', 404);
    }

    // Verify all properties belong to the landlord
    const properties = await Property.find({
      _id: { $in: propertyIds },
      owner: landlordId,
    });

    if (properties.length !== propertyIds.length) {
      throw new AppError(
        'One or more properties do not exist or do not belong to you',
        400
      );
    }

    relationship.properties = propertyIds.map((id) => id as any);
    await relationship.save();

    return relationship;
  }

  /**
   * Set agent active/inactive status
   */
  async setAgentStatus(
    landlordId: string,
    agentId: string,
    isActive: boolean
  ): Promise<ILandlordAgent> {
    const relationship = await LandlordAgent.findOne({
      landlord: landlordId,
      agent: agentId,
      status: AgentInvitationStatus.ACCEPTED,
    });

    if (!relationship) {
      throw new AppError('Agent relationship not found', 404);
    }

    relationship.isActive = isActive;
    await relationship.save();

    // Notify agent of status change
    const agent = await User.findById(agentId);
    const landlord = await User.findById(landlordId);
    if (agent && landlord) {
      try {
        await emailOtpService.sendAgentStatusChange(
          agent.email,
          agent.firstName,
          `${landlord.firstName} ${landlord.lastName}`,
          isActive
        );
      } catch (error) {
        console.error('[AgentService] Failed to send status change email:', error);
      }
    }

    return relationship;
  }

  /**
   * Remove agent from landlord's properties
   */
  async removeAgent(landlordId: string, agentId: string): Promise<void> {
    const result = await LandlordAgent.deleteOne({
      landlord: landlordId,
      agent: agentId,
    });

    if (result.deletedCount === 0) {
      throw new AppError('Agent relationship not found', 404);
    }
  }

  /**
   * Get agent's permissions for a specific landlord
   */
  async getAgentPermissions(
    agentId: string,
    landlordId: string
  ): Promise<IAgentPermissions | null> {
    const relationship = await LandlordAgent.findOne({
      landlord: landlordId,
      agent: agentId,
      status: AgentInvitationStatus.ACCEPTED,
      isActive: true,
    });

    if (!relationship) {
      return null;
    }

    return relationship.permissions;
  }

  /**
   * Check if agent has a specific permission for a property
   */
  async checkAgentPermissionForProperty(
    agentId: string,
    propertyId: string,
    permission: keyof IAgentPermissions
  ): Promise<{ hasPermission: boolean; landlordId: string | null }> {
    const relationship = await LandlordAgent.findOne({
      agent: agentId,
      properties: propertyId,
      status: AgentInvitationStatus.ACCEPTED,
      isActive: true,
    });

    if (!relationship) {
      return { hasPermission: false, landlordId: null };
    }

    return {
      hasPermission: relationship.permissions[permission] === true,
      landlordId: relationship.landlord.toString(),
    };
  }

  /**
   * Get properties an agent can manage
   */
  async getAgentProperties(agentId: string): Promise<any[]> {
    const relationships = await LandlordAgent.find({
      agent: agentId,
      status: AgentInvitationStatus.ACCEPTED,
      isActive: true,
    }).populate({
      path: 'properties',
      populate: {
        path: 'owner',
        select: 'firstName lastName email phone',
      },
    });

    // Flatten and return all properties with landlord info
    const properties: any[] = [];
    for (const rel of relationships) {
      for (const prop of rel.properties as any[]) {
        properties.push({
          ...prop.toJSON(),
          permissions: rel.permissions,
          landlord: prop.owner,
        });
      }
    }

    return properties;
  }

  /**
   * Get a single agent relationship with full details
   */
  async getAgentDetails(
    landlordId: string,
    agentId: string
  ): Promise<ILandlordAgent | null> {
    const relationship = await LandlordAgent.findOne({
      landlord: landlordId,
      agent: agentId,
    })
      .populate('agent', 'firstName lastName email phone avatar')
      .populate('properties', 'name address');

    return relationship;
  }

  /**
   * Update agent (permissions and/or properties)
   */
  async updateAgent(
    landlordId: string,
    agentId: string,
    data: UpdateAgentData
  ): Promise<ILandlordAgent> {
    const relationship = await LandlordAgent.findOne({
      landlord: landlordId,
      agent: agentId,
    });

    if (!relationship) {
      throw new AppError('Agent relationship not found', 404);
    }

    if (data.permissions) {
      relationship.permissions = {
        ...relationship.permissions,
        ...data.permissions,
      } as IAgentPermissions;
    }

    if (data.propertyIds) {
      // Verify all properties belong to the landlord
      const properties = await Property.find({
        _id: { $in: data.propertyIds },
        owner: landlordId,
      });

      if (properties.length !== data.propertyIds.length) {
        throw new AppError(
          'One or more properties do not exist or do not belong to you',
          400
        );
      }

      relationship.properties = data.propertyIds.map((id) => id as any);
    }

    await relationship.save();

    return relationship;
  }
}

export default new AgentService();
