/**
 * SuperMemo 2 (SM-2) Spaced Repetition Algorithm Implementation
 *
 * References:
 * - P. A. Wozniak, "Optimization of learning", Master's Thesis, University of Technology in Poznan, 1990.
 *
 * Quality ratings (q):
 * 0 - Complete blackout
 * 1 - Incorrect; remembered upon seeing solution
 * 2 - Incorrect; where the correct answer seemed easy to recall
 * 3 - Correct response recalled with serious difficulty
 * 4 - Correct response after hesitation
 * 5 - Perfect recall
 */

const MIN_EASE_FACTOR = 1.3;
const DEFAULT_EASE_FACTOR = 2.5;

/**
 * Calculates updated SM-2 parameters for a given card and user response quality.
 *
 * @param {Object} card Current card state
 * @param {number} [card.repetition=0] Number of consecutive successful reviews
 * @param {number} [card.interval=0] Current interval in days
 * @param {number} [card.easeFactor=2.5] Current ease factor (>= 1.3)
 * @param {number} [card.lapses=0] Times the card was forgotten
 * @param {number} quality Grade from 0 to 5
 * @returns {Object} Updated spaced repetition state
 */
function calculateSM2(card, quality) {
  const currentRepetition = typeof card.repetition === 'number' ? card.repetition : 0;
  const currentInterval = typeof card.interval === 'number' ? card.interval : 0;
  const currentEF = typeof card.easeFactor === 'number' && card.easeFactor >= MIN_EASE_FACTOR
    ? card.easeFactor
    : DEFAULT_EASE_FACTOR;
  const currentLapses = typeof card.lapses === 'number' ? card.lapses : 0;

  const q = Math.max(0, Math.min(5, Math.round(quality)));

  let newRepetition;
  let newInterval;
  let newLapses = currentLapses;

  if (q < 3) {
    // Incorrect recall: reset repetition chain
    newRepetition = 0;
    newInterval = 1; // Re-review next day (or within current session)
    newLapses += 1;
  } else {
    // Correct recall: advance interval
    if (currentRepetition === 0) {
      newInterval = 1;
    } else if (currentRepetition === 1) {
      newInterval = 6;
    } else {
      newInterval = Math.max(1, Math.round(currentInterval * currentEF));
    }
    newRepetition = currentRepetition + 1;
  }

  // Calculate new Ease Factor:
  // EF' = EF + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02))
  const efDelta = 0.1 - (5 - q) * (0.08 + (5 - q) * 0.02);
  let newEF = currentEF + efDelta;
  if (newEF < MIN_EASE_FACTOR) {
    newEF = MIN_EASE_FACTOR;
  }
  newEF = Math.round(newEF * 100) / 100;

  // Determine mastery level
  let masteryLevel = 'New';
  if (newRepetition === 0) {
    masteryLevel = currentRepetition === 0 && currentLapses === 0 ? 'New' : 'Learning';
  } else if (newInterval >= 21 || newRepetition >= 5) {
    masteryLevel = 'Mastered';
  } else if (newInterval >= 6 || newRepetition >= 2) {
    masteryLevel = 'Review';
  } else {
    masteryLevel = 'Learning';
  }

  const now = new Date();
  const nextReviewDate = new Date(now.getTime() + newInterval * 24 * 60 * 60 * 1000);

  return {
    repetition: newRepetition,
    interval: newInterval,
    easeFactor: newEF,
    nextReviewDate,
    lastReviewedDate: now,
    masteryLevel,
    lapses: newLapses,
  };
}

/**
 * Formats day interval into a human-readable badge label (e.g., '1d', '6d', '1.2m')
 *
 * @param {number} days
 * @returns {string}
 */
function formatIntervalText(days) {
  if (days <= 0) return '<1d';
  if (days === 1) return '1d';
  if (days < 30) return `${days}d`;
  const months = Math.round((days / 30) * 10) / 10;
  if (months < 12) return `${months}mo`;
  const years = Math.round((days / 365) * 10) / 10;
  return `${years}y`;
}

/**
 * Generates preview intervals for each rating choice (1 to 5)
 * so the frontend can display expected intervals on buttons.
 *
 * @param {Object} card Current card state
 * @returns {Object} Map of rating (1..5) to interval string
 */
function getIntervalPreviews(card) {
  const previews = {};
  for (let rating = 1; rating <= 5; rating++) {
    const result = calculateSM2(card, rating);
    previews[rating] = {
      days: result.interval,
      label: formatIntervalText(result.interval),
      masteryLevel: result.masteryLevel,
    };
  }
  return previews;
}

module.exports = {
  calculateSM2,
  getIntervalPreviews,
  formatIntervalText,
  MIN_EASE_FACTOR,
  DEFAULT_EASE_FACTOR,
};

