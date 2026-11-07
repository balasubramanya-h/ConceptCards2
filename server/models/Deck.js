const mongoose = require('mongoose');

const collaboratorSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    role: {
      type: String,
      enum: ['viewer', 'editor'],
      default: 'editor',
    },
    addedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false }
);

const deckSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Deck title is required'],
      trim: true,
      minlength: [1, 'Deck title cannot be empty'],
      maxlength: [120, 'Deck title cannot exceed 120 characters'],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [500, 'Description cannot exceed 500 characters'],
      default: '',
    },
    parentDeck: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Deck',
      default: null,
      index: true,
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    collaborators: [collaboratorSchema],
    tags: [
      {
        type: String,
        trim: true,
        lowercase: true,
      },
    ],
    color: {
      type: String,
      default: '#6366f1', // Indigo
      match: [/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, 'Please provide a valid hex color code'],
    },
    icon: {
      type: String,
      default: 'folder',
    },
    isPublic: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Virtual for subdecks
deckSchema.virtual('subdecks', {
  ref: 'Deck',
  localField: '_id',
  foreignField: 'parentDeck',
});

// Virtual for cards
deckSchema.virtual('cards', {
  ref: 'Card',
  localField: '_id',
  foreignField: 'deck',
});

// Resolve an ObjectId string from either a raw ObjectId or a populated document
function refId(ref) {
  if (!ref) return null;
  if (ref._id) return ref._id.toString();
  return ref.toString();
}

// Check permission helper: can user edit this deck?
deckSchema.methods.canEdit = function (userId) {
  if (!userId) return false;
  const uid = userId.toString();
  if (refId(this.owner) === uid) return true;
  const collab = this.collaborators.find((c) => c.user && refId(c.user) === uid);
  return Boolean(collab && collab.role === 'editor');
};

// Check permission helper: can user view this deck?
deckSchema.methods.canView = function (userId) {
  if (this.isPublic) return true;
  if (!userId) return false;
  const uid = userId.toString();
  if (refId(this.owner) === uid) return true;
  return this.collaborators.some((c) => c.user && refId(c.user) === uid);
};

// Membership helper: is the user the owner or a collaborator (any role)?
// Members share the deck's review schedule; public visitors must fork to study.
deckSchema.methods.isMember = function (userId) {
  if (!userId) return false;
  const uid = userId.toString();
  if (refId(this.owner) === uid) return true;
  return this.collaborators.some((c) => c.user && refId(c.user) === uid);
};

// Role helper: 'owner' | 'editor' | 'viewer' | null
deckSchema.methods.roleOf = function (userId) {
  if (!userId) return null;
  const uid = userId.toString();
  if (refId(this.owner) === uid) return 'owner';
  const collab = this.collaborators.find((c) => c.user && refId(c.user) === uid);
  return collab ? collab.role : null;
};

deckSchema.statics.refId = refId;

const Deck = mongoose.models.Deck || mongoose.model('Deck', deckSchema);
module.exports = Deck;

