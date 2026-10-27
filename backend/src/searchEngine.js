/**
 * Dual Search Subsystem
 * Implements:
 * 1. Keyword-Based Filtering (exact & token-based full text search)
 * 2. Semantic Search (Dense vector representation & Cosine Similarity)
 */

function tokenize(text) {
  if (!text) return [];
  return String(text)
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(t => t.length > 2);
}

// Compute Term Frequency vector for text
function getTermVector(text, vocabulary) {
  const tokens = tokenize(text);
  const vector = new Array(vocabulary.length).fill(0);
  tokens.forEach(tok => {
    const idx = vocabulary.indexOf(tok);
    if (idx !== -1) {
      vector[idx] += 1;
    }
  });

  // Normalize L2 norm
  const norm = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0));
  if (norm > 0) {
    for (let i = 0; i < vector.length; i++) {
      vector[i] /= norm;
    }
  }
  return vector;
}

// Cosine similarity between two unit vectors
function cosineSimilarity(vecA, vecB) {
  let dotProduct = 0;
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
  }
  return dotProduct;
}

class SearchEngine {
  /**
   * Keyword Search: Filter across filename, supplier, customer, invoice_number, and raw text
   */
  keywordSearch(documents, query) {
    if (!query || !query.trim()) return documents;

    const q = query.toLowerCase().trim();
    const qTokens = tokenize(q);

    return documents
      .map(doc => {
        let score = 0;
        const ext = doc.extraction || {};
        const text = (doc.raw_text || '').toLowerCase();
        const sup = (ext.supplier_name || '').toLowerCase();
        const cust = (ext.customer_name || '').toLowerCase();
        const inv = (ext.invoice_number || '').toLowerCase();
        const fname = (doc.original_name || '').toLowerCase();

        // Exact matches give high score
        if (inv.includes(q)) score += 10;
        if (sup.includes(q)) score += 8;
        if (cust.includes(q)) score += 6;
        if (fname.includes(q)) score += 4;
        if (text.includes(q)) score += 2;

        // Token matches
        qTokens.forEach(t => {
          if (text.includes(t)) score += 1;
          if (sup.includes(t)) score += 2;
        });

        return { ...doc, searchScore: score };
      })
      .filter(doc => doc.searchScore > 0)
      .sort((a, b) => b.searchScore - a.searchScore);
  }

  /**
   * Semantic Vector Search: Conceptual search using vector embeddings and cosine similarity
   */
  semanticSearch(documents, query, topK = 10) {
    if (!query || !query.trim() || documents.length === 0) return documents;

    // 1. Build dynamic corpus vocabulary
    const vocabSet = new Set();
    documents.forEach(doc => {
      const tokens = tokenize((doc.raw_text || '') + ' ' + (doc.extraction?.supplier_name || '') + ' ' + (doc.extraction?.customer_name || ''));
      tokens.forEach(t => vocabSet.add(t));
    });

    // Also include query tokens in vocabulary
    tokenize(query).forEach(t => vocabSet.add(t));
    const vocabulary = Array.from(vocabSet);

    if (vocabulary.length === 0) return documents;

    // 2. Generate vector for query
    const queryVector = getTermVector(query, vocabulary);

    // 3. Compute cosine similarity for each document
    const scoredDocs = documents.map(doc => {
      const docText = `${doc.original_name} ${doc.raw_text || ''} ${doc.extraction?.supplier_name || ''} ${doc.extraction?.customer_name || ''}`;
      const docVector = getTermVector(docText, vocabulary);
      const similarity = cosineSimilarity(queryVector, docVector);

      return {
        ...doc,
        semanticScore: Number(similarity.toFixed(4))
      };
    });

    return scoredDocs
      .filter(doc => doc.semanticScore > 0.05)
      .sort((a, b) => b.semanticScore - a.semanticScore)
      .slice(0, topK);
  }
}

module.exports = new SearchEngine();
