const db = require('./database');
const { validateFile } = require('./fileValidator');
const { parsePdf } = require('./pdfParser');
const { performOcr } = require('./ocrParser');
const { parseSpreadsheet } = require('./spreadsheetParser');
const { extractInvoiceData } = require('./aiExtractor');
const { validateExtraction } = require('./validationEngine');

/**
 * Background Asynchronous Processing Queue
 * Ensures heavy OCR, parsing, and LLM extraction do not block the API thread.
 */
class ProcessingQueue {
  constructor() {
    this.queue = [];
    this.isProcessing = false;
    this.concurrency = 2;
    this.activeWorkers = 0;
  }

  enqueue(docId) {
    this.queue.push(docId);
    db.logHistory(docId, 'QUEUED', 'Document queued for background processing.');
    this.processNext();
  }

  async processNext() {
    if (this.activeWorkers >= this.concurrency || this.queue.length === 0) {
      return;
    }

    const docId = this.queue.shift();
    this.activeWorkers++;

    try {
      await this.executePipeline(docId);
    } catch (err) {
      console.error(`[Queue] Failed processing document ${docId}:`, err);
    } finally {
      this.activeWorkers--;
      this.processNext();
    }
  }

  async executePipeline(docId) {
    const doc = db.getDocument(docId);
    if (!doc) return;

    db.updateDocument(docId, { status: 'processing' });
    db.logHistory(docId, 'PROCESSING_STARTED', 'Extraction pipeline engaged.');

    try {
      // 1. Validate File
      const val = validateFile(doc.file_path, doc.original_name);
      if (!val.isValid) {
        db.updateDocument(docId, {
          status: 'failed',
          error_message: `${val.error}: ${val.message}`
        });
        db.logHistory(docId, 'PIPELINE_FAILED', val.message);
        return;
      }

      // 2. Parse Content based on file type
      let rawText = '';
      let pageCount = 1;

      if (val.fileType === 'pdf') {
        const pdfRes = await parsePdf(doc.file_path);
        pageCount = pdfRes.pageCount;
        rawText = pdfRes.rawText;

        // If PDF is scanned, run OCR
        if (pdfRes.isScanned || rawText.length < 50) {
          db.logHistory(docId, 'OCR_TRIGGERED', 'Scanned PDF detected. Triggering OCR engine.');
          const ocrRes = await performOcr(doc.file_path);
          if (ocrRes.rawText) {
            rawText = ocrRes.rawText;
          }
        }
      } else if (['jpg', 'png', 'tiff'].includes(val.fileType)) {
        db.logHistory(docId, 'OCR_STARTED', `Running OCR on ${val.fileType.toUpperCase()} image.`);
        const ocrRes = await performOcr(doc.file_path);
        rawText = ocrRes.rawText;
      } else if (['xlsx', 'xls', 'csv'].includes(val.fileType)) {
        const sheetRes = parseSpreadsheet(doc.file_path);
        rawText = sheetRes.rawText;
        pageCount = sheetRes.sheetCount;
      }

      db.updateDocument(docId, {
        raw_text: rawText,
        page_count: pageCount
      });

      // 3. AI Information Extraction
      db.logHistory(docId, 'AI_EXTRACTION', 'Extracting structured fields via AI model.');
      const extraction = await extractInvoiceData(rawText);
      db.saveExtraction(docId, extraction);

      // 4. Data Validation Rules
      const allDocs = db.getAllDocuments();
      const validation = validateExtraction(extraction, allDocs, docId, doc.original_name);
      db.saveValidation(docId, validation);

      // 5. Finalize status
      db.updateDocument(docId, { status: 'completed' });
      db.logHistory(docId, 'JOB_COMPLETED', 'Pipeline executed successfully.');

    } catch (err) {
      db.updateDocument(docId, {
        status: 'failed',
        error_message: err.message
      });
      db.logHistory(docId, 'PIPELINE_ERROR', err.message);
    }
  }

  reprocess(docId) {
    db.updateDocument(docId, {
      status: 'queued',
      error_message: null
    });
    this.enqueue(docId);
  }
}

module.exports = new ProcessingQueue();
