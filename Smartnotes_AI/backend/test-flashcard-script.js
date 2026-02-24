const Groq = require('groq-sdk');
const dotenv = require('dotenv');
dotenv.config();

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
async function callGroq(messages) {
    const response = await groq.chat.completions.create({
        model: "llama-3.1-8b-instant",
        messages, max_tokens: 500, temperature: 0.7
    });
    return response.choices[0].message.content;
}

const safeText = "Molecular Biology is the field of biology that studies the composition, structure and interactions of cellular molecules. The central dogma of molecular biology is that DNA is transcribed into RNA, which is translated into protein. DNA replication is an essential process...".slice(0, 2500);

const messages = [
    {
        role: 'system',
        content: `Generate exactly 10 flashcards from the text below.

Return ONLY valid JSON.
Do NOT include explanation.
Do NOT include markdown.
Do NOT include any text before or after JSON.

Strict format:

[
  {
    "question": "Question text",
    "answer": "Answer text"
  }
]`
    },
    { role: 'user', content: `Text:\n${safeText}` }
];

async function run() {
    console.log("Calling Groq...");
    const output = await callGroq(messages);
    console.log("---- Raw output ----");
    console.log(output);
    const raw = output.trim();
    const jsonStart = raw.indexOf("[");
    const jsonEnd = raw.lastIndexOf("]");

    if (jsonStart === -1 || jsonEnd === -1) {
        throw new Error("Invalid JSON returned from LLM");
    }
    const jsonString = raw.slice(jsonStart, jsonEnd + 1);
    console.log("---- Extracted JSON ----");
    console.log(jsonString);
    const parsed = JSON.parse(jsonString);
    console.log("Parsed Array length:", parsed.length);
}
run().catch(console.error);
