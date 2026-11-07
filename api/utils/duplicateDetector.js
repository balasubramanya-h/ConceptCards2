/**
 * Intelligent Duplicate Detection Utility
 * Combines Levenshtein Distance, Jaccard Token Overlap, and Bigram/Trigram Dice Coefficient
 * to accurately identify duplicate or near-duplicate flashcards.
 */

// Common flashcard stop words / prompt prefixes that can cause false positives or inflate similarity
const STOP_PREFIXES = [
  'what is', 'what are', 'define', 'explain', 'describe', 'how does', 'how do',
  'what does', 'who is', 'who was', 'which is', 'why is', 'why does', 'list the'
];

/**
 * Normalizes input text by removing markdown, punctuation, and extra whitespace
 * @param {string} text
 * @returns {string}
 */
function cleanText(text) {
  if (!text) return '';
  let cleaned = text.toLowerCase();

  // Strip markdown formatting
  cleaned = cleaned.replace(/[*_#`~\[\]()]/g, ' ').trim();

  // Strip leading stop prefixes
  for (const prefix of STOP_PREFIXES) {
    if (cleaned.startsWith(prefix + ' ')) {
      cleaned = cleaned.substring(prefix.length).trim();
      break;
    }
  }

  // Strip punctuation and special characters
  cleaned = cleaned.replace(/[^\w\s]/g, ' ');

  // Collapse consecutive whitespaces
  cleaned = cleaned.replace(/\s+/g, ' ').trim();
  return cleaned;
}

/**
 * Calculates Levenshtein distance between two strings
 */
function levenshteinDistance(s1, s2) {
  const m = s1.length;
  const n = s2.length;
  if (m === 0) return n;
  if (n === 0) return m;

  const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));

  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = s1[i - 1] === s2[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,       // deletion
        dp[i][j - 1] + 1,       // insertion
        dp[i - 1][j - 1] + cost // substitution
      );
    }
  }

  return dp[m][n];
}

/**
 * Levenshtein-based similarity percentage (0.0 to 1.0)
 */
function levenshteinSimilarity(s1, s2) {
  if (s1 === s2) return 1.0;
  const maxLen = Math.max(s1.length, s2.length);
  if (maxLen === 0) return 1.0;
  const dist = levenshteinDistance(s1, s2);
  return 1 - dist / maxLen;
}

/**
 * Jaccard token similarity (word set intersection / union)
 */
function jaccardSimilarity(s1, s2) {
  const words1 = new Set(s1.split(' ').filter(Boolean));
  const words2 = new Set(s2.split(' ').filter(Boolean));

  if (words1.size === 0 && words2.size === 0) return 1.0;
  if (words1.size === 0 || words2.size === 0) return 0.0;

  let intersectionCount = 0;
  for (const w of words1) {
    if (words2.has(w)) intersectionCount++;
  }

  const unionSize = new Set([...words1, ...words2]).size;
  return intersectionCount / unionSize;
}

/**
 * Bigram Dice's coefficient
 */
function bigramDiceSimilarity(s1, s2) {
  if (s1 === s2) return 1.0;
  if (s1.length < 2 || s2.length < 2) return 0.0;

  const getBigrams = (str) => {
    const bigrams = new Map();
    for (let i = 0; i < str.length - 1; i++) {
      const bg = str.slice(i, i + 2);
      bigrams.set(bg, (bigrams.get(bg) || 0) + 1);
    }
    return bigrams;
  };

  const bg1 = getBigrams(s1);
  const bg2 = getBigrams(s2);

  let intersection = 0;
  for (const [bg, count1] of bg1.entries()) {
    if (bg2.has(bg)) {
      intersection += Math.min(count1, bg2.get(bg));
    }
  }

  const total = (s1.length - 1) + (s2.length - 1);
  return (2.0 * intersection) / total;
}

/**
 * Composite similarity between two text strings (0 to 100)
 */
function calculateTextSimilarity(text1, text2) {
  const clean1 = cleanText(text1);
  const clean2 = cleanText(text2);

  if (!clean1 && !clean2) return 100;
  if (!clean1 || !clean2) return 0;
  if (clean1 === clean2) return 100;

  const levSim = levenshteinSimilarity(clean1, clean2);
  const jacSim = jaccardSimilarity(clean1, clean2);
  const diceSim = bigramDiceSimilarity(clean1, clean2);

  // Weighted composite score: Dice (40%), Jaccard (40%), Levenshtein (20%)
  const composite = diceSim * 0.4 + jacSim * 0.4 + levSim * 0.2;
  return Math.round(composite * 100);
}

/**
 * Checks a candidate card against an array of existing cards
 *
 * @param {Object} candidate - { front: string, back?: string, _id?: string }
 * @param {Array<Object>} existingCards - array of cards to check against
 * @param {number} [threshold=60] - minimum similarity threshold to flag
 * @returns {Object} result with matches and duplicate verdict
 */
function findDuplicates(candidate, existingCards = [], threshold = 60) {
  if (!candidate || !candidate.front || !Array.isArray(existingCards) || existingCards.length === 0) {
    return {
      hasDuplicate: false,
      highestScore: 0,
      severity: 'none',
      matches: [],
    };
  }

  const candidateId = candidate._id ? candidate._id.toString() : null;
  const matches = [];

  for (const card of existingCards) {
    // Skip self if editing existing card
    if (candidateId && card._id && card._id.toString() === candidateId) {
      continue;
    }

    const frontSimilarity = calculateTextSimilarity(candidate.front, card.front);

    let backSimilarity = 0;
    if (candidate.back && card.back) {
      backSimilarity = calculateTextSimilarity(candidate.back, card.back);
    }

    // Front is primary (80%), back is secondary (20%)
    const overallScore = candidate.back
      ? Math.round(frontSimilarity * 0.8 + backSimilarity * 0.2)
      : frontSimilarity;

    if (overallScore >= threshold) {
      matches.push({
        cardId: card._id,
        front: card.front,
        back: card.back,
        deckId: card.deck,
        similarity: overallScore,
        frontSimilarity,
        backSimilarity,
      });
    }
  }

  // Sort descending by highest similarity
  matches.sort((a, b) => b.similarity - a.similarity);

  const highestScore = matches.length > 0 ? matches[0].similarity : 0;
  let severity = 'none';

  if (highestScore >= 85) {
    severity = 'high'; // Definite or near-exact duplicate
  } else if (highestScore >= 65) {
    severity = 'warning'; // Likely duplicate or rephrased
  } else if (highestScore >= threshold) {
    severity = 'info'; // Minor overlap
  }

  return {
    hasDuplicate: matches.length > 0,
    highestScore,
    severity,
    matches: matches.slice(0, 5), // Return top 5 matches
  };
}

module.exports = {
  cleanText,
  calculateTextSimilarity,
  findDuplicates,
};

