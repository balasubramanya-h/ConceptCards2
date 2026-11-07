const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: [true, 'Username is required'],
      unique: true,
      trim: true,
      lowercase: true,
      minlength: [3, 'Username must be at least 3 characters long'],
      maxlength: [30, 'Username cannot exceed 30 characters'],
      match: [/^[a-zA-Z0-9_]+$/, 'Username can only contain alphanumeric characters and underscores'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      trim: true,
      lowercase: true,
      match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please provide a valid email address'],
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [6, 'Password must be at least 6 characters long'],
      select: false,
    },
    displayName: {
      type: String,
      trim: true,
      default: '',
    },
    avatarUrl: {
      type: String,
      default: '',
    },
    bio: {
      type: String,
      maxlength: [200, 'Bio cannot exceed 200 characters'],
      default: '',
    },
    dailyReviewTarget: {
      type: Number,
      default: 20,
      min: 1,
      max: 500,
    },
    streak: {
      type: Number,
      default: 0,
    },
    lastStudyDate: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform(doc, ret) {
        delete ret.password;
        delete ret.__v;
        return ret;
      },
    },
  }
);

// Hash password before saving
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) {
    return next();
  }
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (err) {
    next(err);
  }
});

// Compare password instance method
userSchema.methods.comparePassword = async function (candidatePassword) {
  if (!this.password) {
    return false;
  }
  return bcrypt.compare(candidatePassword, this.password);
};

// Update streak helper
userSchema.methods.recordStudyActivity = async function () {
  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];

  if (!this.lastStudyDate) {
    this.streak = 1;
    this.lastStudyDate = now;
    return this.save();
  }

  const lastStr = new Date(this.lastStudyDate).toISOString().split('T')[0];
  const diffDays = Math.floor((new Date(todayStr) - new Date(lastStr)) / (1000 * 60 * 60 * 24));

  if (diffDays === 1) {
    this.streak += 1;
    this.lastStudyDate = now;
    return this.save();
  } else if (diffDays > 1) {
    this.streak = 1;
    this.lastStudyDate = now;
    return this.save();
  }
  // If diffDays === 0, already studied today, keep streak
  return this;
};

const User = mongoose.models.User || mongoose.model('User', userSchema);
module.exports = User;

