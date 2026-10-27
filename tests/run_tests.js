const path = require('path');
const fs = require('fs');
const assert = require('assert');

// Import system modules
const { validateFile } = require('../backend/src/fileValidator');
const { parsePdf } = require('../backend/src/pdfParser');
const { parseSpreadsheet } = require('../backend/src/spreadsheetParser');
const { extractInvoiceData, deterministicExtraction } = require('../backend/src/aiExtractor');
const { validateExtraction } = require('../backend/src/validationEngine');
const { crossVerifyDocuments } = require('../backend/src/crossVerificationEngine');
const searchEngine = require('../backend/src/searchEngine');
const db = require('../backend/src/database');

const DATASET_DIR = path.join(__dirname, '..', 'dataset');

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

function runTest(testName, fn) {
  totalTests++;
  try {
    fn();
    console.log(`  [PASS] ${testName}`);
    passedTests++;
  } catch (err) {
    console.error(`  [FAIL] ${testName}`);
    console.error(`         Error: ${err.message}`);
    failedTests++;
  }
}

async function runAsyncTest(testName, fn) {
  totalTests++;
  try {
    await fn();
    console.log(`  [PASS] ${testName}`);
    passedTests++;
  } catch (err) {
    console.error(`  [FAIL] ${testName}`);
    console.error(`         Error: ${err.message}`);
    failedTests++;
  }
}

async function main() {
  console.log('\n=============================================================');
  console.log('AI-POWERED DOCUMENT INTELLIGENCE SYSTEM - AUTOMATED TEST SUITE');
  console.log('=============================================================\n');

  // Test Group 1: File Ingestion & Corruption Guards
  console.log('--- Test Group 1: Ingestion & Corrupted File Guard ---');
  runTest('Should validate valid CSV file structure', () => {
    const res = validateFile(path.join(DATASET_DIR, 'invoice_apex_cloud.csv'), 'invoice_apex_cloud.csv');
    assert.strictEqual(res.isValid, true);
    assert.strictEqual(res.fileType, 'csv');
  });

  runTest('Should validate valid multi-sheet XLSX file structure', () => {
    const res = validateFile(path.join(DATASET_DIR, 'nexus_hardware_multisheet.xlsx'), 'nexus_hardware_multisheet.xlsx');
    assert.strictEqual(res.isValid, true);
    assert.strictEqual(res.fileType, 'xlsx');
  });

  runTest('Should detect and reject corrupted binary file', () => {
    const res = validateFile(path.join(DATASET_DIR, 'corrupted_document.bin'), 'corrupted_document.bin');
    assert.strictEqual(res.isValid, false);
    assert.strictEqual(res.error, 'CORRUPTED_FILE');
  });

  // Test Group 2: Document Processing Pipelines
  console.log('\n--- Test Group 2: PDF & Multi-Sheet Spreadsheet Parsing ---');
  await runAsyncTest('Should parse digital PDF, count pages, and extract text', async () => {
    const pdfPath = path.join(DATASET_DIR, 'sample_document.pdf');
    const res = await parsePdf(pdfPath);
    assert.strictEqual(res.success, true);
    assert.strictEqual(res.pageCount, 1);
    assert.ok(res.rawText.length > 500, 'Extracted text should be present');
  });

  runTest('Should parse multi-sheet Excel and preserve individual sheet data', () => {
    const xlsxPath = path.join(DATASET_DIR, 'nexus_hardware_multisheet.xlsx');
    const res = parseSpreadsheet(xlsxPath);
    assert.strictEqual(res.success, true);
    assert.strictEqual(res.sheetCount, 2);
    assert.strictEqual(res.sheets[0].name, 'Invoice_Summary');
    assert.strictEqual(res.sheets[1].name, 'Accounting_Ledger');
    assert.ok(res.rawText.includes('Nexus Enterprise Hardware'));
  });

  // Test Group 3: AI Information Extraction
  console.log('\n--- Test Group 3: AI Information Extraction (Task 2) ---');
  await runAsyncTest('Should extract structured fields from invoice text without hallucination', async () => {
    const sampleText = `
      Invoice Number: INV-2026-001
      Date: 2026-10-15
      Vendor: Apex Cloud Solutions Inc.
      Bill To: Global Logistics Corp.
      Item: Cloud Server Compute Hours, 10, 25.00, 250.00
      Subtotal: $400.00
      Tax: $40.00
      Total: $440.00
    `;
    const res = await extractInvoiceData(sampleText);
    assert.strictEqual(res.invoice_number, 'INV-2026-001');
    assert.strictEqual(res.invoice_date, '2026-10-15');
    assert.strictEqual(res.supplier_name, 'Apex Cloud Solutions Inc.');
    assert.strictEqual(res.subtotal, 400.00);
    assert.strictEqual(res.tax, 40.00);
    assert.strictEqual(res.total, 440.00);
    assert.strictEqual(res.currency, 'USD');
  });

  runTest('Should handle missing fields cleanly by returning null without inventing values', () => {
    const incompleteText = `
      Company: Minimal Services
      Total: $50.00
    `;
    const res = deterministicExtraction(incompleteText);
    assert.strictEqual(res.invoice_number, null, 'Uncertain invoice_number must be null');
    assert.strictEqual(res.invoice_date, null, 'Uncertain invoice_date must be null');
    assert.strictEqual(res.subtotal, null, 'Missing subtotal must be null');
    assert.strictEqual(res.total, 50.00);
  });

  // Test Group 4: Data Validation Engine (Task 3)
  console.log('\n--- Test Group 4: Data Validation & Math Consistency (Task 3) ---');
  runTest('Should flag mathematical discrepancy between Subtotal, Tax, and Total', () => {
    const faultyExtraction = {
      invoice_number: 'INV-FAIL-999',
      invoice_date: '2026-10-18',
      supplier_name: 'Faulty Hardware Co.',
      customer_name: 'Alpha Industries',
      subtotal: 500.00,
      tax: 50.00,
      total: 600.00, // Discrepancy: 500 + 50 = 550 != 600
      confidence_score: 0.95
    };
    const val = validateExtraction(faultyExtraction, []);
    assert.strictEqual(val.is_valid, false);
    assert.strictEqual(val.requires_manual_review, true);
    const mathErr = val.errors.find(e => e.rule === 'MATH_INCONSISTENCY_TOTAL');
    assert.ok(mathErr, 'Should detect MATH_INCONSISTENCY_TOTAL');
  });

  runTest('Should detect duplicate invoices by supplier name and invoice number', () => {
    const existing = [
      {
        id: 'doc-1',
        extraction: {
          invoice_number: 'INV-2026-001',
          supplier_name: 'Apex Cloud Solutions Inc.',
          total: 440.00
        }
      }
    ];
    const incoming = {
      invoice_number: 'INV-2026-001',
      invoice_date: '2026-10-15',
      supplier_name: 'Apex Cloud Solutions Inc.',
      total: 440.00
    };
    const val = validateExtraction(incoming, existing);
    const dupWarning = val.errors.find(e => e.rule === 'DUPLICATE_INVOICE_DETECTED');
    assert.ok(dupWarning, 'Should flag duplicate invoice warning');
    assert.strictEqual(val.requires_manual_review, true);
  });

  // Test Group 5: Cross-Verification Engine (PDF-PDF & PDF-Excel)
  console.log('\n--- Test Group 5: Cross-Verification Engine ---');
  runTest('Should reconcile matching documents and identify variances', () => {
    const docA = {
      id: 'doc-A',
      original_name: 'invoice_apex_cloud.csv',
      file_type: 'csv',
      extraction: {
        supplier_name: 'Apex Cloud Solutions Inc.',
        invoice_number: 'INV-2026-001',
        total: 440.00,
        line_items: [{ description: 'Cloud Server Compute Hours', amount: 250.00 }]
      }
    };
    const docB = {
      id: 'doc-B',
      original_name: 'accounting_ledger.xlsx',
      file_type: 'xlsx',
      extraction: {
        supplier_name: 'Apex Cloud Solutions Inc.',
        invoice_number: 'INV-2026-001',
        total: 440.00,
        line_items: [{ description: 'Cloud Server Compute Hours', amount: 250.00 }]
      }
    };
    const report = crossVerifyDocuments(docA, docB);
    assert.strictEqual(report.verificationStatus, 'MATCH');
    assert.strictEqual(report.matchScore, 100);
    assert.strictEqual(report.discrepancies.length, 0);
  });

  // Test Group 6: Search & Semantic Indexing (Task 5)
  console.log('\n--- Test Group 6: Keyword & Semantic Search (Task 5) ---');
  runTest('Should perform keyword filtering on extracted invoice entities', () => {
    const sampleDocs = [
      { id: '1', original_name: 'apex.csv', extraction: { supplier_name: 'Apex Cloud Solutions', total: 400 } },
      { id: '2', original_name: 'nexus.xlsx', extraction: { supplier_name: 'Nexus Hardware', total: 1309 } }
    ];
    const results = searchEngine.keywordSearch(sampleDocs, 'Nexus');
    assert.strictEqual(results.length, 1);
    assert.strictEqual(results[0].id, '2');
  });

  runTest('Should perform semantic search matching conceptual queries', () => {
    const sampleDocs = [
      { id: '1', original_name: 'cloud_bill.pdf', raw_text: 'Cloud compute server hosting infrastructure bandwidth AWS' },
      { id: '2', original_name: 'office_supplies.pdf', raw_text: 'Paper pens stapler desks chairs office furniture stationery' }
    ];
    const results = searchEngine.semanticSearch(sampleDocs, 'cloud hosting server infrastructure');
    assert.ok(results.length > 0);
    assert.strictEqual(results[0].id, '1', 'Cloud compute document should rank highest');
  });

  // Test Group 7: Database & HITL Manual Correction Audit Trail
  console.log('\n--- Test Group 7: Database & Manual Correction Audit Log ---');
  runTest('Should record manual corrections and audit trail', () => {
    db.clearAll();
    const doc = db.insertDocument({
      id: 'test-doc-001',
      original_name: 'test.pdf',
      file_type: 'pdf',
      status: 'completed'
    });
    db.saveExtraction('test-doc-001', {
      invoice_number: 'INV-TEST',
      total: 100.00
    });

    const audit = db.recordCorrection('test-doc-001', 'total', 100.00, 150.00, 'Senior Auditor');
    assert.strictEqual(audit.document_id, 'test-doc-001');
    assert.strictEqual(audit.field, 'total');
    assert.strictEqual(audit.original_value, 100.00);
    assert.strictEqual(audit.corrected_value, 150.00);

    const updatedDoc = db.getDocument('test-doc-001');
    assert.strictEqual(updatedDoc.extraction.total, 150.00);
    assert.strictEqual(updatedDoc.audit_logs.length, 1);
  });

  console.log('\n=============================================================');
  console.log(`TEST EXECUTION SUMMARY: ${passedTests}/${totalTests} TESTS PASSED`);
  if (failedTests > 0) {
    console.log(`WARNING: ${failedTests} test(s) failed.`);
    process.exit(1);
  } else {
    console.log('ALL TESTS EXECUTED SUCCESSFULLY [100% PASS RATE]');
  }
  console.log('=============================================================\n');
}

main();
