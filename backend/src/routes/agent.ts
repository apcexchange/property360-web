import { Router } from 'express';
import AgentController from '../controllers/AgentController';
import { protect, authorize, validate } from '../middleware';
import { UserRole } from '../types';
import {
  inviteAgentValidation,
  updateAgentValidation,
  setAgentStatusValidation,
} from '../validations/agent';

const router = Router();

// All routes are protected
router.use(protect);

// ============ Landlord Routes ============

// Invite an agent to manage properties
router.post(
  '/invite',
  authorize(UserRole.LANDLORD),
  validate(inviteAgentValidation),
  AgentController.inviteAgent
);

// Get all agents for landlord
router.get(
  '/',
  authorize(UserRole.LANDLORD),
  AgentController.getAgents
);

// Get agent details
router.get(
  '/:agentId',
  authorize(UserRole.LANDLORD),
  AgentController.getAgentDetails
);

// Update agent (permissions and/or properties)
router.patch(
  '/:agentId',
  authorize(UserRole.LANDLORD),
  validate(updateAgentValidation),
  AgentController.updateAgent
);

// Set agent active/inactive status
router.patch(
  '/:agentId/status',
  authorize(UserRole.LANDLORD),
  validate(setAgentStatusValidation),
  AgentController.setAgentStatus
);

// Remove agent
router.delete(
  '/:agentId',
  authorize(UserRole.LANDLORD),
  AgentController.removeAgent
);

// ============ Agent Routes ============

// Get all landlords an agent works for
router.get(
  '/my/landlords',
  authorize(UserRole.AGENT),
  AgentController.getLandlords
);

// Get pending invitations
router.get(
  '/my/invitations',
  authorize(UserRole.AGENT),
  AgentController.getPendingInvitations
);

// Get properties agent can manage
router.get(
  '/my/properties',
  authorize(UserRole.AGENT),
  AgentController.getAgentProperties
);

// Accept an invitation
router.post(
  '/invitations/:invitationId/accept',
  authorize(UserRole.AGENT),
  AgentController.acceptInvitation
);

// Reject an invitation
router.post(
  '/invitations/:invitationId/reject',
  authorize(UserRole.AGENT),
  AgentController.rejectInvitation
);

export default router;
