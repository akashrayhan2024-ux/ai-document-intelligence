/**
 * Data Validation Engine
 * Implements validation rules for Task 3:
 * 1. Missing mandatory fields detection
 * 2. Math consistency: subtotal + tax == total
 * 3. Line items sum vs. subtotal
 * 4. Line item calculation: quantity * unit_price == amount
 * 5. Negative values / non-numeric anomalies
 * 6. Duplicate invoice detection
 * 7. Flags records requiring manual review
 */

const FLOAT_TOLERANCE = 0.05; // Floating-point rounding tolerance

function validateExtraction(extraction, existingDocuments = [], currentDocId = null) {
  const errors = [];
  const warnings = [];
  let requires_manual_review = false;

  // 1. Mandatory Fields Check
  const mandatoryFields = [
    { field: 'invoice_number', label: 'Invoice Number' },
    { field: 'invoice_date', label: 'Invoice Date' },
    { field: 'supplier_name', label: 'Supplier Name' },
    { field: 'total', label: 'Total Amount' }
  ];

  for (const { field, label } of mandatoryFields) {
    if (extraction[field] === null || extraction[field] === undefined || extraction[field] === '') {
      errors.push({
        rule: 'MISSING_MANDATORY_FIELD',
        field,
        message: `Missing mandatory field: ${label}`,
        severity: 'error'
      });
      requires_manual_review = true;
    }
  }

  // 2. Numeric Discrepancy: Subtotal + Tax vs. Total
  const subtotal = typeof extraction.subtotal === 'number' ? extraction.subtotal : null;
  const tax = typeof extraction.tax === 'number' ? extraction.tax : null;
  const total = typeof extraction.total === 'number' ? extraction.total : null;

  if (total !== null && total < 0) {
    errors.push({
      rule: 'INVALID_NUMERIC_VALUE',
      field: 'total',
      message: `Total amount is negative (${total}).`,
      severity: 'error'
    });
    requires_manual_review = true;
  }

  if (subtotal !== null && tax !== null && total !== null) {
    const expectedTotal = Number((subtotal + tax).toFixed(2));
    const diff = Math.abs(expectedTotal - total);
    if (diff > FLOAT_TOLERANCE) {
      errors.push({
        rule: 'MATH_INCONSISTENCY_TOTAL',
        field: 'total',
        message: `Calculation mismatch: Subtotal (${subtotal}) + Tax (${tax}) = ${expectedTotal}, but Total is ${total} (Difference: ${diff.toFixed(2)})`,
        severity: 'error'
      });
      requires_manual_review = true;
    }
  }

  // 3. Line Items Consistency
  const lineItems = Array.isArray(extraction.line_items) ? extraction.line_items : [];
  if (lineItems.length > 0) {
    let lineItemsSum = 0;
    lineItems.forEach((item, index) => {
      // Validate line item unit math
      if (typeof item.quantity === 'number' && typeof item.unit_price === 'number' && typeof item.amount === 'number') {
        const expectedAmount = Number((item.quantity * item.unit_price).toFixed(2));
        const itemDiff = Math.abs(expectedAmount - item.amount);
        if (itemDiff > FLOAT_TOLERANCE) {
          warnings.push({
            rule: 'LINE_ITEM_CALCULATION_MISMATCH',
            field: `line_items[${index}]`,
            message: `Line item #${index + 1} (${item.description || 'Item'}): Qty (${item.quantity}) * Rate (${item.unit_price}) = ${expectedAmount}, but Amount is ${item.amount}`,
            severity: 'warning'
          });
        }
      }

      if (typeof item.amount === 'number') {
        lineItemsSum += item.amount;
      }
    });

    lineItemsSum = Number(lineItemsSum.toFixed(2));

    // Check sum of line items vs subtotal
    if (subtotal !== null) {
      const subtotalDiff = Math.abs(lineItemsSum - subtotal);
      if (subtotalDiff > FLOAT_TOLERANCE) {
        errors.push({
          rule: 'LINE_ITEMS_SUBTOTAL_MISMATCH',
          field: 'subtotal',
          message: `Sum of line items (${lineItemsSum}) does not match subtotal (${subtotal}). Discrepancy: ${subtotalDiff.toFixed(2)}`,
          severity: 'error'
        });
        requires_manual_review = true;
      }
    }
  }

  // 4. Duplicate Invoice Detection
  if (extraction.invoice_number && extraction.supplier_name && existingDocuments.length > 0) {
    const normInv = String(extraction.invoice_number).trim().toLowerCase();
    const normSup = String(extraction.supplier_name).trim().toLowerCase();

    const isDuplicate = existingDocuments.some(doc => {
      if (currentDocId && doc.id === currentDocId) return false;
      const docInv = doc.extraction?.invoice_number ? String(doc.extraction.invoice_number).trim().toLowerCase() : '';
      const docSup = doc.extraction?.supplier_name ? String(doc.extraction.supplier_name).trim().toLowerCase() : '';
      return docInv === normInv && docSup === normSup;
    });

    if (isDuplicate) {
      warnings.push({
        rule: 'DUPLICATE_INVOICE_DETECTED',
        field: 'invoice_number',
        message: `Duplicate detected: Invoice #${extraction.invoice_number} from supplier "${extraction.supplier_name}" already exists in the system.`,
        severity: 'warning'
      });
      requires_manual_review = true;
    }
  }

  // 5. Confidence Score threshold
  if (typeof extraction.confidence_score === 'number' && extraction.confidence_score < 0.75) {
    warnings.push({
      rule: 'LOW_EXTRACTION_CONFIDENCE',
      field: 'confidence_score',
      message: `Extraction confidence is low (${Math.round(extraction.confidence_score * 100)}%). Manual inspection advised.`,
      severity: 'warning'
    });
    requires_manual_review = true;
  }

  const allIssues = [...errors, ...warnings];
  const is_valid = errors.length === 0;

  return {
    is_valid,
    requires_manual_review,
    errors: allIssues,
    error_count: errors.length,
    warning_count: warnings.length
  };
}

module.exports = {
  validateExtraction,
  FLOAT_TOLERANCE
};
