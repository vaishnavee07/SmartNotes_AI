const tesseract = require('tesseract.js');
const pdfParse = require('pdf-parse');
const fs = require('fs');

/**
 * Perform OCR on an image file using Tesseract.js
 * @param {string} imagePath - Path to the image file
 * @returns {Promise<string>} - Extracted text
 */
const performImageOCR = async (imagePath) => {
    try {
        const { data: { text } } = await tesseract.recognize(
            imagePath,
            'eng',
            { logger: m => console.log(m) } // Optional: log progress
        );
        return normalizeText(text);
    } catch (error) {
        console.error('OCR Error:', error);
        throw new Error('Failed to process image');
    }
};

/**
 * Extract text from a PDF file using pdf-parse
 * @param {string} pdfPath - Path to the PDF file
 * @returns {Promise<string>} - Extracted text
 */
const extractPDFText = async (pdfPath) => {
    try {
        const dataBuffer = fs.readFileSync(pdfPath);
        const data = await pdfParse(dataBuffer);
        return normalizeText(data.text);
    } catch (error) {
        console.error('PDF Parse Error:', error);
        throw new Error('Failed to parse PDF');
    }
};

/**
 * Normalize and filter noise from extracted text
 * @param {string} text - Raw text
 * @returns {string} - Cleaned text
 */
const normalizeText = (text) => {
    if (!text) return '';

    return text
        .replace(/\r\n/g, '\n')      // Normalize line endings
        .replace(/\n\s*\n/g, '\n\n') // Remove excessive empty lines
        .replace(/[^\x20-\x7E\n]/g, '') // Remove non-printable characters
        .trim();
};

module.exports = {
    performImageOCR,
    extractPDFText,
    normalizeText
};
