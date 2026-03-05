const Groq = require('groq-sdk');
const dotenv = require('dotenv');

dotenv.config();

const groq = new Groq({
    apiKey: process.env.GROQ_API_KEY,
});

const MODEL = 'llama-3.1-8b-instant';

/**
 * Helper to call Groq API
 */
const callGroq = async (systemPrompt, userPrompt, maxTokens = null) => {
    try {
        const payload = {
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userPrompt }
            ],
            model: MODEL,
            temperature: 0.7,
            max_tokens: maxTokens || 500,
        };
        const chatCompletion = await groq.chat.completions.create(payload);
        return chatCompletion.choices[0].message.content;
    } catch (error) {
        console.error('Groq API Error:', error.response?.data || error.message);
        throw new Error('LLM Error generation failed');
    }
};

/**
 * Generate Smart AI Study Notes (University Exam Format)
 */
const generateSummary = async (text, maxTokens = 2000) => {
    const contentText = text.slice(0, 10000);
    const summaryPrompt = `
You are an expert university teacher creating detailed study notes for students.

Generate UNIVERSITY-STYLE STUDY NOTES in the following format (600-800 words):

━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📚 TOPIC OVERVIEW
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
3–4 lines explaining the main topic simply and clearly.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🎯 IMPORTANT TOPICS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• Topic 1
• Topic 2
• Topic 3
• Topic 4
• Topic 5
• Topic 6 (add up to 8 if applicable)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📖 KEY DEFINITIONS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• Term 1 – simple one-line definition
• Term 2 – simple one-line definition
• Term 3 – simple one-line definition
• Term 4 – simple one-line definition
• Term 5 – simple one-line definition

━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📐 IMPORTANT FORMULAS (if applicable)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• Formula 1
• Formula 2

━━━━━━━━━━━━━━━━━━━━━━━━━━━━
💡 CONCEPT EXPLANATION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• Key concept 1 explained in 2-3 lines
• Key concept 2 explained in 2-3 lines
• Key concept 3 explained in 2-3 lines
• Key concept 4 explained in 2-3 lines

━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📝 EXAMPLES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• Example 1 briefly explained
• Example 2 briefly explained
• Example 3 briefly explained

━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⭐ KEY POINTS FOR EXAMS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• Important concept 1 to remember
• Important concept 2 to remember
• Important concept 3 to remember
• Important concept 4 to remember
• Important concept 5 to remember
• Important concept 6 to remember (add up to 8 if applicable)

CRITICAL RULES:
- Aim for 600-800 words total
- Use bullet points, avoid long paragraphs
- Focus only on important concepts
- Make it student-friendly and exam-focused
- Use simple language a student can understand quickly
- Skip the formulas section if the topic has none
- Always include the examples section with 2-3 short examples

Source Content:
${contentText}
`;
    return await callGroq("You are an expert university teacher.", summaryPrompt, maxTokens);
};

/**
 * Generate flashcards (JSON format)
 */
const generateFlashcards = async (text) => {
    const safeText = text.slice(0, 2500);
    const systemPrompt = `Generate exactly 10 flashcards from the text below.

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
]`;
    const response = await callGroq(systemPrompt, `Text:\n${safeText}`);
    try {
        const raw = response.trim();
        const jsonStart = raw.indexOf("[");
        const jsonEnd = raw.lastIndexOf("]");

        if (jsonStart === -1 || jsonEnd === -1) {
            throw new Error("Invalid JSON returned from LLM");
        }

        const jsonString = raw.slice(jsonStart, jsonEnd + 1);
        return JSON.parse(jsonString);
    } catch (e) {
        console.error("JSON Parse Error in generateFlashcards:", e.message);
        throw new Error("Failed to parse flashcards JSON");
    }
};

/**
 * Generate multiple choice quiz (JSON format)
 */
const generateQuiz = async (content, numQuestions = 10) => {
    const systemPrompt = `You are a strict technical examiner. Generate exactly ${numQuestions} Multiple Choice Questions based strictly on the Source Content below.

CRITICAL INSTRUCTIONS:
1. Each question must have EXACTLY 4 options.
2. Each question must include an 'explanation' string explaining why the correct answer is correct.
3. Return ONLY a valid JSON array of objects. NO markdown formatting. NO intro. NO \`\`\`json wrappers.

Strict JSON Output format:
[
  {
    "question": "Question text here?",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "correctOption": 1, 
    "explanation": "Explanation for the correct answer..."
  }
]
Note: 'correctOption' must be an integer index between 0 and 3.

Source Content:
${content.slice(0, 2500)}
`;
    const response = await callGroq(systemPrompt, "Please generate the multiple choice quiz based strictly on the source content.");
    try {
        const raw = response.trim();
        const jsonStart = raw.indexOf("[");
        const jsonEnd = raw.lastIndexOf("]");

        if (jsonStart === -1 || jsonEnd === -1) {
            throw new Error("Invalid JSON returned from LLM");
        }

        const jsonString = raw.slice(jsonStart, jsonEnd + 1);
        return JSON.parse(jsonString);
    } catch (e) {
        console.error("JSON Parse Error in generateQuiz:", e.message);
        throw new Error("Failed to parse quiz JSON");
    }
};

/**
 * Generate structured answer for exam prep (e.g. 5M, 8M, 16M questions)
 */
const generateStructuredAnswer = async (question, marks) => {
    const safeText = question.slice(0, 2500);
    const systemPrompt = `You are answering an exam question worth ${marks} marks. Structure your answer with an introduction, main body points with clear headings, and a conclusion.`;
    return await callGroq(systemPrompt, safeText);
};

/**
 * Generate Study Planner
 */
const generateRevisionRoadmap = async (pdfText, examDate, availableHours) => {
    const systemPrompt = `You are an expert academic planner. Based on the Source Content below, create a structured day-by-day study schedule leading up to the Target Exam Date: ${examDate}. The student can study for ${availableHours} hours per day.

CRITICAL INSTRUCTIONS:
1. Divide topics logically across the available days.
2. Include at least 1 day for Revision.
3. Return ONLY a valid JSON object. NO markdown formatting. NO intro. NO \`\`\`json wrappers.

Strict JSON Output format:
{
  "examDate": "${examDate}",
  "plan": [
    {
      "day": "Day 1 (YYYY-MM-DD)",
      "topics": ["Topic 1", "Topic 2"],
      "hours": ${availableHours},
      "status": "pending"
    }
  ]
}

Source Content:
${pdfText.slice(0, 2500)}
`;
    const response = await callGroq(systemPrompt, "Please generate the study plan based strictly on the source content.");
    try {
        return JSON.parse(response);
    } catch (e) {
        const cleanJSON = response.replace(/```json/g, '').replace(/```/g, '');
        return JSON.parse(cleanJSON);
    }
};

/**
 * Generate Question Paper (JSON format)
 */
const generateQuestionPaper = async (content, marks, difficulty) => {
    let structureStr = "";
    if (parseInt(marks) === 50) {
        structureStr = `
- Section A: 5 questions × 2 marks each
- Section B: 2 questions × 8 marks each
- Section C: 1 question × 16 marks`;
    } else {
        structureStr = `
- Section A: 10 questions × 2 marks each
- Section B: 5 questions × 8 marks each
- Section C: 5 questions × 16 marks each`;
    }

    const systemPrompt = `You are an expert University Professor. Generate a formal university-style examination question paper worth ${marks} marks with a ${difficulty} difficulty level.

CRITICAL INSTRUCTIONS:
1. ALL questions MUST be strictly derived from the provided Source Content.
2. ALL questions MUST be descriptive, theory-based, or analytical. ABSOLUTELY NO Multiple Choice Questions (MCQs).
3. You MUST adhere to this exact structure: ${structureStr}

Return ONLY a valid JSON object matching this strict format, with NO markdown formatting, NO introduction, NO \`\`\`json wrappers:
{
  "sections": [
    {
      "sectionName": "Section A",
      "marksPerQuestion": 2,
      "questions": [ { "question": "..." } ]
    },
    {
      "sectionName": "Section B",
      "marksPerQuestion": 8,
      "questions": [ { "question": "..." } ]
    },
    {
      "sectionName": "Section C",
      "marksPerQuestion": 16,
      "questions": [ { "question": "..." } ]
    }
  ]
}

Source Content:
${content.slice(0, 2500)}
`;
    const response = await callGroq(systemPrompt, "Please generate the question paper based on the source content strictly.");
    try {
        return JSON.parse(response);
    } catch (e) {
        const cleanJSON = response.replace(/```json/g, '').replace(/```/g, '');
        return JSON.parse(cleanJSON);
    }
};

/**
 * Contextual study chat response
 */
const studyChatResponse = async (context, query) => {
    const safeContext = context.slice(0, 2500);
    const systemPrompt = `You are a helpful tutor answering a student's question based strictly on their notes context. Context: ${safeContext}`;
    return await callGroq(systemPrompt, query);
};

/**
 * Generate University-Style Flashcards (2/5/10 marks format)
 */
const generateUniversityFlashcards = async (text) => {
    const safeText = text.slice(0, 4000);
    const systemPrompt = `Generate exam-oriented revision flashcards in UNIVERSITY EXAM FORMAT.

CRITICAL FORMAT RULES:

━━━━━━━━━━━━━━━━━━━━━━━━━━━━
2 MARK QUESTIONS (Generate 4 questions):
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Answer format: Maximum 2–3 lines, direct definition or concept explanation. No long paragraphs.

Example Answer Structure:
"[Term/Concept] is [definition]. It is characterized by [key point]."

━━━━━━━━━━━━━━━━━━━━━━━━━━━━
5 MARK QUESTIONS (Generate 3 questions):
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Answer format:
1. Definition/Introduction (2-3 lines)
2. Key Points:
   • Point 1 – short explanation
   • Point 2 – short explanation
   • Point 3 – short explanation
3. Short conclusion sentence

━━━━━━━━━━━━━━━━━━━━━━━━━━━━
10 MARK QUESTIONS (Generate 2 questions):
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Answer format:
1. Introduction (3-4 lines)
2. Main Explanation with Headings:
   • Concept Explanation
   • Components/Techniques
   • Advantages
   • Applications/Examples
3. Conclusion (2 lines)

STRICT JSON OUTPUT:

{
  "twoMark": [
    { "question": "Define X", "answer": "X is... [2-3 lines max]" }
  ],
  "fiveMark": [
    { "question": "Explain Y", "answer": "Introduction...\\n\\nKey Points:\\n• Point 1\\n• Point 2\\n• Point 3\\n\\nConclusion..." }
  ],
  "tenMark": [
    { "question": "Discuss Z in detail", "answer": "Introduction...\\n\\nConcept Explanation\\n...\\n\\nAdvantages\\n...\\n\\nConclusion..." }
  ]
}

IMPORTANT:
- Answers MUST follow university exam writing style
- Use headings and bullet points
- Avoid continuous paragraphs
- Keep answers structured and exam-friendly
- Return ONLY valid JSON, no markdown, no extra text`;

    const response = await callGroq(systemPrompt, `Text:\n${safeText}`, 2000);
    try {
        const raw = response.trim();
        const jsonStart = raw.indexOf("{");
        const jsonEnd = raw.lastIndexOf("}");

        if (jsonStart === -1 || jsonEnd === -1) {
            throw new Error("Invalid JSON returned from LLM");
        }

        const jsonString = raw.slice(jsonStart, jsonEnd + 1);
        return JSON.parse(jsonString);
    } catch (e) {
        console.error("JSON Parse Error in generateUniversityFlashcards:", e.message);
        throw new Error("Failed to parse flashcards JSON");
    }
};

/**
 * Generate notes from text input
 */
const generateNotesFromText = async (text) => {
    return await generateSummary(text, 1200);
};

/**
 * Generate notes from YouTube transcript
 */
const generateNotesFromYouTube = async (transcript) => {
    const safeTranscript = transcript.slice(0, 10000);
    const prompt = `
You are an expert university teacher creating detailed study notes from a YouTube video transcript.

Generate UNIVERSITY-STYLE STUDY NOTES in the following format (600-800 words):

━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📚 TOPIC OVERVIEW
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
3–4 lines explaining the main topic covered in the video.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🎯 IMPORTANT TOPICS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• Topic 1
• Topic 2
• Topic 3
• Topic 4
• Topic 5
• Topic 6 (add up to 8 if applicable)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📖 KEY DEFINITIONS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• Term 1 – simple one-line definition
• Term 2 – simple one-line definition
• Term 3 – simple one-line definition
• Term 4 – simple one-line definition
• Term 5 – simple one-line definition

━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📐 IMPORTANT FORMULAS (if applicable)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• Formula 1
• Formula 2

━━━━━━━━━━━━━━━━━━━━━━━━━━━━
💡 CONCEPT EXPLANATION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• Key concept 1 explained in 2-3 lines
• Key concept 2 explained in 2-3 lines
• Key concept 3 explained in 2-3 lines
• Key concept 4 explained in 2-3 lines

━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📝 EXAMPLES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• Example 1 briefly explained
• Example 2 briefly explained
• Example 3 briefly explained

━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⭐ KEY POINTS FOR EXAMS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• Important concept 1 to remember
• Important concept 2 to remember
• Important concept 3 to remember
• Important concept 4 to remember
• Important concept 5 to remember
• Important concept 6 to remember (add up to 8 if applicable)

CRITICAL RULES:
- Aim for 600-800 words total
- Use bullet points, avoid long paragraphs
- Focus only on important concepts
- Make it student-friendly and exam-focused
- Use simple language a student can understand quickly
- Skip the formulas section if the topic has none
- Always include the examples section with 2-3 short examples

Video Transcript:
${safeTranscript}
`;
    return await callGroq("You are an expert university teacher.", prompt, 2000);
};

module.exports = {
    generateSummary,
    generateFlashcards,
    generateQuiz,
    generateStructuredAnswer,
    generateRevisionRoadmap,
    studyChatResponse,
    generateQuestionPaper,
    generateUniversityFlashcards,
    generateNotesFromText,
    generateNotesFromYouTube,
};
