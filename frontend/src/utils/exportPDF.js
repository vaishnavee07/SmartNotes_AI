import { jsPDF } from 'jspdf';

/**
 * Clean text of emojis, unsupported line draw characters, and non-ASCII dashes
 */
const cleanText = (text) => {
    if (!text) return "";
    return text
        // Replace en-dash, em-dash, and other dash variations with normal hyphen
        .replace(/[\u2013\u2014]/g, '-')
        // Remove emojis and miscellaneous symbols/pictographs
        .replace(/[\uD83C-\uDBFF\uDC00-\uDFFF\u2600-\u27BF]/g, '')
        // Remove line-drawing and block characters
        .replace(/[━─═━═─═━━━━━━━━━━━━━━━━━━━━━━━━━━━━]/g, '')
        // Clean any duplicate spaces
        .replace(/\s+/g, ' ')
        .trim();
};

/**
 * Remove markdown bold/glow wrappers
 */
const stripMarkdown = (text) => {
    if (!text) return "";
    return text
        .replace(/<glow>/g, '')
        .replace(/<\/glow>/g, '')
        .replace(/\*\*/g, '')
        .replace(/\*/g, '')
        .replace(/__/g, '')
        .replace(/`/g, '')
        .trim();
};

/**
 * Helper to draw footer on each page
 */
const drawPageFooter = (doc, pageHeight, pageWidth, margin) => {
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(148, 163, 184); // Slate-400
    doc.text("SmartNotes AI - Your AI Learning Companion", margin, pageHeight - 10);
    doc.text(`Page ${doc.internal.getNumberOfPages()}`, pageWidth - margin - 15, pageHeight - 10);
};

/**
 * Generates a styled PDF from note content.
 * 
 * @param {Object} activeNote The active note object containing title, content, summary, etc.
 * @param {Function} setInlineError Callback to set an error state if generation fails.
 */
export const exportPDF = (activeNote, setInlineError) => {
    if (!activeNote) {
        if (setInlineError) setInlineError("No active note to export.");
        return;
    }

    try {
        const doc = new jsPDF();
        const pageHeight = doc.internal.pageSize.getHeight();
        const pageWidth = doc.internal.pageSize.getWidth();
        const margin = 20;
        let cursorY = margin;

        // --- Header (Brand) ---
        doc.setFillColor(139, 92, 246); // Primary color (Purple)
        doc.rect(0, 0, pageWidth, 15, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(10);
        doc.setFont("helvetica", "bold");
        doc.text("SmartNotes AI", margin, 9);
        
        doc.setTextColor(220, 220, 220);
        doc.setFont("helvetica", "normal");
        const dateStr = new Date().toLocaleDateString();
        doc.text(`Generated: ${dateStr}`, pageWidth - margin - 30, 9);

        cursorY = 28;

        // --- Note Title ---
        doc.setTextColor(30, 41, 59); // Slate-800
        doc.setFontSize(20);
        doc.setFont("helvetica", "bold");
        const cleanTitle = cleanText(stripMarkdown(activeNote.title || "SmartNote"));
        const titleLines = doc.splitTextToSize(cleanTitle, pageWidth - 2 * margin);
        doc.text(titleLines, margin, cursorY);
        cursorY += (titleLines.length * 8) + 4;

        // --- Separator Line ---
        doc.setDrawColor(226, 232, 240); // Slate-200
        doc.setLineWidth(0.5);
        doc.line(margin, cursorY, pageWidth - margin, cursorY);
        cursorY += 8;

        // --- Keywords ---
        if (activeNote.keywords && activeNote.keywords.length > 0) {
            doc.setFontSize(9);
            doc.setTextColor(100, 116, 139); // Slate-500
            doc.setFont("helvetica", "italic");
            const cleanedKeywords = activeNote.keywords.map(kw => cleanText(stripMarkdown(kw)));
            const keywordsStr = "Keywords: " + cleanedKeywords.join(', ');
            const kwLines = doc.splitTextToSize(keywordsStr, pageWidth - 2 * margin);
            doc.text(kwLines, margin, cursorY);
            cursorY += (kwLines.length * 4) + 8;
        }

        // --- Content Parse ---
        const rawContent = activeNote.content || activeNote.summary || "No content available.";
        const lines = rawContent.split('\n');

        // Draw initial footer for page 1
        drawPageFooter(doc, pageHeight, pageWidth, margin);

        for (let i = 0; i < lines.length; i++) {
            let line = lines[i].trim();
            if (!line) {
                cursorY += 4;
                continue;
            }

            // Detect decorative divider lines and replace with native vector lines
            if (line.includes('━') || line.includes('─') || line.includes('═') || line.trim() === '---') {
                doc.setDrawColor(226, 232, 240); // Slate-200
                doc.setLineWidth(0.5);
                doc.line(margin, cursorY, pageWidth - margin, cursorY);
                cursorY += 6;
                continue;
            }

            // Check page boundaries before printing
            if (cursorY > pageHeight - margin - 15) {
                doc.addPage();
                cursorY = margin + 10;
                drawPageFooter(doc, pageHeight, pageWidth, margin);
            }

            // Detect headings
            let isHeader = false;
            let headerLevel = 0;
            let headerText = '';

            if (line.startsWith('# ')) {
                isHeader = true;
                headerLevel = 1;
                headerText = line.substring(2);
            } else if (line.startsWith('## ')) {
                isHeader = true;
                headerLevel = 2;
                headerText = line.substring(3);
            } else if (line.startsWith('### ')) {
                isHeader = true;
                headerLevel = 3;
                headerText = line.substring(4);
            }

            // Also treat high-level text markers from standard prompts as headers
            const uppercaseLine = line.toUpperCase();
            if (!isHeader && (
                uppercaseLine.includes('KEY CONCEPTS') || 
                uppercaseLine.includes('TOPIC OVERVIEW') || 
                uppercaseLine.includes('KEY DEFINITIONS') || 
                uppercaseLine.includes('KEY EXAM POINTS') || 
                uppercaseLine.includes('IMPORTANT POINTS') || 
                uppercaseLine.includes('FORMULAS')
            )) {
                isHeader = true;
                headerLevel = 2;
                headerText = line;
            }

            if (isHeader) {
                const cleanedHeader = cleanText(stripMarkdown(headerText));
                if (!cleanedHeader) continue;

                // Layout and typography styling for headings
                if (headerLevel === 1) {
                    doc.setFontSize(15);
                    doc.setFont("helvetica", "bold");
                    doc.setTextColor(30, 41, 59); // Slate-800
                } else if (headerLevel === 2) {
                    doc.setFontSize(12);
                    doc.setFont("helvetica", "bold");
                    doc.setTextColor(51, 65, 85); // Slate-700
                } else {
                    doc.setFontSize(10.5);
                    doc.setFont("helvetica", "bold");
                    doc.setTextColor(71, 85, 105); // Slate-600
                }

                // Check page space for header block
                if (cursorY > pageHeight - margin - 20) {
                    doc.addPage();
                    cursorY = margin + 10;
                    drawPageFooter(doc, pageHeight, pageWidth, margin);
                }

                const splitText = doc.splitTextToSize(cleanedHeader, pageWidth - 2 * margin);
                doc.text(splitText, margin, cursorY);
                cursorY += (splitText.length * 6) + 4;

                // Underscore lines for prime headers
                if (headerLevel <= 2) {
                    doc.setDrawColor(241, 245, 249); // Slate-100
                    doc.setLineWidth(0.5);
                    doc.line(margin, cursorY - 2, pageWidth - margin, cursorY - 2);
                }
                continue;
            }

            // Detect list items (bullet points)
            const isBullet = line.startsWith('- ') || line.startsWith('* ') || line.startsWith('• ');
            if (isBullet) {
                let bulletContent = line.substring(2).trim();
                bulletContent = cleanText(stripMarkdown(bulletContent));
                if (!bulletContent) continue;

                doc.setFontSize(9.5);
                doc.setFont("helvetica", "normal");
                doc.setTextColor(51, 65, 85);

                const indent = 5;
                const splitText = doc.splitTextToSize(bulletContent, pageWidth - 2 * margin - indent);

                doc.text("•", margin, cursorY);
                doc.text(splitText, margin + indent, cursorY);
                cursorY += (splitText.length * 4.5) + 2.5;
                continue;
            }

            // Normal text line
            const cleanedText = cleanText(stripMarkdown(line));
            if (!cleanedText) continue;

            doc.setFontSize(9.5);
            doc.setFont("helvetica", "normal");
            doc.setTextColor(71, 85, 105); // Slate-600

            const splitText = doc.splitTextToSize(cleanedText, pageWidth - 2 * margin);
            doc.text(splitText, margin, cursorY);
            cursorY += (splitText.length * 4.5) + 3;
        }

        // Save file
        const filename = `${(activeNote.title || 'SmartNote').replace(/[^a-z0-9]/gi, '_').toLowerCase()}.pdf`;
        doc.save(filename);

    } catch (error) {
        console.error("PDF Export Error:", error);
        if (setInlineError) setInlineError("Failed to generate PDF: " + error.message);
    }
};
