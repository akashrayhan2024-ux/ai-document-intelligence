const XLSX = require('xlsx');
const fs = require('fs');

/**
 * Enterprise Spreadsheet Parser.
 * Handles:
 * - XLSX, XLS, and CSV files
 * - Multi-sheet iteration and mapping
 * - Structured table extraction & header normalization
 */
function parseSpreadsheet(filePath) {
  try {
    const workbook = XLSX.readFile(filePath, {
      type: 'file',
      cellDates: true,
      cellNF: true,
      raw: false
    });

    const sheets = [];
    let combinedText = '';

    for (const sheetName of workbook.SheetNames) {
      const worksheet = workbook.Sheets[sheetName];
      
      // Convert sheet to json array of objects
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });
      // Convert to clean CSV text representation for AI context
      const csvText = XLSX.utils.sheet_to_csv(worksheet);

      // Filter empty rows
      const nonEmptyRows = jsonData.filter(row => row.some(cell => cell !== '' && cell !== null));

      sheets.push({
        name: sheetName,
        rowCount: nonEmptyRows.length,
        colCount: nonEmptyRows[0] ? nonEmptyRows[0].length : 0,
        data: nonEmptyRows,
        textRepresentation: csvText
      });

      combinedText += `--- SHEET: ${sheetName} ---\n${csvText}\n\n`;
    }

    return {
      success: true,
      sheetCount: sheets.length,
      sheets,
      rawText: combinedText.trim()
    };
  } catch (err) {
    throw new Error(`SPREADSHEET_PARSING_FAILED: ${err.message}`);
  }
}

module.exports = {
  parseSpreadsheet
};
