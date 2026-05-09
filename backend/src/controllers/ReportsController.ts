import { Response, NextFunction } from 'express';
import PDFDocument from 'pdfkit';
import ReportsService, { ReportPeriod } from '../services/ReportsService';
import { AuthRequest, ApiResponse } from '../types';

const VALID_PERIODS: ReportPeriod[] = ['this_month', 'last_month', 'this_year', 'last_year', 'last_12m'];

function parsePeriod(raw: unknown): ReportPeriod {
  if (typeof raw === 'string' && (VALID_PERIODS as string[]).includes(raw)) {
    return raw as ReportPeriod;
  }
  return 'this_year';
}

function formatNgn(amount: number): string {
  return `₦${amount.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export class ReportsController {
  /** GET /reports/summary */
  async getSummary(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const summary = await ReportsService.getSummary({
        landlordId: req.user!._id.toString(),
        period: parsePeriod(req.query.period),
        propertyId: typeof req.query.propertyId === 'string' ? req.query.propertyId : undefined,
      });

      const response: ApiResponse = {
        success: true,
        message: 'Report retrieved successfully',
        data: summary,
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  /** GET /reports/balance-sheet */
  async getBalanceSheet(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const balanceSheet = await ReportsService.getBalanceSheet(req.user!._id.toString());
      const response: ApiResponse = {
        success: true,
        message: 'Balance sheet retrieved successfully',
        data: balanceSheet,
      };
      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  /** GET /reports/cash-flow */
  async getCashFlow(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const cashFlow = await ReportsService.getCashFlow({
        landlordId: req.user!._id.toString(),
        period: parsePeriod(req.query.period),
      });
      const response: ApiResponse = {
        success: true,
        message: 'Cash flow retrieved successfully',
        data: cashFlow,
      };
      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  /** GET /reports/summary.csv */
  async getSummaryCsv(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const period = parsePeriod(req.query.period);
      const csv = await ReportsService.getTransactionsCsv({
        landlordId: req.user!._id.toString(),
        period,
        propertyId: typeof req.query.propertyId === 'string' ? req.query.propertyId : undefined,
      });

      const filename = `property360-report-${period}.csv`;
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.status(200).send(csv);
    } catch (error) {
      next(error);
    }
  }

  /** GET /reports/summary.pdf */
  async getSummaryPdf(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const period = parsePeriod(req.query.period);
      const summary = await ReportsService.getSummary({
        landlordId: req.user!._id.toString(),
        period,
        propertyId: typeof req.query.propertyId === 'string' ? req.query.propertyId : undefined,
      });

      const doc = new PDFDocument({
        size: 'A4',
        margin: 50,
        info: { Title: `Property360 Report — ${summary.period.label}`, Author: 'Property360' },
      });

      const buffers: Buffer[] = [];
      doc.on('data', (chunk: Buffer) => buffers.push(chunk));
      doc.on('end', () => {
        const filename = `property360-report-${period}.pdf`;
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.status(200).send(Buffer.concat(buffers));
      });
      doc.on('error', next);

      // Header
      doc
        .fontSize(24)
        .font('Helvetica-Bold')
        .fillColor('#111827')
        .text('Financial report', 50, 50);

      doc
        .fontSize(11)
        .font('Helvetica')
        .fillColor('#6B7280')
        .text(summary.period.label, 50, 82);

      // Generated stamp on the right
      doc
        .fontSize(9)
        .fillColor('#9CA3AF')
        .text(`Generated ${new Date().toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })}`, 350, 86, { width: 195, align: 'right' });

      // Divider
      doc.moveTo(50, 110).lineTo(545, 110).strokeColor('#E5E7EB').lineWidth(1).stroke();

      // Summary cards
      let y = 130;
      const cardW = 158;
      const cardH = 70;

      const drawCard = (x: number, label: string, value: string, color: string) => {
        doc.roundedRect(x, y, cardW, cardH, 8).fillAndStroke('#F9FAFB', '#E5E7EB');
        doc.fontSize(9).font('Helvetica-Bold').fillColor('#6B7280').text(label, x + 14, y + 12);
        doc.fontSize(18).font('Helvetica-Bold').fillColor(color).text(value, x + 14, y + 32, { width: cardW - 28 });
      };

      drawCard(50, 'INCOME', formatNgn(summary.income.total), '#10B981');
      drawCard(50 + cardW + 10, 'EXPENSES', formatNgn(summary.expense.total), '#EF4444');
      drawCard(50 + (cardW + 10) * 2, 'NET PROFIT', formatNgn(summary.netProfit), summary.netProfit >= 0 ? '#10B981' : '#EF4444');

      y += cardH + 30;

      // Income section
      doc.fontSize(13).font('Helvetica-Bold').fillColor('#111827').text('Income', 50, y);
      y += 22;
      doc.moveTo(50, y).lineTo(545, y).strokeColor('#E5E7EB').lineWidth(1).stroke();
      y += 8;

      if (summary.income.byCategory.length === 0) {
        doc.fontSize(10).font('Helvetica').fillColor('#9CA3AF').text('No income recorded for this period.', 50, y);
        y += 22;
      } else {
        for (const cat of summary.income.byCategory) {
          doc.fontSize(11).font('Helvetica').fillColor('#374151').text(cat.label, 50, y);
          doc.fontSize(11).font('Helvetica-Bold').fillColor('#111827').text(formatNgn(cat.amount), 50, y, { width: 495, align: 'right' });
          y += 20;
        }
        doc.moveTo(50, y).lineTo(545, y).strokeColor('#E5E7EB').lineWidth(1).stroke();
        y += 8;
        doc.fontSize(11).font('Helvetica-Bold').fillColor('#111827').text('Total income', 50, y);
        doc.fontSize(11).font('Helvetica-Bold').fillColor('#10B981').text(formatNgn(summary.income.total), 50, y, { width: 495, align: 'right' });
        y += 30;
      }

      // Expenses section
      doc.fontSize(13).font('Helvetica-Bold').fillColor('#111827').text('Expenses', 50, y);
      y += 22;
      doc.moveTo(50, y).lineTo(545, y).strokeColor('#E5E7EB').lineWidth(1).stroke();
      y += 8;

      if (summary.expense.byCategory.length === 0) {
        doc.fontSize(10).font('Helvetica').fillColor('#9CA3AF').text('No expenses recorded for this period.', 50, y);
        y += 22;
      } else {
        for (const cat of summary.expense.byCategory) {
          doc.fontSize(11).font('Helvetica').fillColor('#374151').text(cat.label, 50, y);
          doc.fontSize(11).font('Helvetica-Bold').fillColor('#111827').text(formatNgn(cat.amount), 50, y, { width: 495, align: 'right' });
          y += 20;
        }
        doc.moveTo(50, y).lineTo(545, y).strokeColor('#E5E7EB').lineWidth(1).stroke();
        y += 8;
        doc.fontSize(11).font('Helvetica-Bold').fillColor('#111827').text('Total expenses', 50, y);
        doc.fontSize(11).font('Helvetica-Bold').fillColor('#EF4444').text(formatNgn(summary.expense.total), 50, y, { width: 495, align: 'right' });
        y += 30;
      }

      // Net pill
      const netColor = summary.netProfit >= 0 ? '#10B981' : '#EF4444';
      doc.roundedRect(50, y, 495, 50, 8).fillAndStroke(netColor + '15', netColor);
      doc.fontSize(11).font('Helvetica-Bold').fillColor(netColor).text('NET PROFIT', 64, y + 18);
      doc.fontSize(18).font('Helvetica-Bold').fillColor(netColor).text(formatNgn(summary.netProfit), 64, y + 14, { width: 467, align: 'right' });

      // Footer
      doc
        .fontSize(8)
        .fillColor('#9CA3AF')
        .text(
          `${summary.transactionCount} transaction${summary.transactionCount === 1 ? '' : 's'} included · Property360`,
          50,
          780,
          { width: 495, align: 'center' }
        );

      doc.end();
    } catch (error) {
      next(error);
    }
  }
}

export default new ReportsController();
