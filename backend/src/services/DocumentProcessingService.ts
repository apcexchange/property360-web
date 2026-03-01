import { DocumentProcessorServiceClient } from '@google-cloud/documentai';
import axios from 'axios';
import { TenancyAgreement } from '../models/TenancyAgreement';
import { IExtractedLeaseData } from '../types';
import { config } from '../config';

// Type alias for document type
type DocumentType = 'pdf' | 'docx' | 'image';

class DocumentProcessingService {
  private client: DocumentProcessorServiceClient | null = null;
  private processorName: string | null = null;

  constructor() {
    this.initializeClient();
  }

  private initializeClient(): void {
    try {
      // Only initialize if credentials are configured
      if (config.googleDocumentAI?.projectId && config.googleDocumentAI?.processorId) {
        this.client = new DocumentProcessorServiceClient();
        this.processorName = `projects/${config.googleDocumentAI.projectId}/locations/${config.googleDocumentAI.location || 'us'}/processors/${config.googleDocumentAI.processorId}`;
      }
    } catch (error) {
      console.warn('Google Document AI not configured, OCR will be skipped');
    }
  }

  /**
   * Process a tenancy agreement document for OCR extraction
   */
  async processAgreement(agreementId: string): Promise<void> {
    const agreement = await TenancyAgreement.findById(agreementId);
    if (!agreement) {
      console.error(`Agreement ${agreementId} not found`);
      return;
    }

    // Update status to processing
    agreement.processingStatus = 'processing';
    await agreement.save();

    try {
      // Check if Google Document AI is configured
      if (!this.client || !this.processorName) {
        // Fallback: mark as completed without OCR data
        agreement.processingStatus = 'completed';
        agreement.extractedData = {
          rawText: 'OCR not configured. Document stored successfully.',
          confidence: 0,
        };
        await agreement.save();
        return;
      }

      // Download the document from Cloudinary
      const documentContent = await this.downloadDocument(agreement.documentUrl);

      // Determine MIME type
      const mimeType = this.getMimeType(agreement.documentType);

      // Process with Google Document AI
      const extractedText = await this.extractTextFromDocument(
        documentContent,
        mimeType
      );

      // Parse the extracted text to find lease-related data
      const extractedData = this.parseLeaseData(extractedText);

      // Update agreement with extracted data
      agreement.processingStatus = 'completed';
      agreement.extractedData = extractedData;
      await agreement.save();
    } catch (error) {
      console.error(`Error processing agreement ${agreementId}:`, error);
      agreement.processingStatus = 'failed';
      agreement.processingError =
        error instanceof Error ? error.message : 'Unknown processing error';
      await agreement.save();
    }
  }

  /**
   * Download document from URL
   */
  private async downloadDocument(url: string): Promise<Buffer> {
    const response = await axios.get(url, {
      responseType: 'arraybuffer',
    });
    return Buffer.from(response.data);
  }

  /**
   * Get MIME type for document
   */
  private getMimeType(documentType: DocumentType): string {
    switch (documentType) {
      case 'pdf':
        return 'application/pdf';
      case 'docx':
        return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
      case 'image':
      default:
        return 'image/jpeg';
    }
  }

  /**
   * Extract text from document using Google Document AI
   */
  private async extractTextFromDocument(
    content: Buffer,
    mimeType: string
  ): Promise<string> {
    if (!this.client || !this.processorName) {
      throw new Error('Document AI client not initialized');
    }

    const request = {
      name: this.processorName,
      rawDocument: {
        content: content.toString('base64'),
        mimeType,
      },
    };

    const [result] = await this.client.processDocument(request);
    const { document } = result;

    if (!document || !document.text) {
      throw new Error('No text extracted from document');
    }

    return document.text;
  }

  /**
   * Parse extracted text to find lease-related information
   */
  private parseLeaseData(text: string): IExtractedLeaseData {
    const extractedData: IExtractedLeaseData = {
      rawText: text,
      confidence: 0.7, // Default confidence
    };

    // Normalize text for pattern matching
    const normalizedText = text.toLowerCase();

    // Extract dates (common formats)
    const datePatterns = [
      /(?:start(?:ing)?|commencement|from)\s*(?:date)?[:\s]*(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/i,
      /(?:end(?:ing)?|expir(?:y|ation)|to)\s*(?:date)?[:\s]*(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/i,
    ];

    // Try to extract start date
    const startDateMatch = text.match(datePatterns[0]);
    if (startDateMatch) {
      const parsedDate = this.parseDate(startDateMatch[1]);
      if (parsedDate) {
        extractedData.leaseStartDate = parsedDate;
      }
    }

    // Try to extract end date
    const endDateMatch = text.match(datePatterns[1]);
    if (endDateMatch) {
      const parsedDate = this.parseDate(endDateMatch[1]);
      if (parsedDate) {
        extractedData.leaseEndDate = parsedDate;
      }
    }

    // Extract rent amount
    const rentPatterns = [
      /(?:rent|monthly\s*payment|rental\s*amount)[:\s]*(?:₦|NGN|N)?\s*([\d,]+(?:\.\d{2})?)/i,
      /(?:₦|NGN)\s*([\d,]+(?:\.\d{2})?)\s*(?:per\s*month|monthly|p\.m\.?)/i,
    ];

    for (const pattern of rentPatterns) {
      const rentMatch = text.match(pattern);
      if (rentMatch) {
        const amount = parseFloat(rentMatch[1].replace(/,/g, ''));
        if (!isNaN(amount)) {
          extractedData.rentAmount = amount;
          break;
        }
      }
    }

    // Extract security deposit
    const depositPatterns = [
      /(?:security\s*deposit|caution\s*fee)[:\s]*(?:₦|NGN|N)?\s*([\d,]+(?:\.\d{2})?)/i,
    ];

    for (const pattern of depositPatterns) {
      const depositMatch = text.match(pattern);
      if (depositMatch) {
        const amount = parseFloat(depositMatch[1].replace(/,/g, ''));
        if (!isNaN(amount)) {
          extractedData.securityDeposit = amount;
          break;
        }
      }
    }

    // Extract tenant name
    const tenantPatterns = [
      /(?:tenant|lessee|renter)[:\s]*(?:name)?[:\s]*([A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+){1,3})/,
      /(?:mr\.?|mrs\.?|ms\.?|miss)\s*([A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+){1,2})/i,
    ];

    for (const pattern of tenantPatterns) {
      const tenantMatch = text.match(pattern);
      if (tenantMatch) {
        extractedData.tenantName = tenantMatch[1].trim();
        break;
      }
    }

    // Extract landlord name
    const landlordPatterns = [
      /(?:landlord|lessor|owner|property\s*owner)[:\s]*(?:name)?[:\s]*([A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+){1,3})/,
    ];

    for (const pattern of landlordPatterns) {
      const landlordMatch = text.match(pattern);
      if (landlordMatch) {
        extractedData.landlordName = landlordMatch[1].trim();
        break;
      }
    }

    // Extract property address
    const addressPatterns = [
      /(?:property\s*address|premises|located\s*at)[:\s]*(.+?)(?:\.|$)/im,
      /(?:address)[:\s]*(\d+[^.]+(?:street|road|avenue|close|crescent|way|lane)[^.]*)/i,
    ];

    for (const pattern of addressPatterns) {
      const addressMatch = text.match(pattern);
      if (addressMatch) {
        extractedData.propertyAddress = addressMatch[1].trim();
        break;
      }
    }

    // Calculate confidence based on how much data was extracted
    let fieldsExtracted = 0;
    if (extractedData.leaseStartDate) fieldsExtracted++;
    if (extractedData.leaseEndDate) fieldsExtracted++;
    if (extractedData.rentAmount) fieldsExtracted++;
    if (extractedData.tenantName) fieldsExtracted++;
    if (extractedData.landlordName) fieldsExtracted++;
    if (extractedData.propertyAddress) fieldsExtracted++;

    extractedData.confidence = Math.min(0.9, 0.3 + fieldsExtracted * 0.1);

    return extractedData;
  }

  /**
   * Parse date string to Date object
   */
  private parseDate(dateStr: string): Date | undefined {
    try {
      // Handle common date formats
      const parts = dateStr.split(/[\/\-]/);
      if (parts.length === 3) {
        let day, month, year;

        // Try to determine format (DD/MM/YYYY or MM/DD/YYYY)
        const first = parseInt(parts[0], 10);
        const second = parseInt(parts[1], 10);
        let third = parseInt(parts[2], 10);

        // Handle 2-digit year
        if (third < 100) {
          third += third < 50 ? 2000 : 1900;
        }

        // Assume DD/MM/YYYY for values where first > 12
        if (first > 12) {
          day = first;
          month = second - 1;
          year = third;
        } else if (second > 12) {
          // MM/DD/YYYY
          month = first - 1;
          day = second;
          year = third;
        } else {
          // Default to DD/MM/YYYY
          day = first;
          month = second - 1;
          year = third;
        }

        const date = new Date(year, month, day);
        if (!isNaN(date.getTime())) {
          return date;
        }
      }
    } catch (error) {
      console.warn(`Failed to parse date: ${dateStr}`);
    }
    return undefined;
  }
}

export default new DocumentProcessingService();
