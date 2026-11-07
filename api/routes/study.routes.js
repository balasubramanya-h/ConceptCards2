const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Card = require('../models/Card');
const Deck = require('../models/Deck');
const ReviewLog = require('../models/ReviewLog');
const connectDB = require('../config/db');
const { protect } = require('../middleware/auth');
const { validateReview } = require('../middleware/validate');
const { calculateSM2, getIntervalPreviews } = require('../utils/sm2');

// Helper to gather all subdeck IDs
async function getAllSubdeckIds(rootDeckId) {
  const allIds = [rootDeckId];
  const queue = [rootDeckId];

  while (queue.length > 0) {
    const parentId = queue.shift();
    const subdecks = await Deck.find({ parentDeck: parentId }).select('_id');
    for (const sub of subdecks) {
      allIds.push(sub._id);
      queue.push(sub._id);
    }
  }

  return allIds;
}

// @route   GET /api/study/due/:deckId
// @desc    Get queue of due cards for a study session
// @access  Private
router.get('/due/:deckId', protect, async (req, res, next) => {
  try {
    await connectDB();
    const { deckId } = req.params;
    const { includeSubdecks = 'false', mode = 'due', limit = 50 } = req.query;

    if (!mongoose.Types.ObjectId.isValid(deckId)) {
      return res.status(400).json({ success: false, message: 'Invalid deck ID' });
    }

    const deck = await Deck.findById(deckId);
    if (!deck) {
      return res.status(404).json({ success: false, message: 'Deck not found' });
    }

    if (!deck.canView(req.user._id)) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to study this deck',
      });
    }

    let deckIds = [deckId];
    if (includeSubdecks === 'true') {
      deckIds = await getAllSubdeckIds(deckId);
    }

    const query = { deck: { $in: deckIds } };
    const now = new Date();

    if (mode === 'due') {
      query.nextReviewDate = { $lte: now };
    }

    const cards = await Card.find(query)
      .populate('deck', 'title color')
      .sort({ nextReviewDate: 1, repetition: 1 })
      .limit(parseInt(limit));

    const enrichedCards = cards.map((card) => {
      const cardObj = card.toObject();
      return {
        ...cardObj,
        intervalPreviews: getIntervalPreviews(card),
      };
    });

    res.json({
      success: true,
      deck: {
        _id: deck._id,
        title: deck.title,
        color: deck.color,
      },
      count: enrichedCards.length,
      mode,
      cards: enrichedCards,
    });
  } catch (error) {
    next(error);
  }
});

// @route   GET /api/study/due-all
// @desc    Get global due cards across all user-accessible decks
// @access  Private
router.get('/due-all', protect, async (req, res, next) => {
  try {
    await connectDB();
    const userId = req.user._id;
    const { limit = 50 } = req.query;

    // Get all user decks
    const userDecks = await Deck.find({
      $or: [{ owner: userId }, { 'collaborators.user': userId }],
    }).select('_id');

    const deckIds = userDecks.map((d) => d._id);
    const now = new Date();

    const cards = await Card.find({
      deck: { $in: deckIds },
      nextReviewDate: { $lte: now },
    })
      .populate('deck', 'title color')
      .sort({ nextReviewDate: 1 })
      .limit(parseInt(limit));

    const enrichedCards = cards.map((card) => ({
      ...card.toObject(),
      intervalPreviews: getIntervalPreviews(card),
    }));

    res.json({
      success: true,
      count: enrichedCards.length,
      cards: enrichedCards,
    });
  } catch (error) {
    next(error);
  }
});

// @route   POST /api/study/review/:cardId
// @desc    Submit review rating for a card, process SM-2 algorithm, and log review
// @access  Private
router.post('/review/:cardId', protect, validateReview, async (req, res, next) => {
  try {
    await connectDB();
    const { cardId } = req.params;
    const { quality, responseTimeMs = 0 } = req.body;

    if (!mongoose.Types.ObjectId.isValid(cardId)) {
      return res.status(400).json({ success: false, message: 'Invalid card ID' });
    }

    const card = await Card.findById(cardId).populate('deck');
    if (!card) {
      return res.status(404).json({ success: false, message: 'Card not found' });
    }

    // Check user can study this card (can view deck)
    if (!card.deck.canView(req.user._id)) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to review this card',
      });
    }

    // Capture state before SM-2 execution
    const intervalBefore = card.interval || 0;
    const easeFactorBefore = card.easeFactor || 2.5;
    const repetitionBefore = card.repetition || 0;
    const masteryLevelBefore = card.masteryLevel || 'New';

    // Compute SM-2 update
    const sm2Update = calculateSM2(card, quality);

    // Apply updates to card
    card.repetition = sm2Update.repetition;
    card.interval = sm2Update.interval;
    card.easeFactor = sm2Update.easeFactor;
    card.nextReviewDate = sm2Update.nextReviewDate;
    card.lastReviewedDate = sm2Update.lastReviewedDate;
    card.masteryLevel = sm2Update.masteryLevel;
    card.lapses = sm2Update.lapses;
    card.totalReviews = (card.totalReviews || 0) + 1;

    await card.save();

    // Log review execution in ReviewLog
    const reviewLog = await ReviewLog.create({
      card: card._id,
      deck: card.deck._id,
      user: req.user._id,
      quality,
      intervalBefore,
      intervalAfter: sm2Update.interval,
      easeFactorBefore,
      easeFactorAfter: sm2Update.easeFactor,
      repetitionBefore,
      repetitionAfter: sm2Update.repetition,
      masteryLevelBefore,
      masteryLevelAfter: sm2Update.masteryLevel,
      responseTimeMs: Math.max(0, parseInt(responseTimeMs) || 0),
      reviewedAt: new Date(),
    });

    // Update study streak on user profile
    await req.user.recordStudyActivity();

    res.json({
      success: true,
      message: 'Review recorded successfully',
      card: {
        ...card.toObject(),
        intervalPreviews: getIntervalPreviews(card),
      },
      reviewLog: {
        _id: reviewLog._id,
        quality: reviewLog.quality,
        intervalAfter: reviewLog.intervalAfter,
        easeFactorAfter: reviewLog.easeFactorAfter,
        masteryLevelAfter: reviewLog.masteryLevelAfter,
        nextReviewDate: card.nextReviewDate,
      },
      streak: req.user.streak,
    });
  } catch (error) {
    next(error);
  }
});

// @route   GET /api/study/analytics/:deckId
// @desc    Get detailed study analytics and retention metrics for a deck
// @access  Private
router.get('/analytics/:deckId', protect, async (req, res, next) => {
  try {
    await connectDB();
    const { deckId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(deckId)) {
      return res.status(400).json({ success: false, message: 'Invalid deck ID' });
    }

    const deck = await Deck.findById(deckId);
    if (!deck) {
      return res.status(404).json({ success: false, message: 'Deck not found' });
    }

    if (!deck.canView(req.user._id)) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to view deck analytics',
      });
    }

    // Mastery distribution
    const masteryCounts = await Card.aggregate([
      { $match: { deck: new mongoose.Types.ObjectId(deckId) } },
      { $group: { _id: '$masteryLevel', count: { $sum: 1 } } },
    ]);

    const distribution = {
      New: 0,
      Learning: 0,
      Review: 0,
      Mastered: 0,
    };

    masteryCounts.forEach((m) => {
      if (distribution[m._id] !== undefined) {
        distribution[m._id] = m.count;
      }
    });

    // Recent 14 days review history
    const fourteenDaysAgo = new Date();
    fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);
    fourteenDaysAgo.setHours(0, 0, 0, 0);

    const logs = await ReviewLog.find({
      deck: deckId,
      reviewedAt: { $gte: fourteenDaysAgo },
    }).sort({ reviewedAt: 1 });

    // Retention rate (ratings >= 3 considered remembered)
    const totalReviews = logs.length;
    const successfulReviews = logs.filter((l) => l.quality >= 3).length;
    const retentionRate = totalReviews > 0 ? Math.round((successfulReviews / totalReviews) * 100) : 100;

    // Daily breakdown for charts
    const dailyMap = {};
    for (let i = 0; i < 14; i++) {
      const d = new Date();
      d.setDate(d.getDate() - (13 - i));
      const key = d.toISOString().split('T')[0];
      dailyMap[key] = { date: key, count: 0, successful: 0 };
    }

    logs.forEach((log) => {
      const key = new Date(log.reviewedAt).toISOString().split('T')[0];
      if (dailyMap[key]) {
        dailyMap[key].count += 1;
        if (log.quality >= 3) dailyMap[key].successful += 1;
      }
    });

    res.json({
      success: true,
      deckId,
      totalCards: Object.values(distribution).reduce((a, b) => a + b, 0),
      masteryDistribution: distribution,
      totalReviewsLogged: totalReviews,
      retentionRate,
      recentActivity: Object.values(dailyMap),
    });
  } catch (error) {
    next(error);
  }
});

// @route   GET /api/study/analytics-summary
// @desc    Get aggregate learning analytics across all decks for user dashboard
// @access  Private
router.get('/analytics-summary', protect, async (req, res, next) => {
  try {
    await connectDB();
    const userId = req.user._id;

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    sevenDaysAgo.setHours(0, 0, 0, 0);

    const recentLogs = await ReviewLog.find({
      user: userId,
      reviewedAt: { $gte: sevenDaysAgo },
    });

    const totalReviews = recentLogs.length;
    const successfulReviews = recentLogs.filter((l) => l.quality >= 3).length;
    const retentionRate = totalReviews > 0 ? Math.round((successfulReviews / totalReviews) * 100) : 100;

    // Daily activity trend
    const trend = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().split('T')[0];
      const count = recentLogs.filter((l) => new Date(l.reviewedAt).toISOString().split('T')[0] === key).length;
      trend.push({ date: key, count });
    }

    res.json({
      success: true,
      streak: req.user.streak,
      dailyReviewTarget: req.user.dailyReviewTarget,
      totalReviewsWeek: totalReviews,
      retentionRate,
      trend,
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;

