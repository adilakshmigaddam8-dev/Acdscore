const PDFDocument = require('pdfkit');
const AcademicRecord = require('../models/AcademicRecord');
const Calculation = require('../models/Calculation');

// POST /api/reports/generate
const generateReport = async (req, res, next) => {
  try {
    const user = req.user;
    const records = await AcademicRecord.find({ userId: user._id }).sort({ semester: 1 });
    const recentCalcs = await Calculation.find({ userId: user._id }).sort({ createdAt: -1 }).limit(10);

    const doc = new PDFDocument({ margin: 50, size: 'A4' });

    // Set response headers
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="AcadScore_Report_${user.name.replace(/\s/g, '_')}.pdf"`);

    doc.pipe(res);

    // ── Header ──────────────────────────────────────────────────────────
    doc.rect(0, 0, doc.page.width, 90).fill('#1a56db');
    doc.fillColor('#ffffff').fontSize(26).font('Helvetica-Bold').text('AcadScore', 50, 25);
    doc.fontSize(11).font('Helvetica').text('Academic & Financial Report', 50, 58);
    doc.text(`Generated: ${new Date().toLocaleDateString('en-IN')}`, { align: 'right' });
    doc.moveDown(3);

    // ── User Info ──────────────────────────────────────────────────────
    doc.fillColor('#0f172a').fontSize(14).font('Helvetica-Bold').text('Student Details');
    doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke('#1a56db');
    doc.moveDown(0.5);
    doc.fontSize(11).font('Helvetica').fillColor('#334155');
    doc.text(`Name: ${user.name}`, { continued: true }).text(`   Email: ${user.email}`, { align: 'right' });
    doc.text(`Member Since: ${new Date(user.createdAt).toLocaleDateString('en-IN')}`);
    doc.moveDown(1.5);

    // ── Academic Summary ───────────────────────────────────────────────
    doc.fillColor('#0f172a').fontSize(14).font('Helvetica-Bold').text('Academic Summary');
    doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke('#1a56db');
    doc.moveDown(0.5);

    if (records.length === 0) {
      doc.fontSize(11).font('Helvetica').fillColor('#94a3b8').text('No academic records found.');
    } else {
      const cgpa = (records.reduce((s, r) => s + r.sgpa, 0) / records.length).toFixed(2);
      const percentage = (cgpa * 9.5).toFixed(2);

      // Summary row
      doc.fontSize(11).font('Helvetica').fillColor('#334155');
      doc.text(`Semesters Recorded: ${records.length}`, { continued: true });
      doc.text(`   Overall CGPA: ${cgpa}`, { continued: true });
      doc.text(`   Percentage: ${percentage}%`);
      doc.moveDown(0.8);

      // Table header
      const colX = [50, 150, 250, 360, 455];
      doc.fontSize(10).font('Helvetica-Bold').fillColor('#1a56db');
      doc.text('Semester', colX[0], doc.y, { width: 90 });
      doc.text('SGPA', colX[1], doc.y - doc.currentLineHeight(), { width: 90 });
      doc.text('Credits', colX[2], doc.y - doc.currentLineHeight(), { width: 90 });
      doc.text('CGPA', colX[3], doc.y - doc.currentLineHeight(), { width: 90 });
      doc.text('Percentage', colX[4], doc.y - doc.currentLineHeight(), { width: 90 });
      doc.moveDown(0.3);
      doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke('#dde5f7');

      records.forEach((r, i) => {
        const rowY = doc.y + 4;
        if (i % 2 === 0) doc.rect(50, rowY - 2, 495, 18).fill('#f8faff');
        doc.fillColor('#334155').fontSize(10).font('Helvetica');
        doc.text(`Semester ${r.semester}`, colX[0], rowY, { width: 90 });
        doc.text(r.sgpa.toFixed(2), colX[1], rowY, { width: 90 });
        doc.text(r.credits || '-', colX[2], rowY, { width: 90 });
        doc.text(r.cgpa ? r.cgpa.toFixed(2) : cgpa, colX[3], rowY, { width: 90 });
        doc.text(r.percentage ? `${r.percentage.toFixed(1)}%` : `${(r.sgpa * 9.5).toFixed(1)}%`, colX[4], rowY, { width: 90 });
        doc.moveDown(0.1);
      });
    }

    doc.moveDown(2);

    // ── Recent Calculations ────────────────────────────────────────────
    doc.fillColor('#0f172a').fontSize(14).font('Helvetica-Bold').text('Recent Calculations');
    doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke('#1a56db');
    doc.moveDown(0.5);

    if (recentCalcs.length === 0) {
      doc.fontSize(11).font('Helvetica').fillColor('#94a3b8').text('No calculations yet.');
    } else {
      recentCalcs.forEach((c) => {
        doc.fontSize(10).font('Helvetica').fillColor('#334155');
        const label = c.calculatorType.replace(/_/g, ' ').toUpperCase();
        const date = new Date(c.createdAt).toLocaleDateString('en-IN');
        doc.text(`• [${date}] ${label}: ${JSON.stringify(c.result)}`);
        doc.moveDown(0.2);
      });
    }

    // ── Footer ─────────────────────────────────────────────────────────
    doc.moveDown(3);
    doc.rect(0, doc.page.height - 50, doc.page.width, 50).fill('#f0f4ff');
    doc.fillColor('#94a3b8').fontSize(9).text(
      '© AcadScore – This report is auto-generated. For official records, contact your institution.',
      50,
      doc.page.height - 35,
      { align: 'center' }
    );

    doc.end();
  } catch (error) {
    next(error);
  }
};

module.exports = { generateReport };
