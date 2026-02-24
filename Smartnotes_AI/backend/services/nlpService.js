const natural = require('natural');
const { removeStopwords } = require('stopword');

const TfIdf = natural.TfIdf;
const tokenizer = new natural.WordTokenizer();

/**
 * Preprocess text: lowercase, sanitize, tokenize, remove stopwords
 */
const preprocessText = (text) => {
    // Lowercase and tokenize
    const tokens = tokenizer.tokenize(text.toLowerCase());
    // Remove stopwords
    const cleanTokens = removeStopwords(tokens);
    return cleanTokens;
};

/**
 * Extract keywords using TF-IDF
 */
const extractKeywords = (text, topN = 10) => {
    const tfidf = new TfIdf();
    tfidf.addDocument(text);

    const keywords = [];
    tfidf.listTerms(0).forEach((item) => {
        if (item.term.length > 2) {
            keywords.push(item.term);
        }
    });

    return keywords.slice(0, topN);
};

/**
 * Perform basic topic segmentation (e.g., segmenting by paragraphs/headers)
 */
const segmentTopics = (text) => {
    // Basic heuristic: split by double newlines to represent paragraphs/topics
    const segments = text.split(/\n\s*\n/);
    return segments.filter(seg => seg.trim().length > 20); // Filter out very short segments
};

module.exports = {
    preprocessText,
    extractKeywords,
    segmentTopics,
};
