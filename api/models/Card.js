const mongoose = require('mongoose');

const cardSchema = new mongoose.Schema(
  {
    deck: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Deck',
      required: [true, 'Deck reference is required'],
      index: true,
    },
    front: {
      type: String,
      required: [true, 'Card front (question/prompt) is required'],
      trim: true,
      maxlength: [3000, 'Card front cannot exceed 3000 characters'],
    },
    back: {
      type: String,
      required: [true, 'Card back (answer/explanation) is required'],
      trim: true,
      maxlength: [5000, 'Card back cannot exceed 5000 characters'],
    },
    hints: [
      {
        type: String,
        trim: true,
        maxlength: [500, 'Hint cannot exceed 500 characters'],
      },
    ],
    tags: [
      {
        type: String,
        trim: true,
        lowercase: true,
      },
    ],
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    lastModifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    // SuperMemo SM-2 Spaced Repetition Attributes
    repetition: {
      type: Number,
      default: 0,
      min: 0,
    },
    interval: {
      type: Number,
      default: 0, // In days
      min: 0,
    },
    easeFactor: {
      type: Number,
      default: 2.5,
      min: 1.3,
    },
    nextReviewDate: {
      type: Date,
      default: Date.now,
      index: true,
    },
    lastReviewedDate: {
      type: Date,
      default: null,
    },
    masteryLevel: {
      type: String,
      enum: ['New', 'Learning', 'Review', 'Mastered'],
      default: 'New',
      index: true,
    },
    totalReviews: {
      type: Number,
      default: 0,
      min: 0,
    },
    lapses: {
      type: Number,
      default: 0,
      min: 0,
    },
    normalizedFront: {
      type: String,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Helper to normalize text for duplicate scanning
function normalizeText(str) {
  if (!str) return '';
  return str
    .toLowerCase()
    .replace(/[^\w\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

cardSchema.pre('save', function (next) {
  if (this.isModified('front')) {
    this.normalizedFront = normalizeText(this.front);
  }
  next();
});

const Card = mongoose.models.Card || mongoose.model('Card', cardSchema);
module.exports = Card;

