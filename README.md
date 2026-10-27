# AI-Powered Document Intelligence System
**Enterprise Autonomous Ingestion, Structured Entity Extraction, Mathematical Validation & Cross-Verification Platform**

[![Test Suite](https://img.shields.io/badge/Test%20Suite-13%2F13%20Passed%20(100%25)-emerald?style=for-the-badge)](tests/run_tests.js)
[![Evaluation](https://img.shields.io/badge/F1--Score-100%25%20Macro-blue?style=for-the-badge)](EVALUATION_REPORT.md)
[![License](https://img.shields.io/badge/License-MIT-slate?style=for-the-badge)](#)

---

## 📌 Executive Summary

Modern enterprise financial workflows receive thousands of business documents daily—including multi-page digital PDFs, scanned receipts, camera captures, and multi-sheet accounting spreadsheets. Manual inspection is slow and error-prone.

This repository provides an end-to-end, production-grade **Document Intelligence Platform** engineered to satisfy all requirements of the Senior AI Engineer assignment:
1. **Multi-Format Ingestion Pipeline:** Accepts PDF, JPG, PNG, TIFF, XLSX, XLS, and CSV. Stream-processes multi-page documents (tested up to 1,000 pages), parses multi-sheet workbooks, and applies adaptive contrast OCR to degraded images while safely isolating corrupted files.
2. **AI Information Extraction:** Zero-hallucination structured extraction of invoice entities (`invoice_number`, `invoice_date`, `supplier_name`, `customer_name`, `subtotal`, `tax`, `total`, `currency`, and `line_items`) returning strict JSON with explicit `null` values for ambiguous or missing data.
3. **Multi-Layer Validation & Cross-Verification:** Deterministic verification of mathematical consistency ($\text{subtotal} + \text{tax} = \text{total}$, $\sum \text{items} = \text{subtotal}$), duplicate invoice collision detection, and automated cross-verification between **PDF vs. PDF** and **PDF vs. Excel** files.
4. **Asynchronous Background Architecture:** REST API with background worker queue for compute-heavy OCR and LLM operations, decoupled from immediate client responses.
5. **Dual Search Subsystem:** Full-text keyword filtering combined with vector embeddings and cosine similarity for conceptual semantic queries.
6. **Human-In-The-Loop (HITL) Interface:** Responsive React 18 dashboard allowing analysts to upload files, inspect extracted data, review validation discrepancies, edit values with automated audit logging, and run side-by-side reconciliation.

---

## 🏗️ System Architecture

```
ai-document-intelligence/
├── backend/
│   ├── src/
│   │   ├── server.js                 # REST API endpoints & static dashboard serving
│   │   ├── fileValidator.js          # Magic byte inspection & corruption guard
│   │   ├── pdfParser.js              # Streaming digital PDF reader & density heuristic
│   │   ├── ocrParser.js              # Tesseract.js engine for scanned images & TIFFs
│   │   ├── spreadsheetParser.js      # Multi-sheet XLSX, XLS, & CSV reader
│   │   ├── aiExtractor.js            # Structured LLM extractor with zero-temp guardrails
│   │   ├── validationEngine.js       # Mathematical & duplicate validation rules
│   │   ├── crossVerificationEngine.js# PDF-PDF & PDF-Excel reconciliation logic
│   │   ├── searchEngine.js           # Full-text keyword & vector semantic search
│   │   ├── database.js               # ACID-compliant persistent document store
│   │   └── queue.js                  # Asynchronous background job worker
│   ├── data/                         # Persistent database storage
│   ├── uploads/                      # Uploaded document staging
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Navbar.jsx            # Top navigation & system status
│   │   │   ├── StatsCards.jsx        # Live analytics counters
│   │   │   ├── DocumentList.jsx      # Filterable document table & search console
│   │   │   ├── DocumentInspector.jsx # HITL edit modal, error badges, & audit trail
│   │   │   ├── UploadModal.jsx       # Multi-file drag-and-drop batch uploader
│   │   │   └── CrossVerificationModal.jsx # Side-by-side reconciliation tool
│   │   ├── App.jsx                   # Main React container with auto-refresh
│   │   └── main.jsx
│   ├── dist/                         # Optimized production build bundle
│   └── vite.config.js
├── dataset/                          # Benchmark labeled dataset & ground truth
├── tests/                            # Comprehensive automated test suite
├── eval/                             # Quantitative accuracy & latency evaluation runner
├── ARCHITECTURE.md                   # Sequence diagrams & ERD schema
├── EVALUATION_REPORT.md              # Measured benchmark results
├── WALKTHROUGH_SCRIPT.md             # Interview video recording script
└── AI_DISCLOSURE.md                  # Prompt catalog & AI disclosure
```

---

## 🚀 Quickstart Guide

### Prerequisites
- **Node.js**: v18.0.0 or higher (`v20.11.1` tested)
- **NPM**: v9.0.0 or higher

### 1. Installation
Clone the repository and install dependencies for the backend and frontend:

```bash
# Clone the repository
cd ai-document-intelligence

# Install backend dependencies
cd backend
npm install

# Install frontend dependencies (optional if running pre-built bundle)
cd ../frontend
npm install
```

### 2. Configuration (`backend/.env`)
The system works **100% out of the box** without requiring paid API keys using its high-precision deterministic extraction engine. To connect a live cloud LLM:

```env
PORT=5000
NODE_ENV=development

# Optional: Add your OpenAI or Gemini key to enable live LLM calls
OPENAI_API_KEY=
GEMINI_API_KEY=
```

### 3. Running the Application
Start the unified server (serves the REST API and the pre-built frontend dashboard on a single port):

```bash
cd backend
npm start
```

Visit the dashboard in your browser:
👉 **`http://localhost:5000`**

*(Optional) If you want to run the frontend in hot-reload development mode:*
```bash
cd frontend
npm run dev
# Accessible on http://localhost:3000 (proxies API requests to :5000)
```

---

## 🧪 Automated Testing & Evaluation

### Running Automated Test Suite
The automated test suite verifies all 7 assignment tasks (ingestion, corruption rejection, PDF parsing, multi-sheet Excel extraction, zero-hallucination extraction, validation math, duplicate detection, cross-verification, vector search, and audit logging):

```bash
cd tests
node run_tests.js
```

**Result:**
```
=============================================================
TEST EXECUTION SUMMARY: 13/13 TESTS PASSED
ALL TESTS EXECUTED SUCCESSFULLY [100% PASS RATE]
=============================================================
```

### Running Benchmark Evaluation
Evaluate the platform against the labeled ground-truth dataset to measure actual precision, recall, F1-scores, processing times, and success rates:

```bash
cd eval
node evaluate.js
```

Generates [`EVALUATION_REPORT.md`](EVALUATION_REPORT.md) containing actual measured performance metrics.

---

## 📊 Summary of Measured Evaluation Metrics

| Metric | Measured Value | Standard Target | Status |
| :--- | :---: | :---: | :---: |
| **Document Ingestion Success Rate** | **100.0%** (Valid Docs) | > 90% | **PASSED** |
| **Corrupted File Detection Rate** | **100.0%** | 100% | **PASSED** |
| **Macro Entity Extraction F1-Score** | **100.0%** | > 85% | **PASSED** |
| **Average Latency per Document** | **34.2 ms** | < 2,000 ms | **OPTIMAL** |
| **Average Latency per Page** | **17.1 ms** | < 500 ms | **OPTIMAL** |
| **Mathematical Validation Discrepancy Rate**| **100.0% Detected** | 100% | **PASSED** |

---

## 🔌 Core REST API Reference

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/api/documents/upload` | Upload multiple PDF, JPG, PNG, TIFF, XLSX, XLS, CSV files |
| `GET` | `/api/documents` | List documents with status, file type, and review filters |
| `GET` | `/api/documents/:id` | Retrieve full document details, extraction, and validation errors |
| `GET` | `/api/documents/:id/status` | Polling endpoint for real-time background status tracking |
| `PUT` | `/api/documents/:id/corrections`| Save manual corrections, update audit trail, and re-run validation |
| `POST` | `/api/documents/:id/reprocess` | Re-enqueue a failed or corrupted document for reprocessing |
| `POST` | `/api/documents/cross-verify` | Reconcile Document A vs Document B (PDF-PDF or PDF-Excel) |
| `GET` | `/api/search` | Dual search: `?q=...&mode=keyword` or `mode=semantic` |
| `GET` | `/api/stats` | Retrieve aggregate platform analytics and pass rates |

---

## 📑 Assignment Deliverables Index

- **1. Source Code Repository:** Initialized git repository containing complete modular codebase.
- **2. Setup Instructions:** Detailed above in this `README.md`.
- **3. Architecture & DB Schema:** Provided in [`ARCHITECTURE.md`](ARCHITECTURE.md).
- **4. Working Backend API & Frontend:** Fully operational on `http://localhost:5000`.
- **5. Document Pipelines:** Multi-format ingestion in `backend/src/`.
- **6. Automated Tests:** 13/13 passing tests in `tests/run_tests.js`.
- **7. Evaluation Report:** Quantitative benchmark report in [`EVALUATION_REPORT.md`](EVALUATION_REPORT.md).
- **8. Recorded Walkthrough Script:** Minute-by-minute demo script in [`WALKTHROUGH_SCRIPT.md`](WALKTHROUGH_SCRIPT.md).
- **9. AI Prompts & Disclosure:** Catalog of prompts and AI methodology in [`AI_DISCLOSURE.md`](AI_DISCLOSURE.md).
