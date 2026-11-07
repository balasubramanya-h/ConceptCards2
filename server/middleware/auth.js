const jwt = require('jsonwebtoken');
const User = require('../models/User');
const connectDB = require('../config/db');

/**
 * Protect routes - verifies Bearer JWT token and attaches authenticated user
 */
async function protect(req, res, next) {
  try {
    let token;
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Access denied. No authentication token provided.',
      });
    }

    const secret = process.env.JWT_SECRET || 'conceptcards_super_secret_jwt_key_development_2026_change_in_production';
    const decoded = jwt.verify(token, secret);

    await connectDB();
    const user = await User.findById(decoded.id).select('-password');

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'The user belonging to this token no longer exists.',
      });
    }

    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Invalid authentication token.',
      });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Authentication token has expired. Please log in again.',
      });
    }
    next(error);
  }
}

/**
 * Optional authentication - attaches user if valid token exists, but does not block if not
 */
async function optionalAuth(req, res, next) {
  try {
    let token;
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    }

    if (!token) {
      req.user = null;
      return next();
    }

    const secret = process.env.JWT_SECRET || 'conceptcards_super_secret_jwt_key_development_2026_change_in_production';
    const decoded = jwt.verify(token, secret);

    await connectDB();
    const user = await User.findById(decoded.id).select('-password');
    req.user = user || null;
    next();
  } catch {
    req.user = null;
    next();
  }
}

module.exports = {
  protect,
  optionalAuth,
};

