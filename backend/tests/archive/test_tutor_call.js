const dotenv = require('dotenv');
dotenv.config();

const { callGroq } = require('./utils/aiService');

async function run() {
    console.log('Testing callGroq with array:');
    try {
        const systemPrompt = 'You are a helpful assistant.';
        const userPrompt = 'Hello! Answer in one word.';
        const messages = [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
        ];
        const res = await callGroq(messages, 0.7);
        console.log('Success:', res);
    } catch (err) {
        console.error('Failed:', err.message);
        if (err.response) {
            console.error('Response data:', err.response.data);
        }
    }
}
run();
