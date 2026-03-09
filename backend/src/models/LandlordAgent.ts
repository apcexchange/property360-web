import mongoose, { Schema } from 'mongoose';
import { ILandlordAgent, AgentInvitationStatus } from '../types';

const agentPermissionsSchema = new Schema(
  {
    canAddTenant: {
      type: Boolean,
      default: false,
    },
    canRemoveTenant: {
      type: Boolean,
      default: false,
    },
    canRecordPayment: {
      type: Boolean,
      default: false,
    },
    canViewPayments: {
      type: Boolean,
      default: false,
    },
    canRenewLease: {
      type: Boolean,
      default: false,
    },
    canManageMaintenance: {
      type: Boolean,
      default: false,
    },
    canViewReports: {
      type: Boolean,
      default: false,
    },
    canUploadAgreements: {
      type: Boolean,
      default: false,
    },
  },
  { _id: false }
);

const landlordAgentSchema = new Schema<ILandlordAgent>(
  {
    landlord: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Landlord is required'],
    },
    agent: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Agent is required'],
    },
    properties: [
      {
        type: Schema.Types.ObjectId,
        ref: 'Property',
      },
    ],
    permissions: {
      type: agentPermissionsSchema,
      default: () => ({
        canAddTenant: false,
        canRemoveTenant: false,
        canRecordPayment: false,
        canViewPayments: false,
        canRenewLease: false,
        canManageMaintenance: false,
        canViewReports: false,
        canUploadAgreements: false,
      }),
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    invitedAt: {
      type: Date,
      default: Date.now,
    },
    acceptedAt: {
      type: Date,
    },
    status: {
      type: String,
      enum: Object.values(AgentInvitationStatus),
      default: AgentInvitationStatus.PENDING,
    },
  },
  {
    timestamps: true,
  }
);

// Unique constraint: One relationship per landlord-agent pair
landlordAgentSchema.index({ landlord: 1, agent: 1 }, { unique: true });

// Index for querying agent's active assignments
landlordAgentSchema.index({ agent: 1, isActive: 1 });

// Index for querying landlord's agents
landlordAgentSchema.index({ landlord: 1, status: 1 });

export const LandlordAgent = mongoose.model<ILandlordAgent>('LandlordAgent', landlordAgentSchema);
export default LandlordAgent;
