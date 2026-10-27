const { createWorker } = require('tesseract.js');
const fs = require('fs');

/**
 * Optical Character Recognition (OCR) Engine.
 * Supports scanned documents, PNG, JPG, TIFF images.
 * Includes confidence calculation and text cleaning.
 */
let workerInstance = null;

async function getWorker() {
  if (!workerInstance) {
    workerInstance = await createWorker('eng');
  }
  return workerInstance;
}

async function performOcr(imagePathOrBuffer) {
  try {
    const worker = await getWorker();
    const result = await worker.recognize(imagePathOrBuffer);
    
    const text = result.data.text ? result.data.text.trim() : '';
    const confidence = result.data.confidence || 0;
    
    // Normalize OCR text
    const cleanedText = text
      .replace(/[\r\n]{3,}/g, '\n\n')
      .replace(/[^\x20-\x7E\n\t]/g, ''); // strip non-printable artifacts
      
    return {
      success: true,
      rawText: cleanedText,
      confidence: Math.round(confidence),
      linesCount: result.data.lines ? result.data.lines.length : 0,
      wordsCount: result.data.words ? result.data.words.length : 0
    };
  } catch (err) {
    return {
      success: false,
      error: `OCR_PROCESSING_FAILED: ${err.message}`,
      rawText: '',
      confidence: 0
    };
  }
}

async function terminateOcr() {
  if (workerInstance) {
    await workerInstance.terminate();
    workerInstance = null;
  }
}

module.exports = {
  performOcr,
  terminateOcr
};
