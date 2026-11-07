const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Card = require('../models/Card');
const Deck = require('../models/Deck');
const ReviewLog = require('../models/ReviewLog');
const connectDB = require('../config/db');
const { protect } = require('../middleware/auth');
const { validateRegister, validateLogin } = require('../middleware/validate');

function generateToken(id) {
  const secret = process.env.JWT_SECRET || 'conceptcards_super_secret_jwt_key_development_2026_change_in_production';
  const expiresIn = process.env.JWT_EXPIRES_IN || '7d';
  return jwt.sign({ id }, secret, { expiresIn });
}

// @route   POST /api/auth/register
// @desc    Register a new user account
// @access  Public
router.post('/register', validateRegister, async (req, res, next) => {
  try {
    await connectDB();
    const { username, email, password, displayName } = req.body;

    const existingUser = await User.findOne({
      $or: [{ email: email.toLowerCase() }, { username: username.toLowerCase() }],
    });

    if (existingUser) {
      const matchField = existingUser.email === email.toLowerCase() ? 'Email' : 'Username';
      return res.status(409).json({
        success: false,
        message: `${matchField} is already registered.`,
      });
    }

    const user = await User.create({
      username: username.toLowerCase().trim(),
      email: email.toLowerCase().trim(),
      password,
      displayName: displayName ? displayName.trim() : username.trim(),
    });

    const token = generateToken(user._id);

    res.status(201).json({
      success: true,
      message: 'Account created successfully',
      token,
      user: {
        _id: user._id,
        username: user.username,
        email: user.email,
        displayName: user.displayName,
        avatarUrl: user.avatarUrl,
        bio: user.bio,
        dailyReviewTarget: user.dailyReviewTarget,
        streak: user.streak,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    next(error);
  }
});

// @route   POST /api/auth/login
// @desc    Authenticate user & get token
// @access  Public
router.post('/login', validateLogin, async (req, res, next) => {
  try {
    await connectDB();
    const { email, password } = req.body;
    const identifier = email.toLowerCase().trim();

    const user = await User.findOne({
      $or: [{ email: identifier }, { username: identifier }],
    }).select('+password');

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials. Please verify your email/username and password.',
      });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials. Please verify your email/username and password.',
      });
    }

    const token = generateToken(user._id);

    res.json({
      success: true,
      message: 'Logged in successfully',
      token,
      user: {
        _id: user._id,
        username: user.username,
        email: user.email,
        displayName: user.displayName,
        avatarUrl: user.avatarUrl,
        bio: user.bio,
        dailyReviewTarget: user.dailyReviewTarget,
        streak: user.streak,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    next(error);
  }
});

// @route   GET /api/auth/me
// @desc    Get current user profile & overall learning statistics
// @access  Private
router.get('/me', protect, async (req, res, next) => {
  try {
    await connectDB();
    const user = req.user;

    // Aggregate user learning statistics
    const userDecks = await Deck.find({
      $or: [{ owner: user._id }, { 'collaborators.user': user._id }],
    }).select('_id');

    const deckIds = userDecks.map((d) => d._id);

    const now = new Date();
    const [totalCards, dueCards, masteredCards, totalReviewsToday] = await Promise.all([
      Card.countDocuments({ deck: { $in: deckIds } }),
      Card.countDocuments({ deck: { $in: deckIds }, nextReviewDate: { $lte: now } }),
      Card.countDocuments({ deck: { $in: deckIds }, masteryLevel: 'Mastered' }),
      ReviewLog.countDocuments({
        user: user._id,
        reviewedAt: { $gte: new Date(new Date().setHours(0, 0, 0, 0)) },
      }),
    ]);

    res.json({
      success: true,
      user: {
        _id: user._id,
        username: user.username,
        email: user.email,
        displayName: user.displayName,
        avatarUrl: user.avatarUrl,
        bio: user.bio,
        dailyReviewTarget: user.dailyReviewTarget,
        streak: user.streak,
        lastStudyDate: user.lastStudyDate,
        createdAt: user.createdAt,
      },
      stats: {
        totalDecks: deckIds.length,
        totalCards,
        dueCards,
        masteredCards,
        totalReviewsToday,
      },
    });
  } catch (error) {
    next(error);
  }
});

// @route   PUT /api/auth/me
// @desc    Update current user profile
// @access  Private
router.put('/me', protect, async (req, res, next) => {
  try {
    await connectDB();
    const { displayName, bio, avatarUrl, dailyReviewTarget } = req.body;
    const user = req.user;

    if (displayName !== undefined) user.displayName = displayName.trim();
    if (bio !== undefined) user.bio = bio.trim();
    if (avatarUrl !== undefined) user.avatarUrl = avatarUrl.trim();
    if (dailyReviewTarget !== undefined) {
      const target = Number(dailyReviewTarget);
      if (target >= 1 && target <= 500) {
        user.dailyReviewTarget = target;
      }
    }

    await user.save();

    res.json({
      success: true,
      message: 'Profile updated successfully',
      user: {
        _id: user._id,
        username: user.username,
        email: user.email,
        displayName: user.displayName,
        avatarUrl: user.avatarUrl,
        bio: user.bio,
        dailyReviewTarget: user.dailyReviewTarget,
        streak: user.streak,
      },
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;

