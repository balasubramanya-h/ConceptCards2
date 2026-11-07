# ConceptCards 🧠✨

> Production-ready, collaborative flashcard platform featuring **intelligent duplicate prevention**, **deep hierarchical organization**, and **automated SuperMemo-2 (SM-2) spaced repetition scheduling**.

Built as a unified full-stack monorepo ready for instant zero-config deployment on **Vercel** with Express serverless functions and a React + Vite + Tailwind CSS frontend.

---

## 📑 Table of Contents
- [Architecture & Tech Stack](#architecture--tech-stack)
- [Key Features](#key-features)
  - [1. Automated SM-2 Spaced Repetition Engine](#1-automated-sm-2-spaced-repetition-engine)
  - [2. Multi-Metric Duplicate Prevention](#2-multi-metric-duplicate-prevention)
  - [3. Hierarchical Deck Organization](#3-hierarchical-deck-organization)
  - [4. Real-Time Collaboration & Public Community Hub](#4-real-time-collaboration--public-community-hub)
- [Directory Structure](#directory-structure)
- [Local Development Setup](#local-development-setup)
- [Verification & Automated Test Suite](#verification--automated-test-suite)
- [Database Seeding](#database-seeding)
- [API Reference](#api-reference)
- [Vercel Deployment Guide](#vercel-deployment-guide)

---

## Architecture & Tech Stack

```text
conceptcards/
├── vercel.json                 # Vercel Monorepo Serverless config
├── package.json                # Root scripts (build, dev, verify, seed)
├── .env.example                # Environment variable specification
├── api/                        # Express Backend (Serverless Function Target)
│   ├── index.js                # Express Serverless Entrypoint
│   ├── config/db.js            # Cached Mongoose Connection Handler
│   ├── middleware/             # Auth JWT, Validations, Error Handling
│   ├── models/                 # User, Deck, Card, ReviewLog
│   ├── routes/                 # Auth, Deck, Card, Study routes
│   └── utils/                  # SM-2 engine & Duplicate Detector
└── client/                     # React + Vite Frontend SPA
    ├── src/
    │   ├── context/            # AuthContext & Session management
    │   ├── components/         # Badges, Modals, 3D Flashcards, Nav
    │   ├── pages/              # Landing, Auth, Dashboard, Deck, Study
    │   └── utils/              # Axios instance with interceptors
```

- **Frontend**: React 18, Vite, Tailwind CSS, Lucide Icons, Canvas Confetti
- **Backend**: Node.js, Express, Mongoose (MongoDB ODM), JSON Web Tokens (JWT), Bcrypt.js
- **Algorithms**: SuperMemo-2 (SM-2), Levenshtein Distance, Jaccard Index, Bigram Dice Coefficient
- **Deployment**: Vercel Serverless Monorepo Target (`@vercel/node` + static SPA rewrites)

---

## Key Features

### 1. Automated SM-2 Spaced Repetition Engine
ConceptCards implements the **SuperMemo-2 (SM-2)** algorithm to optimize long-term memory retention and eliminate the forgetting curve:
- **Quality Scale ($q \in [0, 5]$)**:
  - `0 - Blackout`: Complete failure to recall
  - `1 - Again`: Wrong response; remembered upon seeing solution
  - `2 - Hard`: Wrong response; seemed familiar
  - `3 - Good`: Correct response recalled with serious effort
  - `4 - Easy`: Correct response after hesitation
  - `5 - Perfect`: Instantaneous, effortless recall
- **Dynamic Intervals ($I$) & Ease Factor ($EF$)**:
  $$EF' = \max\left(1.3,\; EF + \left(0.1 - (5 - q) \times (0.08 + (5 - q) \times 0.02)\right)\right)$$
  - For $q < 3$: Repetition count resets to 0, Interval resets to 1 day.
  - For $q \ge 3$:
    - If $n = 0 \implies I_1 = 1\text{ day}$
    - If $n = 1 \implies I_2 = 6\text{ days}$
    - If $n > 1 \implies I_n = \text{round}(I_{n-1} \times EF)$
- **Dynamic Interval Previews**: The study interface calculates and displays exact next intervals (`<1d`, `1d`, `6d`, `15d`, etc.) on rating buttons *before* the user clicks, enabling informed self-evaluation.
- **Review History Logging**: Every review records `intervalBefore/After`, `easeFactorBefore/After`, and `responseTimeMs` into `ReviewLog`.

### 2. Multi-Metric Duplicate Prevention
Duplicate flashcards dilute study time and cause false repetition signals. ConceptCards analyzes card prompts and answers using a composite similarity pipeline:
- **Text Normalization**: Strips markdown formatting, punctuation, and flashcard stop-prefixes (`"What is"`, `"Define"`, `"Explain"`, `"How does"`).
- **Composite Distance Metrics**:
  - **Levenshtein Distance**: Edit distance normalized across token lengths.
  - **Jaccard Token Similarity**: Word set intersection over union.
  - **Dice Bigram Coefficient**: Substring pair overlap.
- **Real-Time Warning Badge (`DuplicateWarningBadge`)**:
  - Debounced (280ms) real-time scanning as user types.
  - High match ($\ge 85\%$): Blocks save and displays comparison view with existing card.
  - Warning match ($65\% - 84\%$): Alerts user of semantic similarity.
  - Force-Save Override: Allows user to bypass warning if they intentionally want duplicate entries.

### 3. Hierarchical Deck Organization
- Decks can reference a `parentDeck`, forming an arbitrary-depth category tree.
- Breadcrumb navigation (`Root > Computer Science > Distributed Systems`).
- Circular hierarchy detection prevents a deck from becoming its own ancestor.
- Study Session Modes:
  - Leaf Deck Study: Only study cards in the current deck.
  - Recursive Tree Study: Toggle **"Include Child Subdecks"** to gather cards from all descendant subdecks into one consolidated study session.

### 4. Real-Time Collaboration & Public Community Hub
- **Access Roles**: Deck owners can invite collaborators as **Editor** (can add/edit cards) or **Viewer** (can study and inspect).
- **Community Hub**: Public decks can be browsed and **forked** with one click into a user's private library with clean SM-2 scheduling.

---

## Local Development Setup

### Prerequisites
- Node.js $\ge 18$
- MongoDB instance (MongoDB Atlas URI or local `mongodb://localhost:27017/conceptcards`)

### 1. Clone & Install
```bash
git clone <repo-url> conceptcards
cd conceptcards

# Install root & client dependencies
npm run install:all
```

### 2. Configure Environment
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
Update `MONGODB_URI` and `JWT_SECRET` as appropriate.

### 3. Database Seeding (Optional)
Populate realistic demo users, hierarchical decks, and spaced repetition cards:
```bash
npm run seed
```

**Seed Credentials**:
- User 1: `demo@conceptcards.io` / `demo123456` (`demo_learner`)
- User 2: `sarah@conceptcards.io` / `demo123456` (`sarah_dev`)

### 4. Run Development Servers
```bash
npm run dev
```
- Client runs on `http://localhost:5173`
- API runs on `http://localhost:5000` (proxied by Vite)

---

## Verification & Automated Test Suite

Run the automated engine test suite (verifying SM-2, duplicate prevention, and formatting):
```bash
npm run verify
```

Run the end-to-end integration test suite against an in-memory database:
```bash
node scripts/test-integration.js
```

---

## API Reference

### Auth (`/api/auth`)
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/api/auth/register` | Register new user account & return JWT |
| `POST` | `/api/auth/login` | Authenticate with email/username & password |
| `GET` | `/api/auth/me` | Fetch authenticated user profile & study stats |
| `PUT` | `/api/auth/me` | Update display name, bio, target |

### Decks (`/api/decks`)
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/decks` | List accessible decks (supports `parentDeck=root`, search, tags) |
| `GET` | `/api/decks/public` | List public community decks for discovery |
| `POST` | `/api/decks` | Create deck (root or child subdeck) |
| `GET` | `/api/decks/:id` | Get deck details, direct subdecks, and card stats |
| `GET` | `/api/decks/:id/breadcrumbs` | Get ancestor chain for hierarchical navigation |
| `PUT` | `/api/decks/:id` | Update deck metadata and hierarchy |
| `DELETE` | `/api/decks/:id` | Recursively delete deck, subdecks, and cards |
| `POST` | `/api/decks/:id/collaborators` | Invite collaborator by email or username |
| `DELETE` | `/api/decks/:id/collaborators/:userId`| Remove collaborator |
| `POST` | `/api/decks/:id/fork` | Clone public deck into user vault |

### Cards (`/api/cards`)
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/cards/deck/:deckId` | Get cards in deck (supports `includeSubdecks=true`) |
| `POST` | `/api/cards` | Create card with duplicate prevention check |
| `POST` | `/api/cards/check-duplicate` | Real-time duplicate check endpoint |
| `GET` | `/api/cards/:id` | Get card details with interval previews |
| `PUT` | `/api/cards/:id` | Update card with duplicate re-screen |
| `DELETE` | `/api/cards/:id` | Delete card |
| `POST` | `/api/cards/batch-import` | Bulk import cards from JSON/CSV with duplicate screening |

### Study (`/api/study`)
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/study/due/:deckId` | Get scheduled queue for a deck (`mode=due` or `cram`) |
| `GET` | `/api/study/due-all` | Global due queue across all user decks |
| `POST` | `/api/study/review/:cardId` | Submit SM-2 review rating (0-5) and log review |
| `GET` | `/api/study/analytics/:deckId` | Deck retention rate, mastery breakdown, activity logs |
| `GET` | `/api/study/analytics-summary`| User streak, weekly review trend, retention stats |

---

## Vercel Deployment Guide

Deploying ConceptCards to Vercel requires zero code modifications:

1. **Push code to GitHub/GitLab**.
2. **Import repository into Vercel**.
3. **Set Root Directory**: Leave as `.` (root).
4. **Environment Variables**: Add in Vercel Project Settings:
   - `MONGODB_URI`: Your MongoDB Atlas connection URI
   - `JWT_SECRET`: A secure random secret string
   - `NODE_ENV`: `production`
5. **Click Deploy**: Vercel executes `npm run build --prefix client`, builds static assets to `client/dist`, and routes `/api/*` to the serverless Express function `api/index.js` via `vercel.json`.

