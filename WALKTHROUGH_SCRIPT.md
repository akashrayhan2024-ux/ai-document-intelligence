# Video Walkthrough Recording Guide & Script
**Project:** AI-Powered Document Intelligence System  
**Submission Requirement:** Deliverable 8 — Recorded Walkthrough of the Working Application  
**Target Duration:** 4 to 6 Minutes  
**Audience:** Technical Interviewers / Hiring Committee (Senior AI Engineer)

---

## 🎬 Pre-Recording Checklist

1. Start the server:
   ```bash
   cd ai-document-intelligence/backend
   npm start
   ```
2. Open your browser to `http://localhost:5000`.
3. Have the `dataset/` directory accessible on your desktop/finder so you can drag-and-drop sample files smoothly.
4. Open your terminal in another window ready to showcase test execution (`node tests/run_tests.js`).

---

## ⏱️ Minute-by-Minute Walkthrough Script

### 0:00 – 0:45 | Introduction & Problem Overview
* **What to Show on Screen:**
  * Open the web dashboard at `http://localhost:5000`.
  * Highlight the clean UI, stats counters, and overall platform layout.
* **What to Say:**
  > *"Hello everyone. Today I'm presenting my submission for the Senior AI Engineer assignment: an autonomous, production-grade Document Intelligence Platform.  
  > In an enterprise scenario where companies receive thousands of invoices, receipts, spreadsheets, and multi-page PDFs daily, manual extraction and cross-verification create severe bottlenecks.  
  > I engineered this platform to solve that end-to-end: featuring multi-format ingestion, zero-hallucination AI entity extraction, mathematical validation rules, PDF-to-PDF and PDF-to-Excel cross-verification, vector semantic search, and a complete Human-In-The-Loop review workflow."*

---

### 0:45 – 1:45 | Task 1 & Task 4: Ingestion & Asynchronous Background Processing
* **What to Show on Screen:**
  * Click the **"Upload Documents"** button in the top right.
  * Drag and drop files from the `dataset/` folder:
    1. `invoice_apex_cloud.csv` (Standard invoice)
    2. `nexus_hardware_multisheet.xlsx` (Multi-sheet Excel workbook)
    3. `discrepancy_invoice.csv` (Math discrepancy test)
    4. `corrupted_document.bin` (Corrupted binary file)
  * Click **"Ingest Documents"**.
  * Show the immediate 202 Accepted response and the background worker processing the queue without freezing the UI.
* **What to Say:**
  > *"First, let's look at the ingestion layer. The system handles PDFs, PNGs, JPGs, TIFFs, CSVs, and multi-sheet Excel files. Notice how when I upload multiple files simultaneously, the API responds instantly with a 202 status.  
  > We use an asynchronous background worker queue so that time-consuming OCR or large multi-page PDF extractions do not block the HTTP event loop.  
  > Notice also how the corrupted binary file was immediately caught by our magic byte guard and safely isolated with a 'Corrupted / Failed' badge, preventing pipeline crashes."*

---

### 1:45 – 2:45 | Task 2 & Task 3: AI Extraction & Deterministic Validation
* **What to Show on Screen:**
  * Click on `invoice_apex_cloud.csv` to open the **Document Inspector**.
  * Show the extracted fields: `invoice_number`, `invoice_date`, `supplier_name`, `customer_name`, `subtotal`, `tax`, `total`, and the itemized line items table.
  * Point out the green **"Validation Passed"** banner.
  * Close it and click on `discrepancy_invoice.csv`.
  * Point out the prominent amber banner: **"Action Required: Discrepancies Detected"** with the message: `Subtotal ($500) + Tax ($50) = 550, but Total is 600`.
* **What to Say:**
  > *"For Task 2, AI information extraction, our system extracts structured entities according to strict Pydantic/JSON schemas. A critical requirement for a Senior AI Engineer is anti-hallucination guardrails: if a field is absent or uncertain, the model explicitly outputs null rather than hallucinating numbers.  
  > In Task 3, our deterministic validation engine checks that line items sum to subtotal, and subtotal plus tax equals total.  
  > On this clean invoice, validation passed with zero errors. But on this faulty invoice, the engine immediately flagged the discrepancy where five hundred plus fifty does not equal the stated total of six hundred, automatically marking it as requiring human review."*

---

### 2:45 – 3:30 | Task 6: Human-In-The-Loop (HITL) Manual Corrections & Audit Trail
* **What to Show on Screen:**
  * Inside `discrepancy_invoice.csv`, click on the **Total ($)** input field.
  * Change `600` to `550`.
  * Click **"Save Corrections & Re-Validate"**.
  * Show how the banner instantly transitions from amber warning to green **"Validation Passed"**!
  * Click the **"Audit History"** tab to reveal the logged entry showing: `Lead Reviewer modified field 'total' from 600 to 550 with timestamp`.
* **What to Say:**
  > *"No AI system is complete without a robust Human-In-The-Loop mechanism. Here, a financial reviewer can correct any erroneous field directly.  
  > When I correct the total from 600 to 550 and click Save, the backend automatically re-runs all validation rules, marks the document as passed, and records an immutable entry in the audit trail. This satisfies enterprise compliance and data governance requirements."*

---

### 3:30 – 4:15 | Cross-Verification Engine (PDF vs PDF & PDF vs Excel)
* **What to Show on Screen:**
  * Click **"Cross-Verify"** in the top navigation bar.
  * Select Document A (`invoice_apex_cloud.csv` or PDF) and Document B (`nexus_hardware_multisheet.xlsx`).
  * Click **"Run Cross-Verification"**.
  * Review the Reconciliation Result: matching fields, variance diffs, and match percentage score.
* **What to Say:**
  > *"One of the key requirements mentioned in the scenario was cross-verification between documents—such as matching an invoice PDF against an accounting ledger Excel sheet, or a purchase order against an invoice.  
  > Our cross-verification engine reconciles vendor identity, invoice reference codes, total amounts, and line item unit prices, generating an automated reconciliation report with exact variances highlighted."*

---

### 4:15 – 4:45 | Task 5: Dual Search (Keyword & Semantic Vector Search)
* **What to Show on Screen:**
  * In the search bar, toggle to **Keyword Match** and search for `INV-2026-001`. Show the exact match.
  * Clear the search and toggle to **Semantic Vector**.
  * Type a conceptual query: `cloud server hosting infrastructure` and hit Enter.
  * Show how `invoice_apex_cloud.csv` is surfaced at the top based on cosine similarity of text embeddings!
* **What to Say:**
  > *"For Task 5, we implemented dual search: traditional keyword filtering for exact invoice numbers and vendors, plus vector semantic search.  
  > When an analyst searches for conceptual terms like 'cloud server infrastructure', the vector engine calculates embedding cosine similarity and immediately returns the most relevant documents, even if the exact keyword didn't appear in the title."*

---

### 4:45 – 5:30 | Task 7: Automated Test Suite & Benchmark Evaluation Report
* **What to Show on Screen:**
  * Switch to your terminal.
  * Run the test suite:
    ```bash
    node tests/run_tests.js
    ```
  * Show `13/13 TESTS PASSED (100% PASS RATE)`.
  * Run the benchmark evaluation:
    ```bash
    node eval/evaluate.js
    ```
  * Open `EVALUATION_REPORT.md` and highlight the 100% F1-score and average latency of ~34 ms per document.
* **What to Say:**
  > *"Finally, for Task 7, we have full automated test coverage. Running our test suite validates file ingestion, corruption guards, multi-sheet spreadsheets, zero-hallucination extraction, and API integration with a 100% pass rate.  
  > Running our benchmark evaluation against labeled ground-truth data measures a 100% Macro F1-score across all critical financial fields with an average processing latency of just 34 milliseconds per document.  
  > Thank you for reviewing this project, and I look forward to discussing the architecture with the team!"*
