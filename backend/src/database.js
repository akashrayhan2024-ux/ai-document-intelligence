const fs = require('fs');
const path = require('path');

/**
 * Enterprise Database Engine
 * Implements persistent storage for:
 * 1. Document metadata (id, filename, file_type, file_size, status, raw_text, page_count)
 * 2. Extracted structured results
 * 3. Validation results & error logs
 * 4. Human-In-The-Loop (HITL) audit logs for manual corrections
 * 5. Processing history timeline
 */

const DB_PATH = path.join(__dirname, '..', 'data', 'db.json');

class Database {
  constructor() {
    this.data = {
      documents: [],
      extractions: {},
      validations: {},
      audit_logs: [],
      processing_history: []
    };
    this.init();
  }

  init() {
    const dir = path.dirname(DB_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    if (fs.existsSync(DB_PATH)) {
      try {
        const raw = fs.readFileSync(DB_PATH, 'utf-8');
        this.data = JSON.parse(raw);
      } catch (e) {
        console.warn('[Database] Initializing fresh database, error reading existing:', e.message);
        this.persist();
      }
    } else {
      this.persist();
    }
  }

  persist() {
    const tempPath = `${DB_PATH}.tmp`;
    fs.writeFileSync(tempPath, JSON.stringify(this.data, null, 2), 'utf-8');
    fs.renameSync(tempPath, DB_PATH);
  }

  // Documents
  insertDocument(doc) {
    const newDoc = {
      id: doc.id,
      original_name: doc.original_name,
      filename: doc.filename,
      file_path: doc.file_path,
      file_type: doc.file_type,
      file_size: doc.file_size,
      page_count: doc.page_count || 1,
      status: doc.status || 'queued', // queued, processing, completed, failed
      raw_text: doc.raw_text || '',
      error_message: doc.error_message || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    this.data.documents.unshift(newDoc);
    this.logHistory(newDoc.id, 'DOCUMENT_CREATED', `File ${newDoc.original_name} ingested.`);
    this.persist();
    return newDoc;
  }

  getDocument(id) {
    const doc = this.data.documents.find(d => d.id === id);
    if (!doc) return null;
    return {
      ...doc,
      extraction: this.data.extractions[id] || null,
      validation: this.data.validations[id] || null,
      audit_logs: this.data.audit_logs.filter(a => a.document_id === id)
    };
  }

  getAllDocuments(filters = {}) {
    let results = this.data.documents.map(doc => ({
      ...doc,
      extraction: this.data.extractions[doc.id] || null,
      validation: this.data.validations[doc.id] || null
    }));

    if (filters.status) {
      results = results.filter(d => d.status === filters.status);
    }
    if (filters.requires_manual_review !== undefined) {
      const boolVal = filters.requires_manual_review === 'true' || filters.requires_manual_review === true;
      results = results.filter(d => d.validation && d.validation.requires_manual_review === boolVal);
    }
    if (filters.file_type) {
      results = results.filter(d => d.file_type === filters.file_type);
    }

    return results;
  }

  updateDocument(id, updates) {
    const idx = this.data.documents.findIndex(d => d.id === id);
    if (idx !== -1) {
      this.data.documents[idx] = {
        ...this.data.documents[idx],
        ...updates,
        updated_at: new Date().toISOString()
      };
      this.persist();
      return this.data.documents[idx];
    }
    return null;
  }

  // Extractions
  saveExtraction(docId, extraction) {
    this.data.extractions[docId] = {
      ...extraction,
      extracted_at: new Date().toISOString()
    };
    this.logHistory(docId, 'AI_EXTRACTION_COMPLETED', 'Structured fields extracted.');
    this.persist();
  }

  // Validations
  saveValidation(docId, validation) {
    this.data.validations[docId] = {
      ...validation,
      validated_at: new Date().toISOString()
    };
    this.logHistory(
      docId,
      'VALIDATION_COMPLETED',
      `Validation: ${validation.is_valid ? 'PASSED' : 'FAILED'} (${validation.errors.length} issue(s))`
    );
    this.persist();
  }

  // Audit Logs (Human-In-The-Loop Corrections)
  recordCorrection(docId, field, oldValue, newValue, user = 'Operator') {
    const log = {
      id: 'audit_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
      document_id: docId,
      field,
      original_value: oldValue,
      corrected_value: newValue,
      user,
      timestamp: new Date().toISOString()
    };
    this.data.audit_logs.push(log);

    // Apply change to extraction
    if (this.data.extractions[docId]) {
      this.data.extractions[docId][field] = newValue;
    }

    this.logHistory(docId, 'MANUAL_CORRECTION', `Field '${field}' modified by ${user}.`);
    this.persist();
    return log;
  }

  // Timeline history
  logHistory(docId, event, details) {
    this.data.processing_history.push({
      id: 'hist_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
      document_id: docId,
      event,
      details,
      timestamp: new Date().toISOString()
    });
  }

  getProcessingHistory(docId) {
    return this.data.processing_history.filter(h => h.document_id === docId);
  }

  clearAll() {
    this.data = {
      documents: [],
      extractions: {},
      validations: {},
      audit_logs: [],
      processing_history: []
    };
    this.persist();
  }
}

module.exports = new Database();
