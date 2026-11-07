const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

const connectDB = require('./config/db');
const authRoutes = require('./routes/auth.routes');
const deckRoutes = require('./routes/deck.routes');
const cardRoutes = require('./routes/card.routes');
const studyRoutes = require('./routes/study.routes');
const errorHandler = require('./middleware/errorHandler');

const app = express();

// Initialize DB connection in background
connectDB().catch((err) => {
  console.error('[Server] Initial MongoDB connection failure:', err.message);
});

// Middleware configuration
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, curl, or server-to-server)
      if (!origin) return callback(null, true);
      return callback(null, true);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true, limit: '5mb' }));

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'ConceptCards API',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    nodeEnv: process.env.NODE_ENV || 'development',
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/decks', deckRoutes);
app.use('/api/cards', cardRoutes);
app.use('/api/study', studyRoutes);

// Catch-all for undefined API routes
app.all('/api/*', (req, res) => {
  res.status(404).json({
    success: false,
    message: `Endpoint ${req.method} ${req.originalUrl} not found`,
  });
});

// Centralized error handling
app.use(errorHandler);

// Standalone server execution (local development)
const PORT = process.env.PORT || 5000;
if (process.env.NODE_ENV !== 'production' || !process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`[ConceptCards API] Server active on http://localhost:${PORT}`);
  });
}

// Export express application instance for Vercel Serverless Function runtime
module.exports = app;

