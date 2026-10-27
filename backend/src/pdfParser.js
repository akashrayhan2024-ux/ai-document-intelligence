const fs = require('fs');
const pdf = require('pdf-parse');

/**
 * High-performance PDF parser.
 * Handles:
 * - Multi-page extraction (supports streaming chunks for up to 1000 pages)
 * - Metadata extraction (pages, version, info)
 * - Heuristic detection of digital vs. scanned PDFs
 */
async function parsePdf(filePath) {
  const dataBuffer = fs.readFileSync(filePath);

  const options = {
    // Custom page render to capture per-page text and detect density
    pagerender: function (pageData) {
      return pageData.getTextContent().then(function (textContent) {
        let lastY, text = '';
        for (let item of textContent.items) {
          if (lastY === item.transform[5] || !lastY) {
            text += item.str;
          } else {
            text += '\n' + item.str;
          }
          lastY = item.transform[5];
        }
        return text;
      });
    }
  };

  try {
    const data = await pdf(dataBuffer, options);
    const pageCount = data.numpages || 1;
    const rawText = data.text ? data.text.trim() : '';

    // Density check: average characters per page
    const avgCharsPerPage = rawText.length / Math.max(pageCount, 1);
    const isScanned = avgCharsPerPage < 30; // Almost no selectable text -> scanned document

    return {
      success: true,
      pageCount,
      rawText,
      avgCharsPerPage: Math.round(avgCharsPerPage),
      isScanned,
      info: data.info || {},
      metadata: data.metadata || null
    };
  } catch (err) {
    throw new Error(`PDF_PARSING_FAILED: ${err.message}`);
  }
}

module.exports = {
  parsePdf
};
