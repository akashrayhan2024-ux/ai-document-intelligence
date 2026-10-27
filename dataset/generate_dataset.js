const fs = require('fs');
const path = require('path');
const XLSX = require(path.join(__dirname, '..', 'backend', 'node_modules', 'xlsx'));

const DATASET_DIR = __dirname;

// 1. Generate Standard CSV Invoice (Apex Cloud Solutions)
const invoice1Csv = `Invoice Number,INV-2026-001
Invoice Date,2026-10-15
Supplier Name,Apex Cloud Solutions Inc.
Customer Name,Global Logistics Corp.
Currency,USD

Item Description,Quantity,Unit Price,Amount
Cloud Server Compute Hours,10,25.00,250.00
Dedicated IP Allocation,2,15.00,30.00
Enterprise Support SLA,1,120.00,120.00

Subtotal,400.00
Tax (10%),40.00
Grand Total,440.00
`;
fs.writeFileSync(path.join(DATASET_DIR, 'invoice_apex_cloud.csv'), invoice1Csv, 'utf-8');

// 2. Generate Multi-Sheet Excel Ledger (Nexus Enterprise)
const wb = XLSX.utils.book_new();

// Sheet 1: Invoice Details
const sheet1Data = [
  ['Invoice Number', 'INV-88902'],
  ['Invoice Date', '2026-09-20'],
  ['Supplier Name', 'Nexus Enterprise Hardware'],
  ['Customer Name', 'Starlight Tech Ltd.'],
  ['Currency', 'USD'],
  [],
  ['Description', 'Quantity', 'Unit Price', 'Amount'],
  ['Gigabit Network Switch 24-Port', 2, 450.00, 900.00],
  ['Cat6 Ethernet Cable Spool 1000ft', 1, 150.00, 150.00],
  ['Server Rack Mounting Rails', 4, 35.00, 140.00],
  [],
  ['Subtotal', '', '', 1190.00],
  ['Tax', '', '', 119.00],
  ['Total', '', '', 1309.00]
];
const ws1 = XLSX.utils.aoa_to_sheet(sheet1Data);
XLSX.utils.book_append_sheet(wb, ws1, 'Invoice_Summary');

// Sheet 2: Internal Accounting Reconciliation Sheet
const sheet2Data = [
  ['Ref Code', 'Vendor', 'Invoice Ref', 'Expected Amount', 'Reconciliation Status'],
  ['REF-001', 'Nexus Enterprise Hardware', 'INV-88902', 1309.00, 'PENDING_VERIFICATION'],
  ['REF-002', 'Apex Cloud Solutions Inc.', 'INV-2026-001', 440.00, 'VERIFIED'],
  ['REF-003', 'Office Depot', 'INV-55421', 85.50, 'VERIFIED']
];
const ws2 = XLSX.utils.aoa_to_sheet(sheet2Data);
XLSX.utils.book_append_sheet(wb, ws2, 'Accounting_Ledger');

XLSX.writeFile(wb, path.join(DATASET_DIR, 'nexus_hardware_multisheet.xlsx'));

// 3. Generate Discrepancy Invoice (Math Inconsistency: Subtotal 500 + Tax 50 != Total 600)
const discrepancyCsv = `Invoice Number,INV-FAIL-999
Invoice Date,2026-10-18
Supplier Name,Faulty Hardware Co.
Customer Name,Alpha Industries
Currency,USD

Item Description,Quantity,Unit Price,Amount
Industrial Power Cable,5,100.00,500.00

Subtotal,500.00
Tax,50.00
Grand Total,600.00
`;
fs.writeFileSync(path.join(DATASET_DIR, 'discrepancy_invoice.csv'), discrepancyCsv, 'utf-8');

// 4. Generate Duplicate Invoice (Same supplier & invoice number as Apex Cloud)
const duplicateCsv = `Invoice Number,INV-2026-001
Invoice Date,2026-10-15
Supplier Name,Apex Cloud Solutions Inc.
Customer Name,Global Logistics Corp.
Currency,USD

Item Description,Quantity,Unit Price,Amount
Cloud Server Compute Hours,10,25.00,250.00
Dedicated IP Allocation,2,15.00,30.00
Enterprise Support SLA,1,120.00,120.00

Subtotal,400.00
Tax,40.00
Grand Total,440.00
`;
fs.writeFileSync(path.join(DATASET_DIR, 'duplicate_apex_cloud.csv'), duplicateCsv, 'utf-8');

// 5. Generate Corrupted File (Simulate truncated / corrupted binary header)
const corruptedBuffer = Buffer.from([0x00, 0x00, 0x01, 0x02, 0xFF, 0xFE]);
fs.writeFileSync(path.join(DATASET_DIR, 'corrupted_document.bin'), corruptedBuffer);

// 6. Generate Ground-Truth JSON Labels for Evaluation
const groundTruth = {
  "invoice_apex_cloud.csv": {
    "invoice_number": "INV-2026-001",
    "invoice_date": "2026-10-15",
    "supplier_name": "Apex Cloud Solutions Inc.",
    "customer_name": "Global Logistics Corp.",
    "subtotal": 400.00,
    "tax": 40.00,
    "total": 440.00,
    "currency": "USD",
    "line_items_count": 3,
    "expected_valid": true,
    "requires_manual_review": false
  },
  "nexus_hardware_multisheet.xlsx": {
    "invoice_number": "INV-88902",
    "invoice_date": "2026-09-20",
    "supplier_name": "Nexus Enterprise Hardware",
    "customer_name": "Starlight Tech Ltd.",
    "subtotal": 1190.00,
    "tax": 119.00,
    "total": 1309.00,
    "currency": "USD",
    "line_items_count": 3,
    "expected_valid": true,
    "requires_manual_review": false
  },
  "discrepancy_invoice.csv": {
    "invoice_number": "INV-FAIL-999",
    "invoice_date": "2026-10-18",
    "supplier_name": "Faulty Hardware Co.",
    "customer_name": "Alpha Industries",
    "subtotal": 500.00,
    "tax": 50.00,
    "total": 600.00,
    "currency": "USD",
    "line_items_count": 1,
    "expected_valid": false,
    "requires_manual_review": true
  },
  "duplicate_apex_cloud.csv": {
    "invoice_number": "INV-2026-001",
    "supplier_name": "Apex Cloud Solutions Inc.",
    "total": 440.00,
    "expected_duplicate": true,
    "requires_manual_review": true
  },
  "corrupted_document.bin": {
    "expected_status": "failed",
    "error_type": "CORRUPTED_FILE"
  }
};

fs.writeFileSync(
  path.join(DATASET_DIR, 'labeled_ground_truth.json'),
  JSON.stringify(groundTruth, null, 2),
  'utf-8'
);

console.log('Successfully generated labeled evaluation dataset at:', DATASET_DIR);
