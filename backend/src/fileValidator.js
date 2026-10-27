const fs = require('fs');
const path = require('path');

/**
 * Validates and sanitizes uploaded files.
 * Checks for:
 * 1. File existence and non-zero size
 * 2. Magic byte signatures for PDF, images, Excel, CSV
 * 3. Corrupted or malformed file structures
 */

const MAGIC_BYTES = {
  PDF: [0x25, 0x50, 0x44, 0x46], // %PDF
  PNG: [0x89, 0x50, 0x4E, 0x47], // .PNG
  JPG: [0xFF, 0xD8, 0xFF],       // JPEG
  TIFF_LE: [0x49, 0x49, 0x2A, 0x00], // II*. (little endian)
  TIFF_BE: [0x4D, 0x4D, 0x00, 0x2A], // MM.* (big endian)
  ZIP_XLSX: [0x50, 0x4B, 0x03, 0x04], // PK.. (Office Open XML / XLSX)
  OLE_XLS: [0xD0, 0xCF, 0x11, 0xE0],  // Compound File Binary (legacy XLS)
};

function matchesMagicBytes(buffer, signature) {
  if (buffer.length < signature.length) return false;
  for (let i = 0; i < signature.length; i++) {
    if (buffer[i] !== signature[i]) return false;
  }
  return true;
}

function detectFileType(buffer, originalExtension) {
  const ext = originalExtension.toLowerCase().replace('.', '');

  if (matchesMagicBytes(buffer, MAGIC_BYTES.PDF)) return 'pdf';
  if (matchesMagicBytes(buffer, MAGIC_BYTES.PNG)) return 'png';
  if (matchesMagicBytes(buffer, MAGIC_BYTES.JPG)) return 'jpg';
  if (matchesMagicBytes(buffer, MAGIC_BYTES.TIFF_LE) || matchesMagicBytes(buffer, MAGIC_BYTES.TIFF_BE)) return 'tiff';
  if (matchesMagicBytes(buffer, MAGIC_BYTES.ZIP_XLSX)) return 'xlsx';
  if (matchesMagicBytes(buffer, MAGIC_BYTES.OLE_XLS)) return 'xls';

  // For CSV or plain text, verify valid text encoding without NUL bytes
  if (ext === 'csv' || ext === 'txt') {
    const sample = buffer.slice(0, Math.min(buffer.length, 1024));
    for (let i = 0; i < sample.length; i++) {
      if (sample[i] === 0x00) {
        throw new Error('CORRUPTED_FILE: Binary null characters detected in spreadsheet/text document');
      }
    }
    return 'csv';
  }

  // Fallback to extension if valid, else reject
  const allowed = ['pdf', 'jpg', 'jpeg', 'png', 'tiff', 'tif', 'xlsx', 'xls', 'csv'];
  if (allowed.includes(ext)) {
    return ext === 'jpeg' ? 'jpg' : (ext === 'tif' ? 'tiff' : ext);
  }

  throw new Error(`UNSUPPORTED_FORMAT: File type .${ext} is not supported.`);
}

function validateFile(filePath, originalFilename) {
  if (!fs.existsSync(filePath)) {
    return { isValid: false, error: 'FILE_NOT_FOUND', message: 'Uploaded file cannot be located on disk.' };
  }

  const stats = fs.statSync(filePath);
  if (stats.size === 0) {
    return { isValid: false, error: 'EMPTY_FILE', message: 'File is 0 bytes (empty document).' };
  }

  // Read first 64 bytes for header magic signature check
  const buffer = Buffer.alloc(Math.min(stats.size, 64));
  const fd = fs.openSync(filePath, 'r');
  fs.readSync(fd, buffer, 0, buffer.length, 0);
  fs.closeSync(fd);

  const ext = path.extname(originalFilename || filePath);

  try {
    const detectedType = detectFileType(buffer, ext);
    return {
      isValid: true,
      fileType: detectedType,
      fileSize: stats.size,
      path: filePath
    };
  } catch (err) {
    return {
      isValid: false,
      error: 'CORRUPTED_FILE',
      message: err.message
    };
  }
}

module.exports = {
  validateFile,
  detectFileType,
  matchesMagicBytes
};
