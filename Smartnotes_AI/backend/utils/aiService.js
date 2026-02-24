const Groq = require('groq-sdk');
const dotenv = require('dotenv');

dotenv.config();

const groq = new Groq({
    apiKey: process.env.GROQ_API_KEY,
});

async function callGroq(messages) {
    try {
        const response = await groq.chat.completions.create({
            model: "llama-3.1-8b-instant",
            messages,
            max_tokens: 3000,
            temperature: 0.7
        });

        return response.choices[0].message.content;

    } catch (error) {
        console.error("FULL GROQ ERROR:");
        console.error(error.response?.data || error.message);
        throw error;
    }
}

module.exports = { callGroq };
