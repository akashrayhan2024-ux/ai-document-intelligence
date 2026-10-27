const fs = require('fs');
const path = require('path');

class SimplePdfDoc {
  constructor() {
    this.width = 595.28;
    this.height = 841.89;
    this.commands = [];
  }

  drawText(text, x, y, font = 'F1', size = 10) {
    const safeText = text.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
    this.commands.push(`BT /${font} ${size} Tf ${x.toFixed(2)} ${y.toFixed(2)} Td (${safeText}) Tj ET`);
  }

  buildPdf() {
    const streamContent = this.commands.join('\n');
    const streamLen = Buffer.byteLength(streamContent, 'binary');

    let pdf = '';
    const offsets = [];

    function addObj(content) {
      offsets.push(Buffer.byteLength(pdf, 'binary'));
      pdf += `${offsets.length} 0 obj\n${content}\nendobj\n`;
    }

    pdf += '%PDF-1.4\n';
    pdf += '%\xE2\xE3\xCF\xD3\n';

    addObj('<< /Type /Catalog /Pages 2 0 R >>');
    addObj('<< /Type /Pages /Kids [3 0 R] /Count 1 >>');
    addObj(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${this.width} ${this.height}] /Resources << /Font << /F1 4 0 R /F2 5 0 R /F3 6 0 R >> >> /Contents 7 0 R >>`);
    addObj('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>');
    addObj('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>');
    addObj('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Oblique /Encoding /WinAnsiEncoding >>');
    addObj(`<< /Length ${streamLen} >>\nstream\n${streamContent}\nendstream`);

    const startXref = Buffer.byteLength(pdf, 'binary');
    pdf += 'xref\n';
    pdf += `0 ${offsets.length + 1}\n`;
    pdf += '0000000000 65535 f \n';
    for (let i = 0; i < offsets.length; i++) {
      pdf += offsets[i].toString().padStart(10, '0') + ' 00000 n \n';
    }
    pdf += `trailer\n<< /Size ${offsets.length + 1} /Root 1 0 R >>\nstartxref\n${startXref}\n%%EOF\n`;

    return Buffer.from(pdf, 'binary');
  }
}

const doc = new SimplePdfDoc();
doc.drawText('COMMERCIAL INVOICE', 50, 780, 'F2', 18);
doc.drawText('Invoice Number: INV-90412', 50, 750, 'F1', 10);
doc.drawText('Invoice Date: 2026-10-20', 50, 735, 'F1', 10);
doc.drawText('Supplier: Vertex AI Solutions LLC', 50, 720, 'F1', 10);
doc.drawText('Bill To: Horizon Robotics Corp.', 50, 705, 'F1', 10);
doc.drawText('Item Description, Quantity, Unit Price, Amount', 50, 670, 'F2', 9);
doc.drawText('AI Model Fine-tuning Cluster, 4, 250.00, 1000.00', 50, 650, 'F1', 9);
doc.drawText('Vector Database Provisioning, 1, 350.00, 350.00', 50, 635, 'F1', 9);
doc.drawText('Subtotal: $1350.00', 50, 590, 'F1', 10);
doc.drawText('Tax: $135.00', 50, 575, 'F1', 10);
doc.drawText('Total: $1485.00', 50, 550, 'F2', 12);

const dest = path.join(__dirname, 'sample_invoice.pdf');
fs.writeFileSync(dest, doc.buildPdf());
console.log('Sample PDF created at:', dest);
