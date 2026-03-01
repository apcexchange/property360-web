import fs from 'fs';
import { TenancyAgreement } from '../models/TenancyAgreement';
import { Lease } from '../models/Lease';
import { Property } from '../models/Property';
import { User } from '../models/User';
import {
  ITenancyAgreement,
  ILease,
  IExtractedLeaseData,
  IUser,
} from '../types';
import CloudinaryService from './CloudinaryService';
import DocumentProcessingService from './DocumentProcessingService';
import { docuSealService, WebhookPayload } from './DocuSealService';
import config from '../config';

// Type aliases for string literal types
type DocumentType = 'pdf' | 'docx' | 'image';
type ProcessingStatusType = 'pending' | 'processing' | 'completed' | 'failed';
type SigningStatusType = 'not_sent' | 'pending' | 'sent' | 'opened' | 'signed' | 'declined';

interface UploadAgreementData {
  leaseId: string;
  uploadedBy: string;
  file: Express.Multer.File;
}

interface AgreementListOptions {
  page?: number;
  limit?: number;
}

class TenancyAgreementService {
  /**
   * Determine document type from MIME type
   */
  private getDocumentType(mimeType: string): DocumentType {
    if (mimeType === 'application/pdf') {
      return 'pdf';
    }
    if (
      mimeType ===
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ) {
      return 'docx';
    }
    // Images
    return 'image';
  }

  /**
   * Upload a tenancy agreement document
   */
  async uploadAgreement(data: UploadAgreementData): Promise<ITenancyAgreement> {
    const { leaseId, uploadedBy, file } = data;

    // Verify lease exists and get related data
    const lease = await Lease.findById(leaseId).populate('property unit');
    if (!lease) {
      // Clean up temp file
      if (fs.existsSync(file.path)) {
        fs.unlinkSync(file.path);
      }
      throw new Error('Lease not found');
    }

    // Verify the uploader is the landlord of this lease
    if (lease.landlord.toString() !== uploadedBy) {
      if (fs.existsSync(file.path)) {
        fs.unlinkSync(file.path);
      }
      throw new Error('Only the landlord can upload agreements for this lease');
    }

    const documentType = this.getDocumentType(file.mimetype);
    let uploadResult;

    try {
      // Upload to Cloudinary based on document type
      if (documentType === 'image') {
        const result = await CloudinaryService.uploadImage(
          file.path,
          'agreements'
        );
        uploadResult = {
          url: result.url,
          publicId: result.publicId,
          bytes: file.size,
        };
      } else {
        uploadResult = await CloudinaryService.uploadRawFile(
          file.path,
          'agreements'
        );
      }

      // Clean up temp file
      if (fs.existsSync(file.path)) {
        fs.unlinkSync(file.path);
      }
    } catch (error) {
      // Clean up temp file on error
      if (fs.existsSync(file.path)) {
        fs.unlinkSync(file.path);
      }
      throw error;
    }

    // Create tenancy agreement record
    const agreement = new TenancyAgreement({
      lease: leaseId,
      property: lease.property,
      unit: lease.unit,
      uploadedBy,
      documentUrl: uploadResult.url,
      documentPublicId: uploadResult.publicId,
      documentType,
      originalFilename: file.originalname,
      fileSize: file.size,
      processingStatus: 'pending',
    });

    await agreement.save();

    // Trigger async OCR processing
    this.triggerDocumentProcessing(agreement._id.toString());

    return agreement;
  }

  /**
   * Trigger async document processing (OCR)
   */
  private async triggerDocumentProcessing(agreementId: string): Promise<void> {
    try {
      // Process asynchronously - don't await
      DocumentProcessingService.processAgreement(agreementId).catch((error) => {
        console.error(`Error processing agreement ${agreementId}:`, error);
      });
    } catch (error) {
      console.error('Error triggering document processing:', error);
    }
  }

  /**
   * Get agreements for a specific lease
   */
  async getAgreementsByLease(leaseId: string): Promise<ITenancyAgreement[]> {
    const agreements = await TenancyAgreement.find({ lease: leaseId })
      .sort({ createdAt: -1 })
      .populate('uploadedBy', 'firstName lastName email');

    return agreements;
  }

  /**
   * Get agreements for a property (landlord view)
   */
  async getAgreementsByProperty(
    propertyId: string,
    landlordId: string,
    options: AgreementListOptions = {}
  ): Promise<{ agreements: ITenancyAgreement[]; total: number }> {
    const { page = 1, limit = 20 } = options;

    // Verify landlord owns the property
    const property = await Property.findById(propertyId);
    if (!property) {
      throw new Error('Property not found');
    }
    if (property.owner.toString() !== landlordId) {
      throw new Error('You do not have access to this property');
    }

    const skip = (page - 1) * limit;

    const [agreements, total] = await Promise.all([
      TenancyAgreement.find({ property: propertyId })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('lease', 'startDate endDate rentAmount')
        .populate('unit', 'unitNumber')
        .populate('uploadedBy', 'firstName lastName'),
      TenancyAgreement.countDocuments({ property: propertyId }),
    ]);

    return { agreements, total };
  }

  /**
   * Get a single agreement with access check
   */
  async getAgreement(
    agreementId: string,
    userId: string
  ): Promise<ITenancyAgreement> {
    const agreement = await TenancyAgreement.findById(agreementId)
      .populate('lease')
      .populate('property', 'name')
      .populate('unit', 'unitNumber')
      .populate('uploadedBy', 'firstName lastName');

    if (!agreement) {
      throw new Error('Agreement not found');
    }

    // Check access - landlord who uploaded or tenant on the lease
    const lease = agreement.lease as unknown as ILease;
    const isLandlord = agreement.uploadedBy._id.toString() === userId;
    const isTenant = lease.tenant.toString() === userId;

    if (!isLandlord && !isTenant) {
      throw new Error('You do not have access to this agreement');
    }

    return agreement;
  }

  /**
   * Delete an agreement (landlord only)
   */
  async deleteAgreement(
    agreementId: string,
    landlordId: string
  ): Promise<void> {
    const agreement = await TenancyAgreement.findById(agreementId);

    if (!agreement) {
      throw new Error('Agreement not found');
    }

    // Only the uploader (landlord) can delete
    if (agreement.uploadedBy.toString() !== landlordId) {
      throw new Error('Only the landlord who uploaded can delete this agreement');
    }

    // Delete from Cloudinary
    if (agreement.documentType === 'image') {
      await CloudinaryService.deleteImage(agreement.documentPublicId);
    } else {
      await CloudinaryService.deleteRawFile(agreement.documentPublicId);
    }

    // Delete from database
    await TenancyAgreement.findByIdAndDelete(agreementId);
  }

  /**
   * Tenant acknowledges the agreement
   */
  async acknowledgeAgreement(
    agreementId: string,
    tenantId: string
  ): Promise<ITenancyAgreement> {
    const agreement = await TenancyAgreement.findById(agreementId).populate(
      'lease'
    );

    if (!agreement) {
      throw new Error('Agreement not found');
    }

    const lease = agreement.lease as unknown as ILease;

    // Verify the user is the tenant on this lease
    if (lease.tenant.toString() !== tenantId) {
      throw new Error('You are not the tenant for this lease');
    }

    if (agreement.tenantAcknowledged) {
      throw new Error('Agreement has already been acknowledged');
    }

    agreement.tenantAcknowledged = true;
    agreement.tenantAcknowledgedAt = new Date();
    await agreement.save();

    return agreement;
  }

  /**
   * Get processing status of an agreement
   */
  async getProcessingStatus(
    agreementId: string,
    userId: string
  ): Promise<{
    status: ProcessingStatusType;
    extractedData?: IExtractedLeaseData;
    error?: string;
  }> {
    const agreement = await TenancyAgreement.findById(agreementId).populate(
      'lease'
    );

    if (!agreement) {
      throw new Error('Agreement not found');
    }

    // Check access
    const lease = agreement.lease as unknown as ILease;
    const isLandlord = agreement.uploadedBy.toString() === userId;
    const isTenant = lease.tenant.toString() === userId;

    if (!isLandlord && !isTenant) {
      throw new Error('You do not have access to this agreement');
    }

    return {
      status: agreement.processingStatus,
      extractedData: agreement.extractedData,
      error: agreement.processingError,
    };
  }

  /**
   * Update extracted data (called by DocumentProcessingService)
   */
  async updateExtractedData(
    agreementId: string,
    extractedData: IExtractedLeaseData,
    status: ProcessingStatusType,
    error?: string
  ): Promise<void> {
    await TenancyAgreement.findByIdAndUpdate(agreementId, {
      extractedData,
      processingStatus: status,
      processingError: error,
    });
  }

  /**
   * Send agreement for e-signature via DocuSeal
   */
  async sendForSigning(
    agreementId: string,
    landlordId: string
  ): Promise<ITenancyAgreement> {
    const agreement = await TenancyAgreement.findById(agreementId)
      .populate('lease')
      .populate('property', 'name address');

    if (!agreement) {
      throw new Error('Agreement not found');
    }

    // Verify landlord owns this agreement
    if (agreement.uploadedBy.toString() !== landlordId) {
      throw new Error('Only the landlord can send agreements for signing');
    }

    // Check if already sent
    if (agreement.signingStatus !== 'not_sent') {
      throw new Error(`Agreement is already ${agreement.signingStatus}`);
    }

    const lease = agreement.lease as unknown as ILease;

    // Get tenant details
    const tenant = await User.findById(lease.tenant);
    if (!tenant) {
      throw new Error('Tenant not found');
    }

    if (!tenant.email) {
      throw new Error('Tenant does not have an email address');
    }

    // Get landlord details for the email
    const landlord = await User.findById(landlordId);
    if (!landlord) {
      throw new Error('Landlord not found');
    }

    const property = agreement.property as any;
    const propertyAddress = property.address
      ? `${property.address.street}, ${property.address.city}`
      : property.name;

    try {
      // Create submission in DocuSeal directly from the document URL
      const submission = await docuSealService.createSubmissionFromDocument(
        agreement.documentUrl,
        `Tenancy Agreement - ${property.name}`,
        [
          {
            name: `${tenant.firstName} ${tenant.lastName}`,
            email: tenant.email,
            role: 'Tenant',
            phone: tenant.phone,
          },
        ],
        {
          sendEmail: true,
          messageSubject: `Please sign your Tenancy Agreement for ${property.name}`,
          messageBody: `Dear ${tenant.firstName},

${landlord.firstName} ${landlord.lastName} has sent you a tenancy agreement to sign for the property at ${propertyAddress}.

Please review and sign the document at your earliest convenience.

If you have any questions, please contact your landlord directly.

Best regards,
Property360 Team`,
        }
      );

      // Get the submitter info (tenant)
      const submitter = submission.submitters[0];

      // Update agreement with DocuSeal info
      agreement.signingStatus = 'sent';
      agreement.docusealSubmissionId = submission.id;
      agreement.docusealSubmitterId = submitter.id;
      agreement.signingLink = submitter.embed_src;
      agreement.signingSentAt = new Date();
      agreement.tenantEmail = tenant.email;
      agreement.tenantName = `${tenant.firstName} ${tenant.lastName}`;

      await agreement.save();

      return agreement;
    } catch (error: any) {
      console.error('Error sending agreement for signing:', error);
      throw new Error(`Failed to send for signing: ${error.message}`);
    }
  }

  /**
   * Get signing status of an agreement
   */
  async getSigningStatus(
    agreementId: string,
    userId: string
  ): Promise<{
    status: SigningStatusType;
    signingLink?: string;
    signedDocumentUrl?: string;
    sentAt?: Date;
    openedAt?: Date;
    completedAt?: Date;
  }> {
    const agreement = await TenancyAgreement.findById(agreementId).populate('lease');

    if (!agreement) {
      throw new Error('Agreement not found');
    }

    // Check access
    const lease = agreement.lease as unknown as ILease;
    const isLandlord = agreement.uploadedBy.toString() === userId;
    const isTenant = lease.tenant.toString() === userId;

    if (!isLandlord && !isTenant) {
      throw new Error('You do not have access to this agreement');
    }

    return {
      status: agreement.signingStatus as SigningStatusType,
      signingLink: isTenant ? agreement.signingLink : undefined,
      signedDocumentUrl: agreement.signedDocumentUrl,
      sentAt: agreement.signingSentAt,
      openedAt: agreement.signingOpenedAt,
      completedAt: agreement.signingCompletedAt,
    };
  }

  /**
   * Resend signing reminder to tenant
   */
  async resendSigningReminder(
    agreementId: string,
    landlordId: string
  ): Promise<void> {
    const agreement = await TenancyAgreement.findById(agreementId);

    if (!agreement) {
      throw new Error('Agreement not found');
    }

    if (agreement.uploadedBy.toString() !== landlordId) {
      throw new Error('Only the landlord can send reminders');
    }

    if (!agreement.docusealSubmitterId) {
      throw new Error('Agreement has not been sent for signing');
    }

    if (agreement.signingStatus === 'signed') {
      throw new Error('Agreement has already been signed');
    }

    await docuSealService.sendReminder(agreement.docusealSubmitterId);
  }

  /**
   * Handle DocuSeal webhook events
   */
  async handleSigningWebhook(payload: WebhookPayload): Promise<void> {
    const { event_type, data } = payload;

    console.log('Received DocuSeal webhook:', event_type, data);

    let agreement: ITenancyAgreement | null = null;

    // Find agreement by submission ID or submitter ID
    if (data.submission_id) {
      agreement = await TenancyAgreement.findOne({
        docusealSubmissionId: data.submission_id,
      });
    } else if (data.id) {
      agreement = await TenancyAgreement.findOne({
        $or: [
          { docusealSubmissionId: data.id },
          { docusealSubmitterId: data.id },
        ],
      });
    }

    if (!agreement) {
      console.warn('Agreement not found for webhook:', data);
      return;
    }

    switch (event_type) {
      case 'submitter.sent':
        agreement.signingStatus = 'sent';
        agreement.signingSentAt = new Date();
        break;

      case 'submitter.opened':
        agreement.signingStatus = 'opened';
        agreement.signingOpenedAt = new Date();
        break;

      case 'submitter.completed':
      case 'submission.completed':
        agreement.signingStatus = 'signed';
        agreement.signingCompletedAt = new Date();
        agreement.tenantAcknowledged = true;
        agreement.tenantAcknowledgedAt = new Date();

        // Get signed document URL
        if (agreement.docusealSubmissionId) {
          try {
            const docUrls = await docuSealService.getSignedDocumentUrl(
              agreement.docusealSubmissionId
            );
            if (docUrls.length > 0) {
              agreement.signedDocumentUrl = docUrls[0];
            }
          } catch (error) {
            console.error('Error getting signed document URL:', error);
          }
        }

        // TODO: Send notification to landlord that tenant has signed
        await this.notifyLandlordOfSigning(agreement);
        break;
    }

    await agreement.save();
  }

  /**
   * Notify landlord that tenant has signed the agreement
   */
  private async notifyLandlordOfSigning(agreement: ITenancyAgreement): Promise<void> {
    try {
      const landlord = await User.findById(agreement.uploadedBy);
      if (!landlord || !landlord.email) {
        return;
      }

      const property = await Property.findById(agreement.property);

      // TODO: Implement email notification using your email service
      console.log(`Notification: Tenant ${agreement.tenantName} has signed the agreement for ${property?.name}`);

      // Example email content:
      // Subject: Tenancy Agreement Signed - ${property.name}
      // Body: ${agreement.tenantName} has signed the tenancy agreement for ${property.name}.
      //       You can view the signed document in your Property360 dashboard.
    } catch (error) {
      console.error('Error notifying landlord:', error);
    }
  }

  /**
   * Get signing link for tenant
   */
  async getSigningLinkForTenant(
    agreementId: string,
    tenantId: string
  ): Promise<string> {
    const agreement = await TenancyAgreement.findById(agreementId).populate('lease');

    if (!agreement) {
      throw new Error('Agreement not found');
    }

    const lease = agreement.lease as unknown as ILease;

    if (lease.tenant.toString() !== tenantId) {
      throw new Error('You are not the tenant for this agreement');
    }

    if (!agreement.signingLink) {
      throw new Error('Agreement has not been sent for signing');
    }

    if (agreement.signingStatus === 'signed') {
      throw new Error('Agreement has already been signed');
    }

    return agreement.signingLink;
  }
}

export default new TenancyAgreementService();
