const mongoose = require('mongoose');

const reviewLogSchema = new mongoose.Schema(
  {
    card: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Card',
      required: true,
      index: true,
    },
    deck: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Deck',
      required: true,
      index: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    quality: {
      type: Number,
      required: true,
      min: 0,
      max: 5,
    },
    intervalBefore: {
      type: Number,
      required: true,
    },
    intervalAfter: {
      type: Number,
      required: true,
    },
    easeFactorBefore: {
      type: Number,
      required: true,
    },
    easeFactorAfter: {
      type: Number,
      required: true,
    },
    repetitionBefore: {
      type: Number,
      required: true,
    },
    repetitionAfter: {
      type: Number,
      required: true,
    },
    masteryLevelBefore: {
      type: String,
      enum: ['New', 'Learning', 'Review', 'Mastered'],
    },
    masteryLevelAfter: {
      type: String,
      enum: ['New', 'Learning', 'Review', 'Mastered'],
      required: true,
    },
    responseTimeMs: {
      type: Number,
      default: 0,
    },
    reviewedAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
    timestamps: false,
  }
);

const ReviewLog = mongoose.models.ReviewLog || mongoose.model('ReviewLog', reviewLogSchema);
module.exports = ReviewLog;

