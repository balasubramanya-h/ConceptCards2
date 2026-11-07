const mongoose = require('mongoose');

/**
 * Validates registration input
 */
function validateRegister(req, res, next) {
  const { username, email, password } = req.body;
  const errors = [];

  if (!username || typeof username !== 'string' || username.trim().length < 3) {
    errors.push('Username must be at least 3 characters long');
  } else if (!/^[a-zA-Z0-9_]+$/.test(username.trim())) {
    errors.push('Username can only contain alphanumeric characters and underscores');
  }

  const emailRegex = /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/;
  if (!email || typeof email !== 'string' || !emailRegex.test(email.trim())) {
    errors.push('A valid email address is required');
  }

  if (!password || typeof password !== 'string' || password.length < 6) {
    errors.push('Password must be at least 6 characters long');
  }

  if (errors.length > 0) {
    return res.status(400).json({ success: false, message: errors[0], errors });
  }

  next();
}

/**
 * Validates login input
 */
function validateLogin(req, res, next) {
  const { email, password } = req.body;
  const errors = [];

  if (!email || typeof email !== 'string' || !email.trim()) {
    errors.push('Email or username is required');
  }

  if (!password || typeof password !== 'string') {
    errors.push('Password is required');
  }

  if (errors.length > 0) {
    return res.status(400).json({ success: false, message: errors[0], errors });
  }

  next();
}

/**
 * Validates deck creation/update input
 */
function validateDeck(req, res, next) {
  const { title, parentDeck, color } = req.body;
  const errors = [];

  if (!title || typeof title !== 'string' || !title.trim()) {
    errors.push('Deck title is required');
  } else if (title.trim().length > 120) {
    errors.push('Deck title cannot exceed 120 characters');
  }

  if (parentDeck && !mongoose.Types.ObjectId.isValid(parentDeck)) {
    errors.push('Invalid parent deck ID format');
  }

  if (color && !/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(color)) {
    errors.push('Color must be a valid hex code (e.g. #6366f1)');
  }

  if (errors.length > 0) {
    return res.status(400).json({ success: false, message: errors[0], errors });
  }

  next();
}

/**
 * Validates card creation/update input
 */
function validateCard(req, res, next) {
  const { front, back } = req.body;
  const errors = [];

  if (!front || typeof front !== 'string' || !front.trim()) {
    errors.push('Card front (question/prompt) is required');
  } else if (front.trim().length > 3000) {
    errors.push('Card front cannot exceed 3000 characters');
  }

  if (!back || typeof back !== 'string' || !back.trim()) {
    errors.push('Card back (answer/solution) is required');
  } else if (back.trim().length > 5000) {
    errors.push('Card back cannot exceed 5000 characters');
  }

  if (errors.length > 0) {
    return res.status(400).json({ success: false, message: errors[0], errors });
  }

  next();
}

/**
 * Validates SM-2 review rating submission
 */
function validateReview(req, res, next) {
  const { quality } = req.body;

  if (quality === undefined || quality === null || typeof quality !== 'number') {
    return res.status(400).json({
      success: false,
      message: 'Quality rating is required (0 to 5)',
    });
  }

  if (quality < 0 || quality > 5 || !Number.isInteger(quality)) {
    return res.status(400).json({
      success: false,
      message: 'Quality rating must be an integer between 0 and 5',
    });
  }

  next();
}

/**
 * Validates collaborator addition
 */
function validateCollaborator(req, res, next) {
  const { identifier, role } = req.body; // identifier can be email or username
  const errors = [];

  if (!identifier || typeof identifier !== 'string' || !identifier.trim()) {
    errors.push('Collaborator email or username is required');
  }

  if (role && !['viewer', 'editor'].includes(role)) {
    errors.push('Role must be either "viewer" or "editor"');
  }

  if (errors.length > 0) {
    return res.status(400).json({ success: false, message: errors[0], errors });
  }

  next();
}

module.exports = {
  validateRegister,
  validateLogin,
  validateDeck,
  validateCard,
  validateReview,
  validateCollaborator,
};

