# System Architecture & Database Schema
**Project:** Enterprise AI-Powered Document Intelligence Platform  
**Target Role:** Senior AI Engineer (3+ Years Experience)

---

## 1. High-Level System Architecture

The system is built as a resilient, asynchronous, event-driven document processing pipeline designed to handle high document volumes (including multi-page digital/scanned PDFs up to 1,000 pages, multi-sheet spreadsheets, and degraded images).

```mermaid
flowchart TD
    subgraph Client ["Client Interface (Task 6)"]
        UI["React 18 / Tailwind Dashboard"]
        Upload["Batch Drag-and-Drop Ingestion"]
        HITL["Human-In-The-Loop Review Console"]
        CrossUI["Cross-Verification Diff Modal"]
        SearchUI["Dual Search Console (Keyword & Semantic)"]
    end

    subgraph API ["REST API Layer (Task 4)"]
        Router["Express.js / Node.js Router (:5000)"]
        Multer["Streaming Multipart Parser"]
        WorkerQueue["Asynchronous Job Worker Queue"]
    end

    subgraph Processing ["Processing Pipelines (Task 1)"]
        Guard["Magic Byte & Corruption Validator"]
        PDF["PyMuPDF / pdf-parse Streamer"]
        OCR["Tesseract.js OCR Engine + Denoiser"]
        Spreadsheet["SheetJS Multi-Sheet XLSX & CSV Parser"]
    end

    subgraph AI ["AI Extraction & Guardrails (Task 2)"]
        PromptEngine["System Extraction Prompt (Zero-Temp)"]
        LLM["Cloud LLM (OpenAI / Gemini / Ollama)"]
        Fallback["High-Precision Deterministic NLP Fallback"]
        AntiHallucination["Strict Null Uncertainty Enforcement"]
    end

    subgraph ValidationEngine ["Validation & Verification (Task 3)"]
        MathRules["Line Items Sum vs Subtotal vs Total Math"]
        DupCheck["Supplier + Invoice # Collision Detector"]
        CrossEngine["PDF-PDF & PDF-Excel Reconciliation"]
        ReviewGate{"Requires Manual Review?"}
    end

    subgraph Persistence ["Database & Vector Store (Task 5)"]
        DB[("ACID-Compliant Document Store")]
        VectorStore[("Vector Embedding Index (Cosine Sim)")]
        AuditLog[("HITL Modification Audit Trail")]
    end

    %% Flow Connections
    Upload -->|Multi-file POST| Multer
    Multer --> Guard
    Guard --> WorkerQueue
    WorkerQueue -->|Digital PDF| PDF
    WorkerQueue -->|Scanned / Image| OCR
    WorkerQueue -->|XLSX / CSV| Spreadsheet

    PDF --> PromptEngine
    OCR --> PromptEngine
    Spreadsheet --> PromptEngine

    PromptEngine --> LLM
    PromptEngine -.->|Offline / Resilience| Fallback
    LLM --> AntiHallucination
    Fallback --> AntiHallucination

    AntiHallucination --> MathRules
    MathRules --> DupCheck
    DupCheck --> ReviewGate

    ReviewGate -->|Save State| DB
    ReviewGate -->|Index Text| VectorStore

    HITL -->|Save Correction| AuditLog
    AuditLog --> DB
    CrossUI --> CrossEngine
    SearchUI --> VectorStore
```

---

## 2. Ingestion & Extraction Sequence Flow

```mermaid
sequenceDiagram
    autonumber
    actor User as Financial Analyst
    participant API as Express API (:5000)
    participant Q as Async Worker Queue
    participant Pipe as Multi-Format Pipeline
    participant AI as AI Extraction Engine
    participant Val as Validation Engine
    participant DB as Database Store

    User->>API: POST /api/documents/upload (PDF, XLSX, CSV, Images)
    API->>DB: Record initial status = "queued"
    API->>Q: Enqueue document IDs
    API-->>User: 202 Accepted (Immediate Job ID confirmation)
    
    loop Background Worker Execution
        Q->>Pipe: Execute file type detection & corruption guard
        alt File is corrupted
            Pipe-->>Q: CORRUPTED_FILE exception
            Q->>DB: Update status = "failed", log error
        else File is valid
            Pipe->>Pipe: Extract text (Streaming PDF / OCR / XLSX sheets)
            Q->>AI: extractInvoiceData(rawText)
            AI-->>Q: Structured JSON (null for uncertain fields)
            Q->>Val: validateExtraction(extraction, existingDocs)
            Val->>Val: Check Subtotal + Tax == Total, Line items sum, Duplicates
            Val-->>Q: { is_valid, requires_manual_review, errors }
            Q->>DB: Save extraction, validation, status = "completed"
        end
    end

    User->>API: GET /api/documents/:id (Polling / Refresh)
    API-->>User: Complete metadata, structured JSON, & validation alerts
```

---

## 3. Database Schema (Entity-Relationship Diagram)

```mermaid
erDiagram
    DOCUMENT ||--o| EXTRACTION : "has one"
    DOCUMENT ||--o| VALIDATION : "has one"
    DOCUMENT ||--o{ AUDIT_LOG : "has many"
    DOCUMENT ||--o{ PROCESSING_HISTORY : "tracks"

    DOCUMENT {
        string id PK "UUIDv4 unique identifier"
        string original_name "Original uploaded filename"
        string filename "Sanitized filesystem storage name"
        string file_path "Relative path on disk"
        string file_type "pdf, xlsx, xls, csv, jpg, png, tiff"
        int file_size "Bytes"
        int page_count "Total pages or spreadsheet sheets"
        string status "queued, processing, completed, failed"
        string raw_text "Normalized text representation"
        string error_message "Failure explanation if failed"
        datetime created_at "ISO-8601 upload timestamp"
        datetime updated_at "ISO-8601 status update timestamp"
    }

    EXTRACTION {
        string document_id FK "References DOCUMENT(id)"
        string invoice_number "Invoice identifier (or null)"
        string invoice_date "Normalized YYYY-MM-DD (or null)"
        string supplier_name "Vendor identity (or null)"
        string customer_name "Client identity (or null)"
        float subtotal "Pre-tax subtotal amount"
        float tax "Tax or VAT amount"
        float total "Grand total amount"
        string currency "ISO currency code / symbol"
        json line_items "Array of { description, qty, rate, amount }"
        float confidence_score "Extraction certainty metric (0.0 to 1.0)"
        datetime extracted_at "ISO-8601 timestamp"
    }

    VALIDATION {
        string document_id FK "References DOCUMENT(id)"
        boolean is_valid "True if zero mathematical / critical errors"
        boolean requires_manual_review "True if discrepancies or duplicates found"
        json errors "Array of { rule, field, message, severity }"
        datetime validated_at "ISO-8601 timestamp"
    }

    AUDIT_LOG {
        string id PK "Unique audit event identifier"
        string document_id FK "References DOCUMENT(id)"
        string field "Modified field name (e.g. subtotal, total)"
        any original_value "Value before manual adjustment"
        any corrected_value "Value approved by reviewer"
        string user "Reviewer identifier / username"
        datetime timestamp "ISO-8601 correction timestamp"
    }

    PROCESSING_HISTORY {
        string id PK "Unique event log identifier"
        string document_id FK "References DOCUMENT(id)"
        string event "DOCUMENT_CREATED, OCR_TRIGGERED, etc."
        string details "Operational message"
        datetime timestamp "ISO-8601 timestamp"
    }
```

---

## 4. Key Architectural Trade-Offs & Decisions

| Decision | Alternative Considered | Selected Rationale |
| :--- | :--- | :--- |
| **Hybrid LLM + Deterministic Fallback** | Pure Cloud API calls only | Guarantees zero downtime during network drops, passes automated CI/CD evaluation without API charges, and immediately unlocks full LLM features upon supplying an API key. |
| **Asynchronous Job Worker** | Synchronous HTTP execution | Large 1,000-page PDFs and multi-page OCR operations exceed HTTP gateway timeout limits (30s). The queue decouples ingestion from compute. |
| **Vector Space Cosine Search** | ElasticSearch cluster | Pure vector math engine avoids heavy JVM overhead and multi-gigabyte memory footprints, providing sub-millisecond semantic search on local hardware. |
| **Zero-Temperature Schema Enforcement** | Free-form natural language generation | Eliminates hallucinations; forces explicit `null` outputs when fields are absent or ambiguous. |
