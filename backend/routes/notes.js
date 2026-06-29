const express = require('express');
const router = express.Router();
const upload = require('../middleware/upload');
const { protect } = require('../middleware/auth');
const Note = require('../models/Note');
const { performImageOCR, extractPDFText } = require('../services/ocrService');
const { preprocessText, extractKeywords } = require('../services/nlpService');
const {
    generateSummary,
    generateCompactRevisionNotes
} = require('../services/llmService');
const fs = require('fs');
const path = require('path');

// ─────────────────────────────────────────────────────────────
// HELPER: Split text into chunks of `chunkSize` characters
// ─────────────────────────────────────────────────────────────
function chunkText(text, chunkSize = 8000) {
    const chunks = [];
    for (let i = 0; i < text.length; i += chunkSize) {
        chunks.push(text.slice(i, i + chunkSize));
    }
    return chunks;
}

// ─────────────────────────────────────────────────────────────
// @desc    Upload new note and process it
// @route   POST /api/notes/upload
// @access  Private
//
// NEW PIPELINE:
//   PDF/Image → extract raw text
//   → chunk (3000 chars each)
//   → generateSummary() per chunk   [concise bullet notes ≤ 300 words each]
//   → generateCompactRevisionNotes() [consolidate all into ≤ 600-word final note]
//   → save compact final note as note.summary
// ─────────────────────────────────────────────────────────────
router.post('/upload', protect, upload.single('file'), async (req, res) => {
    try {
        const { title, sourceType, textContent } = req.body;
        let rawContent = textContent || '';
        let originalFileUrl = '';

        // ── Step 1: Extract raw text from file ─────────────────
        if (sourceType === 'image' || sourceType === 'pdf') {
            if (!req.file) {
                return res.status(400).json({ error: 'File is required for image/pdf type' });
            }

            const uploadDir = path.join(__dirname, '..', 'uploads');
            if (!fs.existsSync(uploadDir)) {
                fs.mkdirSync(uploadDir, { recursive: true });
            }
            const fileName = `${Date.now()}_${req.file.originalname}`;
            const filePath = path.join(uploadDir, fileName);
            fs.writeFileSync(filePath, req.file.buffer);

            originalFileUrl = `/uploads/${fileName}`;

            if (sourceType === 'image') {
                console.log(`[Upload] Starting Image OCR...`);
                rawContent = await performImageOCR(filePath);
                console.log(`[Upload] Image OCR complete. Characters: ${rawContent.length}`);
            } else if (sourceType === 'pdf') {
                console.log(`[Upload] Starting PDF text extraction...`);
                rawContent = await extractPDFText(filePath);
                console.log(`[Upload] PDF extraction complete. Characters: ${rawContent.length}`);
            }
        }

        if (!rawContent || rawContent.trim().length === 0) {
            return res.status(400).json({ error: 'Could not extract any content from the file.' });
        }

        // ── Step 2: NLP preprocessing ──────────────────────────
        const tokens = preprocessText(rawContent);
        const keywords = extractKeywords(rawContent);

        // ── Step 3: Generate revision notes ───────────────────
        let finalSummary = 'Summary generation pending due to rate limits.';

        try {
            // ── FAST PATH: small doc → single direct call ──────
            // llama-3.1-8b-instant context window is 128k tokens.
            // 15000 chars ≈ 3750 tokens — well within one call.
            if (rawContent.length <= 15000) {
                console.log(`[Upload] Small doc (${rawContent.length} chars) — single direct call`);
                finalSummary = await generateSummary(rawContent.slice(0, 15000), 1200);
                console.log(`[Upload] Notes ready: ${finalSummary.length} chars`);

            // ── SEQUENTIAL PATH: large doc → process chunks one by one ───
            } else {
                const chunks = chunkText(rawContent, 8000);
                console.log(`[Upload] Large doc (${rawContent.length} chars) → ${chunks.length} chunks. Processing sequentially with rate limit protection.`);

                const chunkSummaries = [];
                for (let i = 0; i < chunks.length; i++) {
                    console.log(`[Upload] Processing chunk ${i + 1}/${chunks.length}...`);
                    
                    let success = false;
                    let retries = 0;
                    const maxRetries = 3;

                    while (!success && retries <= maxRetries) {
                        try {
                            if (i > 0) {
                                // Add 3s base delay between chunks to respect TPM/RPM limits
                                await new Promise(resolve => setTimeout(resolve, 3000));
                            }
                            
                            const summary = await generateSummary(chunks[i], 800);
                            if (summary) {
                                chunkSummaries.push(summary);
                                success = true;
                                console.log(`[Upload] Chunk ${i + 1} processed successfully.`);
                            } else {
                                throw new Error("Empty summary returned by LLM.");
                            }
                        } catch (err) {
                            retries++;
                            console.error(`[Upload] Chunk ${i + 1} failed (Attempt ${retries}/${maxRetries + 1}):`, err.message);
                            
                            if (retries <= maxRetries) {
                                const backoff = retries * 5000;
                                console.log(`[Upload] Rate limit protection: waiting ${backoff}ms before retry...`);
                                await new Promise(resolve => setTimeout(resolve, backoff));
                            } else {
                                console.error(`[Upload] Chunk ${i + 1} permanently failed after retries.`);
                            }
                        }
                    }
                }

                console.log(`[Upload] ${chunkSummaries.length}/${chunks.length} chunks summarised`);

                if (chunkSummaries.length === 0) {
                    finalSummary = 'Could not generate summary due to AI rate limits. Please try again.';
                } else if (chunkSummaries.length === 1) {
                    finalSummary = chunkSummaries[0];
                } else {
                    console.log(`[Upload] Consolidating ${chunkSummaries.length} summaries...`);
                    // Delay before consolidation to avoid hitting limit
                    await new Promise(resolve => setTimeout(resolve, 4000));
                    finalSummary = await generateCompactRevisionNotes(chunkSummaries);
                    console.log(`[Upload] Final note ready: ${finalSummary.length} chars`);
                }
            }
        } catch (llmError) {
            console.error('[Upload] LLM pipeline error:', llmError.message);
            finalSummary = 'Partial summary available. AI processing was interrupted.';
        }

        // ── Step 5: Persist note to MongoDB ───────────────────
        console.log(`[Upload] Saving note to DB...`);
        const note = await Note.create({
            userId: req.user.id,
            title: title || 'Untitled Note',
            sourceType,
            originalFileUrl,
            rawContent,
            content: finalSummary,
            processedContent: tokens.join(' '),
            keywords,
            summary: finalSummary
        });

        console.log(`[Upload] Note saved. ID: ${note._id} | Summary length: ${finalSummary.length} chars`);
        res.status(201).json(note);

    } catch (error) {
        console.error('[Upload] Fatal error:', error);
        res.status(500).json({ error: error.message || 'Failed to process file.' });
    }
});

// ─────────────────────────────────────────────────────────────
// @desc    Get all user notes
// @route   GET /api/notes
// @access  Private
// ─────────────────────────────────────────────────────────────
router.get('/', protect, async (req, res) => {
    try {
        const notes = await Note.find({ userId: req.user.id }).sort('-createdAt');
        res.json(notes);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
