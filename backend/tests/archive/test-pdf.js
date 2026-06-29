const path = require('path');
const { extractPDFText } = require('./services/ocrService');
const fs = require('fs');

async function testPdf() {
    try {
        const text = await extractPDFText('temp_1771735950180_Unit 2 - New Swing.pdf');
        console.log('Success! Extracted Text length:', text.length);
        console.log('Snippet:', text.substring(0, 100));
    } catch (e) {
        console.error('Test Failed Details:', e.stack || e);
    }
}

testPdf();
