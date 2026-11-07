const mongoose = require('mongoose');
const Deck = require('../models/Deck');
const Card = require('../models/Card');

function toObjectId(id) {
  if (id instanceof mongoose.Types.ObjectId) return id;
  return new mongoose.Types.ObjectId(String(id));
}

/**
 * Returns the ObjectIds of a deck and all of its descendants (breadth-first).
 * One query per tree level rather than one per deck.
 */
async function getSubtreeIds(rootDeckId) {
  const rootId = toObjectId(rootDeckId);
  const allIds = [rootId];
  let frontier = [rootId];

  while (frontier.length > 0) {
    const children = await Deck.find({ parentDeck: { $in: frontier } }).select('_id').lean();
    frontier = children.map((c) => c._id);
    allIds.push(...frontier);
  }

  return allIds;
}

const EMPTY_STATS = Object.freeze({
  totalCards: 0,
  dueCards: 0,
  masteredCards: 0,
  learningCards: 0,
  newCards: 0,
});

/**
 * Aggregates card counts (total, due, mastered, learning/review, new) across the given decks.
 */
async function computeCardStats(deckIds) {
  const ids = deckIds.map(toObjectId);
  if (ids.length === 0) return { ...EMPTY_STATS };

  const now = new Date();
  const [agg] = await Card.aggregate([
    { $match: { deck: { $in: ids } } },
    {
      $group: {
        _id: null,
        totalCards: { $sum: 1 },
        dueCards: { $sum: { $cond: [{ $lte: ['$nextReviewDate', now] }, 1, 0] } },
        masteredCards: { $sum: { $cond: [{ $eq: ['$masteryLevel', 'Mastered'] }, 1, 0] } },
        learningCards: {
          $sum: { $cond: [{ $in: ['$masteryLevel', ['Learning', 'Review']] }, 1, 0] },
        },
        newCards: { $sum: { $cond: [{ $eq: ['$masteryLevel', 'New'] }, 1, 0] } },
      },
    },
  ]);

  if (!agg) return { ...EMPTY_STATS };
  const { _id, ...stats } = agg;
  return stats;
}

/**
 * Stats for a single deck only, and for the deck including all descendants.
 */
async function computeDeckAndTreeStats(deckId) {
  const subtreeIds = await getSubtreeIds(deckId);
  const [stats, treeStats] = await Promise.all([
    computeCardStats([deckId]),
    computeCardStats(subtreeIds),
  ]);
  return { stats, treeStats, subtreeIds };
}

/**
 * Escapes user input for safe use inside a RegExp / MongoDB $regex.
 */
function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

module.exports = {
  toObjectId,
  getSubtreeIds,
  computeCardStats,
  computeDeckAndTreeStats,
  escapeRegex,
  EMPTY_STATS,
};

