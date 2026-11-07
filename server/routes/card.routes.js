const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Card = require('../models/Card');
const Deck = require('../models/Deck');
const connectDB = require('../config/db');
const { protect, optionalAuth } = require('../middleware/auth');
const { validateCard } = require('../middleware/validate');
const { findDuplicates } = require('../utils/duplicateDetector');
const { getIntervalPreviews } = require('../utils/sm2');

// Helper to gather all descendant deck IDs for hierarchical queries
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

// @route   POST /api/cards/check-duplicate
// @desc    Check potential card duplicate before submitting
// @access  Private
router.post('/check-duplicate', protect, async (req, res, next) => {
  try {
    await connectDB();
    const { deckId, front, back, excludeCardId, checkSubdecks = false } = req.body;

    if (!front || !front.trim()) {
      return res.json({
        hasDuplicate: false,
        highestScore: 0,
        severity: 'none',
        matches: [],
      });
    }

    let deckIds = [deckId];
    if (checkSubdecks && mongoose.Types.ObjectId.isValid(deckId)) {
      deckIds = await getAllSubdeckIds(deckId);
    }

    const existingCards = await Card.find({ deck: { $in: deckIds } })
      .select('_id front back deck')
      .lean();

    const result = findDuplicates(
      { front, back, _id: excludeCardId },
      existingCards,
      60 // 60% threshold
    );

    res.json({
      success: true,
      ...result,
    });
  } catch (error) {
    next(error);
  }
});

// @route   GET /api/cards/deck/:deckId
// @desc    Get all cards for a deck (with hierarchical option and filters)
// @access  Public / Optional Auth
router.get('/deck/:deckId', optionalAuth, async (req, res, next) => {
  try {
    await connectDB();
    const { deckId } = req.params;
    const {
      includeSubdecks = 'false',
      search,
      masteryLevel,
      sort = 'nextReviewDate',
      order = 'asc',
      limit = 200,
      page = 1,
    } = req.query;

    if (!mongoose.Types.ObjectId.isValid(deckId)) {
      return res.status(400).json({ success: false, message: 'Invalid deck ID' });
    }

    const deck = await Deck.findById(deckId);
    if (!deck) {
      return res.status(404).json({ success: false, message: 'Deck not found' });
    }

    const userId = req.user ? req.user._id : null;
    if (!deck.canView(userId)) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to view cards in this deck',
      });
    }

    let targetDeckIds = [deckId];
    if (includeSubdecks === 'true') {
      targetDeckIds = await getAllSubdeckIds(deckId);
    }

    const filter = { deck: { $in: targetDeckIds } };

    if (search) {
      filter.$or = [
        { front: { $regex: search.trim(), $options: 'i' } },
        { back: { $regex: search.trim(), $options: 'i' } },
        { tags: { $regex: search.trim(), $options: 'i' } },
      ];
    }

    if (masteryLevel) {
      filter.masteryLevel = masteryLevel;
    }

    const sortOrder = order === 'desc' ? -1 : 1;
    const sortObj = {};
    sortObj[sort] = sortOrder;

    const skip = (Math.max(1, parseInt(page)) - 1) * Math.max(1, parseInt(limit));
    const total = await Card.countDocuments(filter);

    const cards = await Card.find(filter)
      .populate('createdBy', 'username displayName')
      .populate('deck', 'title color')
      .sort(sortObj)
      .skip(skip)
      .limit(parseInt(limit));

    // Attach SM-2 interval previews to each card
    const enrichedCards = cards.map((card) => {
      const cardObj = card.toObject();
      return {
        ...cardObj,
        intervalPreviews: getIntervalPreviews(card),
      };
    });

    res.json({
      success: true,
      total,
      count: cards.length,
      page: parseInt(page),
      totalPages: Math.ceil(total / parseInt(limit)),
      cards: enrichedCards,
    });
  } catch (error) {
    next(error);
  }
});

// @route   POST /api/cards
// @desc    Create a new flashcard with duplicate prevention
// @access  Private (Deck Owner or Editor)
router.post('/', protect, validateCard, async (req, res, next) => {
  try {
    await connectDB();
    const { deckId, front, back, hints, tags, forceSave = false } = req.body;

    if (!deckId || !mongoose.Types.ObjectId.isValid(deckId)) {
      return res.status(400).json({ success: false, message: 'Valid deck ID is required' });
    }

    const deck = await Deck.findById(deckId);
    if (!deck) {
      return res.status(404).json({ success: false, message: 'Deck not found' });
    }

    if (!deck.canEdit(req.user._id)) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to add cards to this deck',
      });
    }

    // Run duplicate detection across the deck
    const existingCards = await Card.find({ deck: deckId }).select('_id front back deck').lean();
    const duplicateCheck = findDuplicates({ front, back }, existingCards, 65);

    // If severe duplicate (>85%) and user has not explicitly forced save, block and warn
    if (duplicateCheck.hasDuplicate && duplicateCheck.severity === 'high' && !forceSave) {
      return res.status(409).json({
        success: false,
        message: `Potential exact duplicate detected (${duplicateCheck.highestScore}% match). Please review or confirm.`,
        isDuplicate: true,
        highestScore: duplicateCheck.highestScore,
        severity: duplicateCheck.severity,
        matches: duplicateCheck.matches,
      });
    }

    const card = await Card.create({
      deck: deckId,
      front: front.trim(),
      back: back.trim(),
      hints: Array.isArray(hints) ? hints.map((h) => h.trim()).filter(Boolean) : [],
      tags: Array.isArray(tags) ? tags.map((t) => t.toLowerCase().trim()).filter(Boolean) : [],
      createdBy: req.user._id,
      repetition: 0,
      interval: 0,
      easeFactor: 2.5,
      nextReviewDate: new Date(),
      masteryLevel: 'New',
    });

    const populatedCard = await Card.findById(card._id)
      .populate('createdBy', 'username displayName')
      .populate('deck', 'title color');

    res.status(201).json({
      success: true,
      message: 'Card created successfully',
      card: {
        ...populatedCard.toObject(),
        intervalPreviews: getIntervalPreviews(populatedCard),
      },
      duplicateWarning: duplicateCheck.hasDuplicate ? duplicateCheck : null,
    });
  } catch (error) {
    next(error);
  }
});

// @route   GET /api/cards/:id
// @desc    Get single card details with interval previews
// @access  Public (if deck public) or Private
router.get('/:id', optionalAuth, async (req, res, next) => {
  try {
    await connectDB();
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid card ID' });
    }

    const card = await Card.findById(id)
      .populate('createdBy', 'username displayName')
      .populate('deck', 'title color isPublic owner collaborators');

    if (!card) {
      return res.status(404).json({ success: false, message: 'Card not found' });
    }

    const userId = req.user ? req.user._id : null;
    if (!card.deck.canView(userId)) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to view this card',
      });
    }

    res.json({
      success: true,
      card: {
        ...card.toObject(),
        intervalPreviews: getIntervalPreviews(card),
      },
    });
  } catch (error) {
    next(error);
  }
});

// @route   PUT /api/cards/:id
// @desc    Update card content with duplicate re-check
// @access  Private (Deck Editor/Owner)
router.put('/:id', protect, validateCard, async (req, res, next) => {
  try {
    await connectDB();
    const { id } = req.params;
    const { front, back, hints, tags, forceSave = false } = req.body;

    const card = await Card.findById(id).populate('deck');
    if (!card) {
      return res.status(404).json({ success: false, message: 'Card not found' });
    }

    if (!card.deck.canEdit(req.user._id)) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to modify cards in this deck',
      });
    }

    // Check duplicates against other cards in the deck
    const existingCards = await Card.find({ deck: card.deck._id, _id: { $ne: card._id } })
      .select('_id front back deck')
      .lean();

    const duplicateCheck = findDuplicates({ front, back, _id: card._id }, existingCards, 65);

    if (duplicateCheck.hasDuplicate && duplicateCheck.severity === 'high' && !forceSave) {
      return res.status(409).json({
        success: false,
        message: `Update matches another card with ${duplicateCheck.highestScore}% similarity.`,
        isDuplicate: true,
        highestScore: duplicateCheck.highestScore,
        severity: duplicateCheck.severity,
        matches: duplicateCheck.matches,
      });
    }

    card.front = front.trim();
    card.back = back.trim();
    if (Array.isArray(hints)) {
      card.hints = hints.map((h) => h.trim()).filter(Boolean);
    }
    if (Array.isArray(tags)) {
      card.tags = tags.map((t) => t.toLowerCase().trim()).filter(Boolean);
    }
    card.lastModifiedBy = req.user._id;

    await card.save();

    const updatedCard = await Card.findById(card._id)
      .populate('createdBy', 'username displayName')
      .populate('deck', 'title color');

    res.json({
      success: true,
      message: 'Card updated successfully',
      card: {
        ...updatedCard.toObject(),
        intervalPreviews: getIntervalPreviews(updatedCard),
      },
      duplicateWarning: duplicateCheck.hasDuplicate ? duplicateCheck : null,
    });
  } catch (error) {
    next(error);
  }
});

// @route   DELETE /api/cards/:id
// @desc    Delete a card
// @access  Private (Deck Editor/Owner)
router.delete('/:id', protect, async (req, res, next) => {
  try {
    await connectDB();
    const { id } = req.params;

    const card = await Card.findById(id).populate('deck');
    if (!card) {
      return res.status(404).json({ success: false, message: 'Card not found' });
    }

    if (!card.deck.canEdit(req.user._id)) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to delete this card',
      });
    }

    await Card.findByIdAndDelete(id);

    res.json({
      success: true,
      message: 'Card deleted successfully',
    });
  } catch (error) {
    next(error);
  }
});

// @route   POST /api/cards/batch-import
// @desc    Batch import cards from structured array with duplicate screening
// @access  Private (Deck Editor/Owner)
router.post('/batch-import', protect, async (req, res, next) => {
  try {
    await connectDB();
    const { deckId, cards, skipDuplicates = true } = req.body;

    if (!deckId || !mongoose.Types.ObjectId.isValid(deckId)) {
      return res.status(400).json({ success: false, message: 'Valid deck ID is required' });
    }

    if (!Array.isArray(cards) || cards.length === 0) {
      return res.status(400).json({ success: false, message: 'An array of cards is required' });
    }

    const deck = await Deck.findById(deckId);
    if (!deck) {
      return res.status(404).json({ success: false, message: 'Deck not found' });
    }

    if (!deck.canEdit(req.user._id)) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to import cards into this deck',
      });
    }

    const existingCards = await Card.find({ deck: deckId }).select('_id front back deck').lean();
    const currentPool = [...existingCards];

    const toInsert = [];
    const skipped = [];

    for (const item of cards) {
      if (!item.front || !item.back) {
        continue;
      }

      const dupCheck = findDuplicates({ front: item.front, back: item.back }, currentPool, 75);

      if (dupCheck.hasDuplicate && skipDuplicates) {
        skipped.push({
          front: item.front,
          reason: `High similarity (${dupCheck.highestScore}%) with existing card`,
          matched: dupCheck.matches[0],
        });
        continue;
      }

      const cardDoc = {
        deck: deckId,
        front: item.front.trim(),
        back: item.back.trim(),
        hints: Array.isArray(item.hints) ? item.hints.map((h) => String(h).trim()).filter(Boolean) : [],
        tags: Array.isArray(item.tags) ? item.tags.map((t) => String(t).toLowerCase().trim()).filter(Boolean) : [],
        createdBy: req.user._id,
        repetition: 0,
        interval: 0,
        easeFactor: 2.5,
        nextReviewDate: new Date(),
        masteryLevel: 'New',
      };

      toInsert.push(cardDoc);
      currentPool.push({ front: cardDoc.front, back: cardDoc.back });
    }

    let inserted = [];
    if (toInsert.length > 0) {
      inserted = await Card.insertMany(toInsert);
    }

    res.status(201).json({
      success: true,
      message: `Imported ${inserted.length} cards (${skipped.length} skipped as duplicates)`,
      importedCount: inserted.length,
      skippedCount: skipped.length,
      skipped,
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;

