require('dotenv').config();
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

const db = require('./database');
const queue = require('./queue');
const searchEngine = require('./searchEngine');
const { crossVerifyDocuments } = require('./crossVerificationEngine');
const { validateExtraction } = require('./validationEngine');

const app = express();
const PORT = process.env.PORT || 5000;

// Enable CORS and JSON parsing
app.use(cors());
app.use(express.json());

// Set up storage directory for uploads
const UPLOAD_DIR = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const uniqueName = `${Date.now()}-${uuidv4()}${ext}`;
    cb(null, uniqueName);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 } // 50 MB limit
});

/**
 * 1. POST /api/documents/upload - Multi-file document upload
 */
app.post('/api/documents/upload', upload.array('files', 20), (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'No files uploaded.' });
    }

    const createdDocs = [];

    for (const file of req.files) {
      const ext = path.extname(file.originalname).toLowerCase().replace('.', '');
      const doc = db.insertDocument({
        id: uuidv4(),
        original_name: file.originalname,
        filename: file.filename,
        file_path: file.path,
        file_type: ext,
        file_size: file.size,
        status: 'queued'
      });

      // Enqueue for background OCR & AI extraction
      queue.enqueue(doc.id);
      createdDocs.push(doc);
    }

    res.status(202).json({
      message: `${createdDocs.length} file(s) uploaded successfully and queued for processing.`,
      documents: createdDocs
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * 2. GET /api/documents - List documents with optional filters
 */
app.get('/api/documents', (req, res) => {
  try {
    const { status, file_type, requires_manual_review } = req.query;
    const documents = db.getAllDocuments({ status, file_type, requires_manual_review });
    res.json(documents);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * 3. GET /api/documents/:id - Get complete document details, extraction, & validation
 */
app.get('/api/documents/:id', (req, res) => {
  try {
    const doc = db.getDocument(req.params.id);
    if (!doc) {
      return res.status(404).json({ error: 'Document not found.' });
    }
    const history = db.getProcessingHistory(req.params.id);
    res.json({ ...doc, processing_history: history });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * 4. GET /api/documents/:id/status - Lightweight polling status endpoint
 */
app.get('/api/documents/:id/status', (req, res) => {
  try {
    const doc = db.getDocument(req.params.id);
    if (!doc) {
      return res.status(404).json({ error: 'Document not found.' });
    }
    res.json({
      id: doc.id,
      status: doc.status,
      error_message: doc.error_message,
      updated_at: doc.updated_at
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * 5. PUT /api/documents/:id/corrections - Human-In-The-Loop (HITL) Manual Corrections
 */
app.put('/api/documents/:id/corrections', (req, res) => {
  try {
    const { field, value, user = 'Reviewer' } = req.body;
    const doc = db.getDocument(req.params.id);
    if (!doc) {
      return res.status(404).json({ error: 'Document not found.' });
    }

    if (!doc.extraction) {
      return res.status(400).json({ error: 'No extraction data available to correct.' });
    }

    const oldValue = doc.extraction[field];
    const log = db.recordCorrection(req.params.id, field, oldValue, value, user);

    // Re-run validation rules on updated extraction
    const updatedDoc = db.getDocument(req.params.id);
    const allDocs = db.getAllDocuments();
    const newValidation = validateExtraction(updatedDoc.extraction, allDocs, req.params.id);
    db.saveValidation(req.params.id, newValidation);

    res.json({
      message: `Field '${field}' updated successfully. Validation re-evaluated.`,
      audit_log: log,
      document: db.getDocument(req.params.id)
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * 6. POST /api/documents/:id/reprocess - Reprocess failed or updated jobs
 */
app.post('/api/documents/:id/reprocess', (req, res) => {
  try {
    const doc = db.getDocument(req.params.id);
    if (!doc) {
      return res.status(404).json({ error: 'Document not found.' });
    }

    queue.reprocess(req.params.id);
    res.json({ message: `Document ${req.params.id} has been re-enqueued for processing.` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * 7. POST /api/documents/cross-verify - PDF-PDF & PDF-Excel cross-verification
 */
app.post('/api/documents/cross-verify', (req, res) => {
  try {
    const { documentIdA, documentIdB } = req.body;
    if (!documentIdA || !documentIdB) {
      return res.status(400).json({ error: 'Both documentIdA and documentIdB are required.' });
    }

    const docA = db.getDocument(documentIdA);
    const docB = db.getDocument(documentIdB);

    if (!docA || !docB) {
      return res.status(404).json({ error: 'One or both documents could not be found.' });
    }

    const report = crossVerifyDocuments(docA, docB);
    res.json(report);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * 8. GET /api/search - Keyword & Vector Semantic Search
 */
app.get('/api/search', (req, res) => {
  try {
    const { q, mode = 'keyword' } = req.query;
    const allDocs = db.getAllDocuments();

    if (mode === 'semantic') {
      const results = searchEngine.semanticSearch(allDocs, q);
      res.json({ mode: 'semantic', query: q, count: results.length, results });
    } else {
      const results = searchEngine.keywordSearch(allDocs, q);
      res.json({ mode: 'keyword', query: q, count: results.length, results });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * 9. GET /api/stats - Dashboard analytics overview
 */
app.get('/api/stats', (req, res) => {
  try {
    const allDocs = db.getAllDocuments();
    const total = allDocs.length;
    const completed = allDocs.filter(d => d.status === 'completed').length;
    const failed = allDocs.filter(d => d.status === 'failed').length;
    const inProgress = allDocs.filter(d => d.status === 'processing' || d.status === 'queued').length;
    const requiresReview = allDocs.filter(d => d.validation && d.validation.requires_manual_review).length;
    const passed = allDocs.filter(d => d.validation && d.validation.is_valid).length;

    res.json({
      total,
      completed,
      failed,
      inProgress,
      requiresReview,
      passed,
      successRate: total > 0 ? Math.round((completed / total) * 100) : 0,
      validationPassRate: completed > 0 ? Math.round((passed / completed) * 100) : 0
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Serve static frontend build if present
const FRONTEND_DIST = path.join(__dirname, '..', '..', 'frontend', 'dist');
if (fs.existsSync(FRONTEND_DIST)) {
  app.use(express.static(FRONTEND_DIST));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) return next();
    res.sendFile(path.join(FRONTEND_DIST, 'index.html'));
  });
}

// Start Server
if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`=============================================================`);
    console.log(`AI Document Intelligence Backend running on http://localhost:${PORT}`);
    console.log(`API endpoints ready. Background queue active.`);
    console.log(`=============================================================`);
  });
}

module.exports = app;
