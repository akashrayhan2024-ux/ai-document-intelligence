/**
 * Cross-Verification Engine
 * Implements:
 * 1. PDF - PDF cross verification (e.g. Purchase Order vs. Invoice)
 * 2. PDF - Excel cross verification (e.g. Invoice vs. Internal Accounting Ledger)
 */

function normalizeStr(str) {
  return str ? String(str).toLowerCase().trim().replace(/[^a-z0-9]/g, '') : '';
}

function crossVerifyDocuments(docA, docB) {
  const discrepancies = [];
  const matches = [];

  const extA = docA.extraction || {};
  const extB = docB.extraction || {};

  // 1. Supplier comparison
  const supA = extA.supplier_name;
  const supB = extB.supplier_name;
  if (supA && supB) {
    if (normalizeStr(supA) === normalizeStr(supB)) {
      matches.push({ field: 'supplier_name', value: supA });
    } else {
      discrepancies.push({
        field: 'supplier_name',
        docA_value: supA,
        docB_value: supB,
        message: `Supplier mismatch: "${supA}" vs "${supB}"`
      });
    }
  }

  // 2. Invoice / Reference Number comparison
  const invA = extA.invoice_number;
  const invB = extB.invoice_number;
  if (invA && invB) {
    if (normalizeStr(invA) === normalizeStr(invB)) {
      matches.push({ field: 'invoice_number', value: invA });
    } else {
      discrepancies.push({
        field: 'invoice_number',
        docA_value: invA,
        docB_value: invB,
        message: `Invoice/Ref number mismatch: "${invA}" vs "${invB}"`
      });
    }
  }

  // 3. Total Amount reconciliation
  const totA = typeof extA.total === 'number' ? extA.total : null;
  const totB = typeof extB.total === 'number' ? extB.total : null;
  if (totA !== null && totB !== null) {
    const diff = Math.abs(totA - totB);
    if (diff <= 0.05) {
      matches.push({ field: 'total', value: totA });
    } else {
      discrepancies.push({
        field: 'total',
        docA_value: totA,
        docB_value: totB,
        difference: Number(diff.toFixed(2)),
        message: `Total amount mismatch: ${totA} vs ${totB} (Variance: ${diff.toFixed(2)})`
      });
    }
  }

  // 4. Line Items Reconciliation
  const itemsA = Array.isArray(extA.line_items) ? extA.line_items : [];
  const itemsB = Array.isArray(extB.line_items) ? extB.line_items : [];

  let matchedItemsCount = 0;
  for (const itemA of itemsA) {
    const normDescA = normalizeStr(itemA.description);
    const match = itemsB.find(itemB => {
      const normDescB = normalizeStr(itemB.description);
      return normDescA && normDescB && (normDescA.includes(normDescB) || normDescB.includes(normDescA));
    });

    if (match) {
      matchedItemsCount++;
      // Check price/quantity variance
      if (itemA.amount !== match.amount) {
        discrepancies.push({
          field: `line_item: ${itemA.description}`,
          docA_value: itemA.amount,
          docB_value: match.amount,
          difference: Number(Math.abs(itemA.amount - match.amount).toFixed(2)),
          message: `Price variance for "${itemA.description}": Doc A has ${itemA.amount}, Doc B has ${match.amount}`
        });
      }
    }
  }

  const totalChecks = matches.length + discrepancies.length;
  const matchScore = totalChecks > 0 ? Math.round((matches.length / totalChecks) * 100) : 0;

  let verificationStatus = 'MATCH';
  if (discrepancies.length > 0 && matches.length > 0) {
    verificationStatus = 'PARTIAL_MATCH';
  } else if (discrepancies.length > 0 && matches.length === 0) {
    verificationStatus = 'MISMATCH';
  }

  return {
    verificationStatus,
    matchScore,
    documentA: { id: docA.id, filename: docA.original_name, fileType: docA.file_type },
    documentB: { id: docB.id, filename: docB.original_name, fileType: docB.file_type },
    matches,
    discrepancies,
    reconciliationSummary: `${matches.length} matching field(s), ${discrepancies.length} discrepancy(ies) detected.`
  };
}

module.exports = {
  crossVerifyDocuments
};
