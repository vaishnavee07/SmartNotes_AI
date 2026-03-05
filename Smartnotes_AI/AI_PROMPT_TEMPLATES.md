# AI Prompt Templates - SmartNotes AI

This document contains all the AI prompt templates used in the upgraded SmartNotes system.

---

## 1. Smart Study Notes Format

**Location:** `backend/services/llmService.js` → `generateSummary()`

**Purpose:** Generate quick revision notes in teaching style

**Template:**
```
You are an expert university teacher creating quick revision notes for students.

Generate SMART STUDY NOTES in the following format (250-300 words max):

━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📚 TOPIC OVERVIEW
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
2–3 lines explaining the main topic simply and clearly.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🎯 IMPORTANT TOPICS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• Topic 1
• Topic 2
• Topic 3
• Topic 4

━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📖 KEY DEFINITIONS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• Term 1 – simple one-line definition
• Term 2 – simple one-line definition
• Term 3 – simple one-line definition

━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📐 IMPORTANT FORMULAS (if applicable)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• Formula 1
• Formula 2

━━━━━━━━━━━━━━━━━━━━━━━━━━━━
💡 CONCEPT EXPLANATION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• Key concept 1 explained in 1-2 lines
• Key concept 2 explained in 1-2 lines
• Key concept 3 explained in 1-2 lines

━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📝 EXAMPLES (if helpful)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• Example 1 briefly explained
• Example 2 briefly explained

━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⭐ KEY POINTS FOR EXAMS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• Important concept 1 to remember
• Important concept 2 to remember
• Important concept 3 to remember

CRITICAL RULES:
- Keep it under 300 words total
- Use bullet points, avoid paragraphs
- Focus only on important concepts
- Make it student-friendly and exam-focused
- Skip formulas section if topic doesn't have any
- Skip examples section if not applicable

Source Content:
{content}
```

---

## 2. University-Style Flashcards (2/5/10 Marks)

**Location:** `backend/services/llmService.js` → `generateUniversityFlashcards()`

**Purpose:** Generate flashcards in engineering university exam format

**Template:**
```
Generate exam-oriented revision flashcards in UNIVERSITY EXAM FORMAT.

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
- Return ONLY valid JSON, no markdown, no extra text
```

**Expected Response Format:**
```json
{
  "twoMark": [
    {
      "question": "Define Neural Network",
      "answer": "A neural network is a computing system inspired by biological neural networks. It consists of interconnected nodes that process information using a connectionist approach."
    }
  ],
  "fiveMark": [
    {
      "question": "Explain Backpropagation",
      "answer": "Introduction:\nBackpropagation is a supervised learning algorithm used to train neural networks by minimizing error.\n\nKey Points:\n• Calculates gradient of loss function with respect to weights\n• Uses chain rule to propagate errors backward through network\n• Updates weights to reduce prediction error\n• Enables deep learning by efficiently training multi-layer networks\n\nConclusion: Backpropagation is essential for training modern deep neural networks."
    }
  ],
  "tenMark": [
    {
      "question": "Discuss Deep Learning architectures in detail",
      "answer": "Introduction:\nDeep learning uses artificial neural networks with multiple layers to learn hierarchical representations. These architectures have revolutionized AI applications.\n\nConcept Explanation\nDeep learning models automatically extract features from raw data through multiple processing layers.\n\nComponents/Techniques\n• Convolutional layers for spatial data\n• Recurrent layers for sequential data\n• Attention mechanisms for context\n\nAdvantages\n• Automatic feature extraction\n• High accuracy on complex tasks\n• Scalable to large datasets\n\nApplications/Examples\n• Image recognition and classification\n• Natural language processing\n• Autonomous vehicles\n\nConclusion: Deep learning has become the foundation of modern AI systems, enabling breakthrough performance across diverse domains."
    }
  ]
}
```

---

## 3. YouTube Video Notes

**Location:** `backend/services/llmService.js` → `generateNotesFromYouTube()`

**Purpose:** Generate study notes from YouTube video transcript

**Template:**
```
You are an expert university teacher creating quick revision notes from a YouTube video transcript.

Generate SMART STUDY NOTES in the following format (250-300 words max):

━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📚 TOPIC OVERVIEW
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
2–3 lines explaining the main topic covered in the video.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🎯 IMPORTANT TOPICS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• Topic 1
• Topic 2
• Topic 3
• Topic 4

━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📖 KEY DEFINITIONS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• Term 1 – simple one-line definition
• Term 2 – simple one-line definition

━━━━━━━━━━━━━━━━━━━━━━━━━━━━
💡 CONCEPT EXPLANATION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• Key concept 1 explained in 1-2 lines
• Key concept 2 explained in 1-2 lines
• Key concept 3 explained in 1-2 lines

━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⭐ KEY POINTS FOR EXAMS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• Important concept 1 to remember
• Important concept 2 to remember

CRITICAL RULES:
- Keep it under 300 words total
- Use bullet points, avoid paragraphs
- Focus only on important concepts
- Make it student-friendly and exam-focused

Video Transcript:
{transcript}
```

---

## 4. Text Input Notes

**Location:** `backend/services/llmService.js` → `generateNotesFromText()`

**Purpose:** Generate notes from pasted text content

**Note:** This uses the same template as the Smart Study Notes Format (Section 1 above).

---

## Usage Examples

### Example 1: Generating Smart Study Notes

**Input:**
```javascript
const notes = await generateSummary("Neural networks are composed of layers...");
```

**Output:**
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📚 TOPIC OVERVIEW
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Neural networks are computing systems inspired by biological neurons. They learn patterns from data through training.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🎯 IMPORTANT TOPICS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• Network Architecture
• Activation Functions
• Backpropagation
• Training Process

... (continued)
```

### Example 2: Generating University Flashcards

**Input:**
```javascript
const flashcards = await generateUniversityFlashcards("Explain neural networks...");
```

**Output:**
```json
{
  "twoMark": [
    {
      "question": "Define Perceptron",
      "answer": "A perceptron is the simplest neural network unit. It takes inputs, applies weights, and produces binary output."
    }
  ],
  "fiveMark": [...],
  "tenMark": [...]
}
```

---

## Customization Guide

### Adjusting Word Count

To change the word limit in study notes:

```javascript
// In llmService.js
const summaryPrompt = `
...
Generate SMART STUDY NOTES in the following format (400-500 words max):  // <-- Change here
...
`;
```

### Modifying Flashcard Count

To change the number of questions:

```javascript
// In generateUniversityFlashcards()
2 MARK QUESTIONS (Generate 6 questions):  // <-- Change from 4 to 6
5 MARK QUESTIONS (Generate 4 questions):  // <-- Change from 3 to 4
10 MARK QUESTIONS (Generate 3 questions): // <-- Change from 2 to 3
```

### Adding New Sections

To add new sections to study notes:

```javascript
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔍 REAL-WORLD APPLICATIONS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• Application 1
• Application 2
```

---

## LLM Configuration

**Model Used:** `llama-3.1-8b-instant` (Groq API)

**Parameters:**
- Temperature: `0.7`
- Max Tokens:
  - Study Notes: `1200`
  - Flashcards: `2000`
  - Default: `500`

**To Change Model:**
```javascript
// In llmService.js
const MODEL = 'llama-3.1-8b-instant';  // <-- Change model here
```

---

## Error Handling

All prompt templates include error handling:

```javascript
try {
    const result = await callGroq(systemPrompt, userPrompt, maxTokens);
    return result;
} catch (error) {
    console.error('LLM Error:', error);
    throw new Error('Failed to generate content');
}
```

---

## Best Practices

1. **Keep Prompts Clear:** Use explicit formatting instructions
2. **Limit Content Length:** Slice input to prevent token limits
3. **Validate JSON Output:** Always parse and validate JSON responses
4. **Handle Empty Sections:** Allow optional sections (formulas, examples)
5. **Maintain Consistency:** Use same formatting across all prompts

---

## Testing Prompts

To test a prompt template:

```javascript
// In backend, create test file
const { generateSummary } = require('./services/llmService');

const testContent = "Your test content here...";
generateSummary(testContent).then(result => {
    console.log(result);
});
```

---

## Notes

- All templates use markdown-like formatting for structure
- Emojis are used to make sections visually distinct
- Bullet points are preferred over paragraphs for readability
- Templates are optimized for university/exam preparation context
- JSON outputs are strictly validated before returning

---

**Last Updated:** March 5, 2026
