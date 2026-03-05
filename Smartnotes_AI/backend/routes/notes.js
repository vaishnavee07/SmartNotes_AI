const express = require('express');
const router = express.Router();
const upload = require('../middleware/upload');
const { protect } = require('../middleware/auth');
const Note = require('../models/Note');
const { performImageOCR, extractPDFText } = require('../services/ocrService');
const { preprocessText, extractKeywords, segmentTopics } = require('../services/nlpService');
const { generateSummary, generateFlashcards } = require('../services/llmService');
const fs = require('fs');
const path = require('path');

// @desc    Upload new note and process it
// @route   POST /api/notes/upload
// @access  Private
router.post('/upload', protect, upload.single('file'), async (req, res) => {
    try {
        const { title, sourceType, textContent } = req.body;
        let rawContent = textContent || '';
        let originalFileUrl = '';

        if (sourceType === 'image' || sourceType === 'pdf') {
            if (!req.file) {
                return res.status(400).json({ error: 'File is required for image/pdf type' });
            }

            // Write file permanently to uploads directory so it can be reused later
            const uploadDir = path.join(__dirname, '..', 'uploads');
            if (!fs.existsSync(uploadDir)) {
                fs.mkdirSync(uploadDir);
            }
            const fileName = `${Date.now()}_${req.file.originalname}`;
            const filePath = path.join(uploadDir, fileName);
            fs.writeFileSync(filePath, req.file.buffer);

            originalFileUrl = `/uploads/${fileName}`;

            if (sourceType === 'image') {
                console.log(`[Upload] Starting Image OCR...`);
                rawContent = await performImageOCR(filePath);
                console.log(`[Upload] Image OCR complete. Characters extracted: ${rawContent.length}`);
            } else if (sourceType === 'pdf') {
                console.log(`[Upload] Starting PDF text extraction...`);
                rawContent = await extractPDFText(filePath);
                console.log(`[Upload] PDF extraction complete. Characters extracted: ${rawContent.length}`);
            }

            // Notice: Removed fs.unlinkSync(tempPath) to preserve the file for future quizzes/flashcards
        }

        if (!rawContent) {
            return res.status(400).json({ error: 'Could not extract any content.' });
        }

        function chunkText(text, chunkSize = 8000) {
            const chunks = [];
            for (let i = 0; i < text.length; i += chunkSize) {
                chunks.push(text.slice(i, i + chunkSize));
            }
            return chunks;
        }

        // NLP Processing
        const tokens = preprocessText(rawContent);
        const keywords = extractKeywords(rawContent);

        // AI Generation with chunking to avoid rate limits
        let summary = "Summary generation pending due to rate limits.";
        try {
            console.log(`[Upload] Extracted text length: ${rawContent.length} characters`);
            const chunks = chunkText(rawContent, 1500);
            console.log(`[Upload] Split text into ${chunks.length} chunks`);
            let combinedSummary = "";

            for (let i = 0; i < chunks.length; i++) {
                try {
                    console.log(`[Upload] Sending chunk ${i + 1}/${chunks.length} to Groq LLM (${chunks[i].length} chars)...`);
                    const chunkResult = await generateSummary(chunks[i], 800);
                    combinedSummary += chunkResult + "\n\n";
                    console.log(`[Upload] Chunk ${i + 1}/${chunks.length} complete.`);
                } catch (chunkError) {
                    console.error(`[Upload] LLM Summary skipped for chunk ${i + 1} due to error:`, chunkError.message);
                }

                // Delay between requests to avoid hitting rate limit
                if (i < chunks.length - 1) {
                    await new Promise(resolve => setTimeout(resolve, 1500));
                }
            }
            if (combinedSummary.trim().length > 0) {
                summary = combinedSummary.trim();
                console.log(`[Upload] Final combined summary length: ${summary.length} characters`);
            }
        } catch (llmError) {
            console.error('[Upload] LLM catch-all error:', llmError.message);
        }

        console.log(`[Upload] Saving note to DB...`);
        const note = await Note.create({
            userId: req.user.id,
            title: title || 'Untitled Note',
            sourceType,
            originalFileUrl,
            rawContent,
            content: summary, // Adding content fallback if frontend expects it
            processedContent: tokens.join(' '),
            keywords,
            summary
        });
        console.log(`[Upload] Note saved successfully with ID: ${note._id}`);

        res.status(201).json(note);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
});

// @desc    Get all user notes
// @route   GET /api/notes
// @access  Private
router.get('/', protect, async (req, res) => {
    try {
        const notes = await Note.find({ userId: req.user.id }).sort('-createdAt');
        res.json(notes);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
