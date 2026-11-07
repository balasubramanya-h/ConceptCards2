const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Deck = require('../models/Deck');
const Card = require('../models/Card');
const User = require('../models/User');
const connectDB = require('../config/db');
const { protect, optionalAuth } = require('../middleware/auth');
const { validateDeck, validateCollaborator } = require('../middleware/validate');
const { computeDeckAndTreeStats, escapeRegex } = require('../utils/deckTree');

// Helper to check if a target parent deck is a descendant of candidate (prevents cycles)
async function isDescendant(candidateId, potentialAncestorId) {
  let current = await Deck.findById(potentialAncestorId).select('parentDeck');
  while (current && current.parentDeck) {
    if (current.parentDeck.toString() === candidateId.toString()) {
      return true;
    }
    current = await Deck.findById(current.parentDeck).select('parentDeck');
  }
  return false;
}

function normalizeTags(tags) {
  return Array.isArray(tags) ? tags.map((t) => String(t).toLowerCase().trim()).filter(Boolean) : [];
}

// Recursively clones a deck, its cards (with fresh SM-2 state) and every subdeck the user can view
async function cloneDeckTree(sourceDeck, newParentId, userId, isRoot) {
  const clonedDeck = await Deck.create({
    title: isRoot ? `${sourceDeck.title} (Forked)`.slice(0, 120) : sourceDeck.title,
    description: sourceDeck.description,
    parentDeck: newParentId,
    owner: userId,
    tags: sourceDeck.tags,
    color: sourceDeck.color,
    icon: sourceDeck.icon,
    isPublic: false,
  });

  const sourceCards = await Card.find({ deck: sourceDeck._id }).lean();
  if (sourceCards.length > 0) {
    await Card.insertMany(
      sourceCards.map((card) => ({
        deck: clonedDeck._id,
        front: card.front,
        back: card.back,
        hints: card.hints,
        tags: card.tags,
        createdBy: userId,
        repetition: 0,
        interval: 0,
        easeFactor: 2.5,
        nextReviewDate: new Date(),
        masteryLevel: 'New',
        totalReviews: 0,
        lapses: 0,
      }))
    );
  }

  let cardCount = sourceCards.length;
  let deckCount = 1;

  const children = await Deck.find({ parentDeck: sourceDeck._id });
  for (const child of children) {
    if (!child.canView(userId)) continue;
    const result = await cloneDeckTree(child, clonedDeck._id, userId, false);
    cardCount += result.cardCount;
    deckCount += result.deckCount;
  }

  return { deck: clonedDeck, cardCount, deckCount };
}

// @route   GET /api/decks
// @desc    Get accessible decks for the authenticated user.
//          ?parentDeck=root returns top-level entries: decks with no parent, plus shared
//          subdecks whose parent the user cannot access (so collaborators still see them).
//          ?search=... searches every accessible deck regardless of depth.
// @access  Private
router.get('/', protect, async (req, res, next) => {
  try {
    await connectDB();
    const userId = req.user._id;
    const { parentDeck, search, tag } = req.query;

    const accessible = await Deck.find({
      $or: [{ owner: userId }, { 'collaborators.user': userId }],
    })
      .populate('owner', 'username displayName avatarUrl')
      .populate('collaborators.user', 'username displayName avatarUrl')
      .sort({ updatedAt: -1 });

    const accessibleIds = new Set(accessible.map((d) => d._id.toString()));
    let decks = accessible;

    const term = typeof search === 'string' ? search.trim() : '';
    if (term) {
      const rx = new RegExp(escapeRegex(term), 'i');
      decks = decks.filter(
        (d) => rx.test(d.title) || rx.test(d.description || '') || d.tags.some((t) => rx.test(t))
      );
    } else if (parentDeck === 'root') {
      decks = decks.filter((d) => !d.parentDeck || !accessibleIds.has(d.parentDeck.toString()));
    } else if (parentDeck && mongoose.Types.ObjectId.isValid(parentDeck)) {
      decks = decks.filter((d) => d.parentDeck && d.parentDeck.toString() === String(parentDeck));
    }

    if (typeof tag === 'string' && tag.trim()) {
      const wanted = tag.toLowerCase().trim();
      decks = decks.filter((d) => d.tags.includes(wanted));
    }

    const enrichedDecks = await Promise.all(
      decks.map(async (deck) => {
        const [{ stats, treeStats }, subdeckCount] = await Promise.all([
          computeDeckAndTreeStats(deck._id),
          Deck.countDocuments({ parentDeck: deck._id }),
        ]);
        const role = deck.roleOf(userId);
        return {
          ...deck.toObject(),
          stats: treeStats,
          directStats: stats,
          subdeckCount,
          isOwner: role === 'owner',
          canEdit: deck.canEdit(userId),
          userRole: role,
        };
      })
    );

    res.json({
      success: true,
      count: enrichedDecks.length,
      decks: enrichedDecks,
    });
  } catch (error) {
    next(error);
  }
});

// @route   GET /api/decks/public
// @desc    Get public root decks for community discovery
// @access  Public / Optional Auth
router.get('/public', optionalAuth, async (req, res, next) => {
  try {
    await connectDB();
    const { search, tag } = req.query;
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const filter = { isPublic: true, parentDeck: null };

    const term = typeof search === 'string' ? search.trim() : '';
    if (term) {
      const pattern = escapeRegex(term);
      filter.$or = [
        { title: { $regex: pattern, $options: 'i' } },
        { description: { $regex: pattern, $options: 'i' } },
      ];
    }

    if (typeof tag === 'string' && tag.trim()) {
      filter.tags = tag.toLowerCase().trim();
    }

    const total = await Deck.countDocuments(filter);
    const decks = await Deck.find(filter)
      .populate('owner', 'username displayName avatarUrl')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    const enrichedDecks = await Promise.all(
      decks.map(async (deck) => {
        const [{ treeStats }, subdeckCount] = await Promise.all([
          computeDeckAndTreeStats(deck._id),
          Deck.countDocuments({ parentDeck: deck._id, isPublic: true }),
        ]);
        return {
          ...deck.toObject(),
          stats: { totalCards: treeStats.totalCards },
          subdeckCount,
        };
      })
    );

    res.json({
      success: true,
      total,
      page,
      totalPages: Math.ceil(total / limit),
      decks: enrichedDecks,
    });
  } catch (error) {
    next(error);
  }
});

// @route   POST /api/decks
// @desc    Create a new deck (root or nested subdeck)
// @access  Private
router.post('/', protect, validateDeck, async (req, res, next) => {
  try {
    await connectDB();
    const { title, description, parentDeck, tags, color, icon, isPublic } = req.body;

    if (parentDeck) {
      const parent = await Deck.findById(parentDeck);
      if (!parent) {
        return res.status(404).json({ success: false, message: 'Parent deck not found' });
      }
      if (!parent.canEdit(req.user._id)) {
        return res.status(403).json({
          success: false,
          message: 'You do not have permission to add subdecks under this deck',
        });
      }
    }

    const deck = await Deck.create({
      title: title.trim(),
      description: description ? String(description).trim() : '',
      parentDeck: parentDeck || null,
      owner: req.user._id,
      tags: normalizeTags(tags),
      color: color || '#6366f1',
      icon: icon || 'folder',
      isPublic: Boolean(isPublic),
    });

    const populatedDeck = await Deck.findById(deck._id).populate('owner', 'username displayName avatarUrl');
    const emptyStats = { totalCards: 0, dueCards: 0, masteredCards: 0, learningCards: 0, newCards: 0 };

    res.status(201).json({
      success: true,
      message: 'Deck created successfully',
      deck: {
        ...populatedDeck.toObject(),
        stats: emptyStats,
        directStats: emptyStats,
        subdeckCount: 0,
        isOwner: true,
        canEdit: true,
        userRole: 'owner',
      },
    });
  } catch (error) {
    next(error);
  }
});

// @route   GET /api/decks/:id
// @desc    Get deck details with direct stats, tree stats, collaborators, and visible subdecks
// @access  Public (if deck is public) or Private
router.get('/:id', optionalAuth, async (req, res, next) => {
  try {
    await connectDB();
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid deck ID' });
    }

    const deck = await Deck.findById(id)
      .populate('owner', 'username displayName avatarUrl email')
      .populate('collaborators.user', 'username displayName avatarUrl email');

    if (!deck) {
      return res.status(404).json({ success: false, message: 'Deck not found' });
    }

    const userId = req.user ? req.user._id : null;
    if (!deck.canView(userId)) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to view this deck',
      });
    }

    const { stats, treeStats } = await computeDeckAndTreeStats(deck._id);

    const subdecks = await Deck.find({ parentDeck: deck._id })
      .populate('owner', 'username displayName avatarUrl')
      .sort({ title: 1 });

    const visibleSubdecks = subdecks.filter((sub) => sub.canView(userId));
    const enrichedSubdecks = await Promise.all(
      visibleSubdecks.map(async (sub) => {
        const subResult = await computeDeckAndTreeStats(sub._id);
        return {
          ...sub.toObject(),
          stats: subResult.treeStats,
          directStats: subResult.stats,
        };
      })
    );

    const role = deck.roleOf(userId);

    res.json({
      success: true,
      deck: {
        ...deck.toObject(),
        stats,
        treeStats,
        subdecks: enrichedSubdecks,
        subdeckCount: enrichedSubdecks.length,
        isOwner: role === 'owner',
        isMember: deck.isMember(userId),
        canEdit: deck.canEdit(userId),
        userRole: role,
      },
    });
  } catch (error) {
    next(error);
  }
});

// @route   GET /api/decks/:id/breadcrumbs
// @desc    Get the ancestor chain for breadcrumb navigation (stops at decks the user cannot view)
// @access  Public / Optional Auth
router.get('/:id/breadcrumbs', optionalAuth, async (req, res, next) => {
  try {
    await connectDB();
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid deck ID' });
    }

    const userId = req.user ? req.user._id : null;
    const breadcrumbs = [];
    const visited = new Set();
    let currentId = id;

    while (currentId && !visited.has(currentId.toString())) {
      visited.add(currentId.toString());
      const currentDeck = await Deck.findById(currentId).select(
        '_id title parentDeck isPublic owner collaborators'
      );
      if (!currentDeck || !currentDeck.canView(userId)) break;

      breadcrumbs.unshift({ _id: currentDeck._id, title: currentDeck.title });
      currentId = currentDeck.parentDeck;
    }

    res.json({ success: true, breadcrumbs });
  } catch (error) {
    next(error);
  }
});

// @route   PUT /api/decks/:id
// @desc    Update deck metadata or parent hierarchy
// @access  Private (Owner or Editor)
router.put('/:id', protect, validateDeck, async (req, res, next) => {
  try {
    await connectDB();
    const { id } = req.params;
    const { title, description, parentDeck, tags, color, icon, isPublic } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid deck ID' });
    }

    const deck = await Deck.findById(id);
    if (!deck) {
      return res.status(404).json({ success: false, message: 'Deck not found' });
    }

    if (!deck.canEdit(req.user._id)) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to edit this deck',
      });
    }

    if (parentDeck) {
      if (parentDeck.toString() === id.toString()) {
        return res.status(400).json({ success: false, message: 'A deck cannot be its own parent' });
      }

      const parent = await Deck.findById(parentDeck);
      if (!parent) {
        return res.status(404).json({ success: false, message: 'Parent deck not found' });
      }
      if (!parent.canEdit(req.user._id)) {
        return res.status(403).json({
          success: false,
          message: 'You do not have permission to move decks under the selected parent',
        });
      }

      if (await isDescendant(id, parentDeck)) {
        return res.status(400).json({
          success: false,
          message: 'Circular hierarchy detected: cannot set a subdeck as the parent deck',
        });
      }
      deck.parentDeck = parentDeck;
    } else if (parentDeck === null || parentDeck === '') {
      deck.parentDeck = null;
    }

    if (title) deck.title = title.trim();
    if (description !== undefined) deck.description = String(description).trim();
    if (Array.isArray(tags)) deck.tags = normalizeTags(tags);
    if (color) deck.color = color;
    if (icon) deck.icon = icon;
    if (isPublic !== undefined) deck.isPublic = Boolean(isPublic);

    await deck.save();

    const updated = await Deck.findById(deck._id)
      .populate('owner', 'username displayName avatarUrl')
      .populate('collaborators.user', 'username displayName avatarUrl');

    res.json({
      success: true,
      message: 'Deck updated successfully',
      deck: updated,
    });
  } catch (error) {
    next(error);
  }
});

// @route   DELETE /api/decks/:id
// @desc    Delete deck, child subdecks, and cards recursively
// @access  Private (Owner only)
router.delete('/:id', protect, async (req, res, next) => {
  try {
    await connectDB();
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid deck ID' });
    }

    const deck = await Deck.findById(id);
    if (!deck) {
      return res.status(404).json({ success: false, message: 'Deck not found' });
    }

    if (deck.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Only the deck owner can delete this deck',
      });
    }

    const deckIdsToDelete = [deck._id];
    let frontier = [deck._id];
    while (frontier.length > 0) {
      const children = await Deck.find({ parentDeck: { $in: frontier } }).select('_id').lean();
      frontier = children.map((c) => c._id);
      deckIdsToDelete.push(...frontier);
    }

    const [deletedCards, deletedDecks] = await Promise.all([
      Card.deleteMany({ deck: { $in: deckIdsToDelete } }),
      Deck.deleteMany({ _id: { $in: deckIdsToDelete } }),
    ]);

    res.json({
      success: true,
      message: `Deleted ${deletedDecks.deletedCount} deck(s) and ${deletedCards.deletedCount} card(s)`,
    });
  } catch (error) {
    next(error);
  }
});

// @route   POST /api/decks/:id/collaborators
// @desc    Invite collaborator by email or username
// @access  Private (Owner only)
router.post('/:id/collaborators', protect, validateCollaborator, async (req, res, next) => {
  try {
    await connectDB();
    const { id } = req.params;
    const { identifier, role = 'editor' } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid deck ID' });
    }

    const deck = await Deck.findById(id);
    if (!deck) {
      return res.status(404).json({ success: false, message: 'Deck not found' });
    }

    if (deck.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Only the deck owner can manage collaborators',
      });
    }

    const lookup = identifier.toLowerCase().trim();
    const targetUser = await User.findOne({ $or: [{ email: lookup }, { username: lookup }] });

    if (!targetUser) {
      return res.status(404).json({
        success: false,
        message: `No user found with email or username "${identifier}"`,
      });
    }

    if (targetUser._id.toString() === req.user._id.toString()) {
      return res.status(400).json({ success: false, message: 'You are already the owner of this deck' });
    }

    const existingCollab = deck.collaborators.find(
      (c) => c.user && c.user.toString() === targetUser._id.toString()
    );

    if (existingCollab) {
      existingCollab.role = role;
    } else {
      deck.collaborators.push({ user: targetUser._id, role, addedAt: new Date() });
    }

    await deck.save();

    const updatedDeck = await Deck.findById(id).populate(
      'collaborators.user',
      'username displayName avatarUrl email'
    );

    res.json({
      success: true,
      message: `Collaborator ${targetUser.username} ${existingCollab ? 'updated' : 'added'} with role "${role}"`,
      collaborators: updatedDeck.collaborators,
    });
  } catch (error) {
    next(error);
  }
});

// @route   DELETE /api/decks/:id/collaborators/:userId
// @desc    Remove collaborator from deck
// @access  Private (Owner only or self-removal)
router.delete('/:id/collaborators/:userId', protect, async (req, res, next) => {
  try {
    await connectDB();
    const { id, userId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid deck ID' });
    }

    const deck = await Deck.findById(id);
    if (!deck) {
      return res.status(404).json({ success: false, message: 'Deck not found' });
    }

    const isOwner = deck.owner.toString() === req.user._id.toString();
    const isSelf = req.user._id.toString() === userId.toString();

    if (!isOwner && !isSelf) {
      return res.status(403).json({ success: false, message: 'Not authorized to remove this collaborator' });
    }

    deck.collaborators = deck.collaborators.filter(
      (c) => c.user && c.user.toString() !== userId.toString()
    );
    await deck.save();

    res.json({ success: true, message: 'Collaborator removed successfully' });
  } catch (error) {
    next(error);
  }
});

// @route   POST /api/decks/:id/fork
// @desc    Clone a deck, all viewable subdecks, and their cards into the current user's library
// @access  Private
router.post('/:id/fork', protect, async (req, res, next) => {
  try {
    await connectDB();
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid deck ID' });
    }

    const sourceDeck = await Deck.findById(id);
    if (!sourceDeck) {
      return res.status(404).json({ success: false, message: 'Deck not found' });
    }

    if (!sourceDeck.canView(req.user._id)) {
      return res.status(403).json({
        success: false,
        message: 'Cannot fork a private deck you do not have access to',
      });
    }

    const result = await cloneDeckTree(sourceDeck, null, req.user._id, true);

    res.status(201).json({
      success: true,
      message: `Forked ${result.deckCount} deck(s) with ${result.cardCount} card(s)`,
      deck: result.deck,
      deckCount: result.deckCount,
      cardCount: result.cardCount,
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
