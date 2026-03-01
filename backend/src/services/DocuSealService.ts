import axios, { AxiosInstance } from 'axios';
import config from '../config';

interface Submitter {
  name: string;
  email: string;
  role: string;
  phone?: string;
}

interface CreateSubmissionResponse {
  id: number;
  slug: string;
  source: string;
  submitters: Array<{
    id: number;
    submission_id: number;
    uuid: string;
    email: string;
    slug: string;
    sent_at: string | null;
    opened_at: string | null;
    completed_at: string | null;
    declined_at: string | null;
    created_at: string;
    updated_at: string;
    name: string;
    phone: string | null;
    status: string;
    role: string;
    embed_src: string;
  }>;
  template: {
    id: number;
    name: string;
  };
  created_at: string;
  updated_at: string;
  status: string;
  completed_at: string | null;
}

interface TemplateFromDocumentResponse {
  id: number;
  slug: string;
  name: string;
  schema: any[];
  fields: any[];
  submitters: Array<{
    name: string;
    uuid: string;
  }>;
  created_at: string;
  updated_at: string;
}

interface SubmitterResponse {
  id: number;
  submission_id: number;
  uuid: string;
  email: string;
  slug: string;
  sent_at: string | null;
  opened_at: string | null;
  completed_at: string | null;
  declined_at: string | null;
  created_at: string;
  updated_at: string;
  name: string;
  phone: string | null;
  status: 'pending' | 'sent' | 'opened' | 'completed' | 'declined';
  role: string;
  embed_src: string;
  preferences: Record<string, any>;
}

interface WebhookPayload {
  event_type: 'submission.created' | 'submission.completed' | 'submitter.completed' | 'submitter.opened' | 'submitter.sent';
  timestamp: string;
  data: {
    id: number;
    submission_id?: number;
    email?: string;
    status?: string;
    completed_at?: string;
    documents?: Array<{
      name: string;
      url: string;
    }>;
  };
}

class DocuSealService {
  private client: AxiosInstance;
  private baseUrl: string;

  constructor() {
    this.baseUrl = config.docuseal?.apiUrl || 'https://api.docuseal.co';

    this.client = axios.create({
      baseURL: this.baseUrl,
      headers: {
        'X-Auth-Token': config.docuseal?.apiKey || '',
        'Content-Type': 'application/json',
      },
    });
  }

  /**
   * Create a template from an uploaded document (PDF, DOCX, or image)
   */
  async createTemplateFromDocument(
    documentUrl: string,
    name: string,
    signerRoles: string[] = ['Tenant']
  ): Promise<TemplateFromDocumentResponse> {
    try {
      const response = await this.client.post<TemplateFromDocumentResponse>(
        '/templates/pdf',
        {
          name,
          documents: [{ url: documentUrl }],
          // Define signature fields - DocuSeal will auto-detect or you can specify
          submitters: signerRoles.map(role => ({ name: role })),
        }
      );

      return response.data;
    } catch (error: any) {
      console.error('DocuSeal createTemplateFromDocument error:', error.response?.data || error.message);
      throw new Error(`Failed to create template: ${error.response?.data?.error || error.message}`);
    }
  }

  /**
   * Create a submission (signing request) from a template
   */
  async createSubmission(
    templateId: number,
    submitters: Submitter[],
    options?: {
      sendEmail?: boolean;
      messageSubject?: string;
      messageBody?: string;
      order?: 'random' | 'preserved';
    }
  ): Promise<CreateSubmissionResponse> {
    try {
      const response = await this.client.post<CreateSubmissionResponse>(
        '/submissions',
        {
          template_id: templateId,
          send_email: options?.sendEmail ?? true,
          order: options?.order || 'preserved',
          message: options?.messageBody ? {
            subject: options.messageSubject || 'Please sign the tenancy agreement',
            body: options.messageBody,
          } : undefined,
          submitters: submitters.map(s => ({
            name: s.name,
            email: s.email,
            role: s.role,
            phone: s.phone,
          })),
        }
      );

      return response.data;
    } catch (error: any) {
      console.error('DocuSeal createSubmission error:', error.response?.data || error.message);
      throw new Error(`Failed to create submission: ${error.response?.data?.error || error.message}`);
    }
  }

  /**
   * Create a submission directly from a document URL (combines template creation + submission)
   */
  async createSubmissionFromDocument(
    documentUrl: string,
    documentName: string,
    submitters: Submitter[],
    options?: {
      sendEmail?: boolean;
      messageSubject?: string;
      messageBody?: string;
    }
  ): Promise<CreateSubmissionResponse> {
    try {
      const response = await this.client.post<CreateSubmissionResponse>(
        '/submissions/init',
        {
          name: documentName,
          documents: [{ url: documentUrl }],
          send_email: options?.sendEmail ?? true,
          message: options?.messageBody ? {
            subject: options.messageSubject || 'Please sign the tenancy agreement',
            body: options.messageBody,
          } : undefined,
          submitters: submitters.map(s => ({
            name: s.name,
            email: s.email,
            role: s.role,
            phone: s.phone,
          })),
        }
      );

      return response.data;
    } catch (error: any) {
      console.error('DocuSeal createSubmissionFromDocument error:', error.response?.data || error.message);
      throw new Error(`Failed to create submission from document: ${error.response?.data?.error || error.message}`);
    }
  }

  /**
   * Get signing link for a submitter (for embedding or redirecting)
   */
  async getSubmitterSigningLink(submitterId: number): Promise<string> {
    try {
      const response = await this.client.get<SubmitterResponse>(
        `/submitters/${submitterId}`
      );

      return response.data.embed_src;
    } catch (error: any) {
      console.error('DocuSeal getSubmitterSigningLink error:', error.response?.data || error.message);
      throw new Error(`Failed to get signing link: ${error.response?.data?.error || error.message}`);
    }
  }

  /**
   * Get submission status
   */
  async getSubmission(submissionId: number): Promise<CreateSubmissionResponse> {
    try {
      const response = await this.client.get<CreateSubmissionResponse>(
        `/submissions/${submissionId}`
      );

      return response.data;
    } catch (error: any) {
      console.error('DocuSeal getSubmission error:', error.response?.data || error.message);
      throw new Error(`Failed to get submission: ${error.response?.data?.error || error.message}`);
    }
  }

  /**
   * Get submitter details
   */
  async getSubmitter(submitterId: number): Promise<SubmitterResponse> {
    try {
      const response = await this.client.get<SubmitterResponse>(
        `/submitters/${submitterId}`
      );

      return response.data;
    } catch (error: any) {
      console.error('DocuSeal getSubmitter error:', error.response?.data || error.message);
      throw new Error(`Failed to get submitter: ${error.response?.data?.error || error.message}`);
    }
  }

  /**
   * Download signed document
   */
  async getSignedDocumentUrl(submissionId: number): Promise<string[]> {
    try {
      const submission = await this.getSubmission(submissionId);

      // The submission response includes document URLs when completed
      if (submission.status === 'completed') {
        // Get documents from the API
        const response = await this.client.get(`/submissions/${submissionId}/documents`);
        return response.data.map((doc: any) => doc.url);
      }

      return [];
    } catch (error: any) {
      console.error('DocuSeal getSignedDocumentUrl error:', error.response?.data || error.message);
      throw new Error(`Failed to get signed document: ${error.response?.data?.error || error.message}`);
    }
  }

  /**
   * Verify webhook signature (if DocuSeal provides one)
   */
  verifyWebhookSignature(payload: string, signature: string): boolean {
    // DocuSeal may send a signature header - implement if needed
    // For now, we rely on the webhook URL being secret
    return true;
  }

  /**
   * Parse webhook payload
   */
  parseWebhookPayload(body: any): WebhookPayload {
    return body as WebhookPayload;
  }

  /**
   * Send reminder to sign
   */
  async sendReminder(submitterId: number): Promise<void> {
    try {
      await this.client.post(`/submitters/${submitterId}/remind`);
    } catch (error: any) {
      console.error('DocuSeal sendReminder error:', error.response?.data || error.message);
      throw new Error(`Failed to send reminder: ${error.response?.data?.error || error.message}`);
    }
  }
}

export const docuSealService = new DocuSealService();
export type { WebhookPayload, CreateSubmissionResponse, SubmitterResponse };
