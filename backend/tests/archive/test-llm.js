const { extractPDFText } = require('./services/ocrService');
const { generateSummary } = require('./services/llmService');
const fs = require('fs');
require('dotenv').config();

async function testFull() {
    try {
        const text = await extractPDFText('temp_1771735950180_Unit 2 - New Swing.pdf');
        await generateSummary(text);
        console.log('Success');
    } catch (e) {
        fs.writeFileSync('llm-error.txt', e.stack || e.toString());
    }
}
testFull();
