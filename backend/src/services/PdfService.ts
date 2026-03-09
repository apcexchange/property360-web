import PDFDocument from 'pdfkit';

export interface PopulatedInvoice {
  _id: string;
  invoiceNumber: string;
  tenant: {
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
  };
  property: {
    name: string;
    address?: {
      city: string;
      state: string;
    };
  };
  unit?: {
    unitNumber: string;
  };
  lineItems: Array<{
    description: string;
    quantity: number;
    rate: number;
    amount: number;
  }>;
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  total: number;
  issueDate: Date;
  dueDate: Date;
  status: string;
  paidAt?: Date;
  notes?: string;
}

const formatDate = (date: Date): string => {
  return new Date(date).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
};

const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    minimumFractionDigits: 2,
  }).format(amount);
};

export class PdfService {
  static async generateInvoicePdf(invoice: PopulatedInvoice): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({
          size: 'A4',
          margin: 50,
          info: {
            Title: `Invoice ${invoice.invoiceNumber}`,
            Author: 'Property360',
          },
        });

        const buffers: Buffer[] = [];
        doc.on('data', (chunk) => buffers.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(buffers)));
        doc.on('error', reject);

        const tenantName = `${invoice.tenant.firstName} ${invoice.tenant.lastName}`;
        const pageWidth = doc.page.width - 100;

        // Header
        doc
          .fontSize(28)
          .font('Helvetica-Bold')
          .fillColor('#111827')
          .text('INVOICE', 50, 50);

        doc
          .fontSize(12)
          .font('Helvetica')
          .fillColor('#6B7280')
          .text(invoice.invoiceNumber, 50, 85);

        // Status badge
        const statusColors: Record<string, { text: string; bg: string }> = {
          draft: { text: '#6B7280', bg: '#F3F4F6' },
          sent: { text: '#3B82F6', bg: '#EFF6FF' },
          paid: { text: '#10B981', bg: '#D1FAE5' },
          overdue: { text: '#EF4444', bg: '#FEE2E2' },
          cancelled: { text: '#9CA3AF', bg: '#F9FAFB' },
        };
        const statusColor = statusColors[invoice.status] || statusColors.draft;
        const statusLabel = invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1);

        doc
          .roundedRect(450, 50, 80, 24, 4)
          .fill(statusColor.bg);

        doc
          .fontSize(10)
          .font('Helvetica-Bold')
          .fillColor(statusColor.text)
          .text(statusLabel, 450, 57, { width: 80, align: 'center' });

        // Divider
        doc
          .moveTo(50, 115)
          .lineTo(545, 115)
          .strokeColor('#E5E7EB')
          .lineWidth(2)
          .stroke();

        let yPos = 140;

        // Bill To and Property sections
        // Bill To
        doc
          .fontSize(10)
          .font('Helvetica-Bold')
          .fillColor('#6B7280')
          .text('BILL TO', 50, yPos);

        yPos += 18;

        doc
          .fontSize(14)
          .font('Helvetica-Bold')
          .fillColor('#1F2937')
          .text(tenantName, 50, yPos);

        yPos += 18;

        doc
          .fontSize(11)
          .font('Helvetica')
          .fillColor('#4B5563')
          .text(invoice.tenant.email, 50, yPos);

        if (invoice.tenant.phone) {
          yPos += 16;
          doc.text(invoice.tenant.phone, 50, yPos);
        }

        // Property (right side)
        let rightYPos = 140;

        doc
          .fontSize(10)
          .font('Helvetica-Bold')
          .fillColor('#6B7280')
          .text('PROPERTY', 320, rightYPos);

        rightYPos += 18;

        doc
          .fontSize(14)
          .font('Helvetica-Bold')
          .fillColor('#1F2937')
          .text(invoice.property.name, 320, rightYPos);

        if (invoice.property.address) {
          rightYPos += 18;
          doc
            .fontSize(11)
            .font('Helvetica')
            .fillColor('#4B5563')
            .text(`${invoice.property.address.city}, ${invoice.property.address.state}`, 320, rightYPos);
        }

        if (invoice.unit) {
          rightYPos += 16;
          doc.text(`Unit ${invoice.unit.unitNumber}`, 320, rightYPos);
        }

        yPos = Math.max(yPos, rightYPos) + 35;

        // Dates
        doc
          .roundedRect(50, yPos, 150, 50, 6)
          .fill('#F9FAFB');

        doc
          .fontSize(9)
          .font('Helvetica')
          .fillColor('#6B7280')
          .text('Issue Date', 60, yPos + 10);

        doc
          .fontSize(11)
          .font('Helvetica-Bold')
          .fillColor('#1F2937')
          .text(formatDate(invoice.issueDate), 60, yPos + 26);

        doc
          .roundedRect(220, yPos, 150, 50, 6)
          .fill('#F9FAFB');

        doc
          .fontSize(9)
          .font('Helvetica')
          .fillColor('#6B7280')
          .text('Due Date', 230, yPos + 10);

        doc
          .fontSize(11)
          .font('Helvetica-Bold')
          .fillColor('#1F2937')
          .text(formatDate(invoice.dueDate), 230, yPos + 26);

        if (invoice.status === 'paid' && invoice.paidAt) {
          doc
            .roundedRect(390, yPos, 150, 50, 6)
            .fill('#D1FAE5');

          doc
            .fontSize(9)
            .font('Helvetica')
            .fillColor('#047857')
            .text('Paid On', 400, yPos + 10);

          doc
            .fontSize(11)
            .font('Helvetica-Bold')
            .fillColor('#047857')
            .text(formatDate(invoice.paidAt), 400, yPos + 26);
        }

        yPos += 75;

        // Line Items Header
        doc
          .fontSize(10)
          .font('Helvetica-Bold')
          .fillColor('#6B7280')
          .text('LINE ITEMS', 50, yPos);

        yPos += 20;

        // Table Header
        doc
          .fontSize(10)
          .font('Helvetica-Bold')
          .fillColor('#6B7280')
          .text('Description', 50, yPos)
          .text('Qty', 300, yPos, { width: 50, align: 'center' })
          .text('Rate', 360, yPos, { width: 80, align: 'right' })
          .text('Amount', 460, yPos, { width: 85, align: 'right' });

        yPos += 15;

        doc
          .moveTo(50, yPos)
          .lineTo(545, yPos)
          .strokeColor('#E5E7EB')
          .lineWidth(2)
          .stroke();

        yPos += 10;

        // Line Items
        invoice.lineItems.forEach((item) => {
          doc
            .fontSize(11)
            .font('Helvetica')
            .fillColor('#1F2937')
            .text(item.description, 50, yPos, { width: 230 })
            .text(item.quantity.toString(), 300, yPos, { width: 50, align: 'center' })
            .text(formatCurrency(item.rate), 360, yPos, { width: 80, align: 'right' });

          doc
            .font('Helvetica-Bold')
            .text(formatCurrency(item.amount), 460, yPos, { width: 85, align: 'right' });

          yPos += 25;

          doc
            .moveTo(50, yPos - 5)
            .lineTo(545, yPos - 5)
            .strokeColor('#E5E7EB')
            .lineWidth(1)
            .stroke();
        });

        yPos += 15;

        // Totals
        const totalsX = 360;

        doc
          .fontSize(11)
          .font('Helvetica')
          .fillColor('#6B7280')
          .text('Subtotal', totalsX, yPos)
          .font('Helvetica-Bold')
          .fillColor('#1F2937')
          .text(formatCurrency(invoice.subtotal), 460, yPos, { width: 85, align: 'right' });

        yPos += 20;

        doc
          .font('Helvetica')
          .fillColor('#6B7280')
          .text(`VAT (${(invoice.taxRate * 100).toFixed(1)}%)`, totalsX, yPos)
          .font('Helvetica-Bold')
          .fillColor('#1F2937')
          .text(formatCurrency(invoice.taxAmount), 460, yPos, { width: 85, align: 'right' });

        yPos += 20;

        doc
          .moveTo(totalsX, yPos)
          .lineTo(545, yPos)
          .strokeColor('#E5E7EB')
          .lineWidth(2)
          .stroke();

        yPos += 15;

        doc
          .fontSize(14)
          .font('Helvetica-Bold')
          .fillColor('#111827')
          .text('Total', totalsX, yPos)
          .text(formatCurrency(invoice.total), 460, yPos, { width: 85, align: 'right' });

        yPos += 35;

        // Notes
        if (invoice.notes) {
          doc
            .roundedRect(50, yPos, pageWidth, 80, 6)
            .fill('#F9FAFB');

          doc
            .fontSize(10)
            .font('Helvetica-Bold')
            .fillColor('#6B7280')
            .text('NOTES', 60, yPos + 12);

          doc
            .fontSize(11)
            .font('Helvetica')
            .fillColor('#4B5563')
            .text(invoice.notes, 60, yPos + 30, {
              width: pageWidth - 20,
              lineGap: 4,
            });
        }

        // Footer
        const footerY = doc.page.height - 60;

        doc
          .moveTo(50, footerY - 10)
          .lineTo(545, footerY - 10)
          .strokeColor('#E5E7EB')
          .lineWidth(1)
          .stroke();

        doc
          .fontSize(10)
          .font('Helvetica')
          .fillColor('#9CA3AF')
          .text('Generated by Property360', 50, footerY, {
            width: pageWidth,
            align: 'center',
          });

        doc.end();
      } catch (error) {
        reject(error);
      }
    });
  }
}
