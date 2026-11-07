/**
 * Full End-to-End API Integration Verification Test
 * Runs against an in-memory MongoDB instance to verify authentication,
 * hierarchical decks, duplicate prevention blocking, and SM-2 review logging.
 */

const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');

// Import models & utilities
const User = require('../api/models/User');
const Deck = require('../api/models/Deck');
const Card = require('../api/models/Card');
const ReviewLog = require('../api/models/ReviewLog');
const { calculateSM2 } = require('../api/utils/sm2');
const { findDuplicates } = require('../api/utils/duplicateDetector');

async function runIntegrationTests() {
  console.log('\n======================================================');
  console.log('   ConceptCards End-to-End Integration Verification');
  console.log('======================================================\n');

  let mongod;
  try {
    console.log('[Setup] Starting in-memory MongoDB server...');
    mongod = await MongoMemoryServer.create();
    const uri = mongod.getUri();
    await mongoose.connect(uri);
    console.log('[Setup] Connected to in-memory database successfully.\n');

    // 1. User Registration & Password Hashing
    console.log('[Test 1] User Registration & Authentication');
    const user = await User.create({
      username: 'ada_lovelace',
      email: 'ada@example.com',
      password: 'password123',
      displayName: 'Ada Lovelace',
    });
    if (!user || user.username !== 'ada_lovelace') throw new Error('User creation failed');

    const authUser = await User.findOne({ email: 'ada@example.com' }).select('+password');
    const isPasswordValid = await authUser.comparePassword('password123');
    if (!isPasswordValid) throw new Error('Password hashing or comparison failed');
    console.log('  ✔ PASS: User registered, password hashed with bcrypt, and verified.\n');

    // 2. Hierarchical Decks Creation & Subdeck Nesting
    console.log('[Test 2] Hierarchical Deck Structure');
    const rootDeck = await Deck.create({
      title: 'Computer Science',
      owner: user._id,
      color: '#6366f1',
    });

    const subdeck = await Deck.create({
      title: 'Algorithms',
      parentDeck: rootDeck._id,
      owner: user._id,
      color: '#0ea5e9',
    });

    if (subdeck.parentDeck.toString() !== rootDeck._id.toString()) {
      throw new Error('Parent deck hierarchy assignment failed');
    }
    console.log('  ✔ PASS: Root deck and nested child subdeck created.\n');

    // 3. Card Creation & Normalization
    console.log('[Test 3] Card Creation & Duplicate Detection');
    const card1 = await Card.create({
      deck: subdeck._id,
      front: 'What is the time complexity of QuickSort average case?',
      back: 'O(N log N) average case time complexity.',
      createdBy: user._id,
    });
    if (!card1.normalizedFront) throw new Error('Card front normalization pre-hook failed');
    console.log('  ✔ PASS: Flashcard created with normalized text index.');

    // 4. Duplicate Prevention Screen
    const duplicateCandidate = {
      front: 'Define the time complexity of QuickSort in average case?',
      back: 'O(N log N)',
    };

    const existingCards = await Card.find({ deck: subdeck._id }).lean();
    const dupCheck = findDuplicates(duplicateCandidate, existingCards, 65);

    if (!dupCheck.hasDuplicate || dupCheck.highestScore < 80) {
      throw new Error(`Expected high duplicate score but got ${dupCheck.highestScore}%`);
    }
    console.log(`  ✔ PASS: Duplicate detector correctly flagged near-duplicate (${dupCheck.highestScore}% match, severity: ${dupCheck.severity}).\n`);

    // 5. SM-2 Spaced Repetition Scheduling & ReviewLog
    console.log('[Test 4] SM-2 Review Recording & Progression');
    const sm2Update = calculateSM2(card1, 4); // User recalled correctly with hesitation

    card1.repetition = sm2Update.repetition;
    card1.interval = sm2Update.interval;
    card1.easeFactor = sm2Update.easeFactor;
    card1.nextReviewDate = sm2Update.nextReviewDate;
    card1.masteryLevel = sm2Update.masteryLevel;
    await card1.save();

    const reviewLog = await ReviewLog.create({
      card: card1._id,
      deck: subdeck._id,
      user: user._id,
      quality: 4,
      intervalBefore: 0,
      intervalAfter: sm2Update.interval,
      easeFactorBefore: 2.5,
      easeFactorAfter: sm2Update.easeFactor,
      repetitionBefore: 0,
      repetitionAfter: sm2Update.repetition,
      masteryLevelBefore: 'New',
      masteryLevelAfter: sm2Update.masteryLevel,
      responseTimeMs: 3200,
    });

    if (!reviewLog || reviewLog.quality !== 4) {
      throw new Error('ReviewLog creation failed');
    }
    console.log(`  ✔ PASS: SM-2 updated interval to ${sm2Update.interval}d, repetition to ${sm2Update.repetition}, and logged review in database.`);

    // 6. User Activity Streak Recording
    await user.recordStudyActivity();
    if (user.streak !== 1) throw new Error('User streak increment failed');
    console.log(`  ✔ PASS: User study streak automatically recorded (${user.streak}d streak).\n`);

    console.log('======================================================');
    console.log('✔ All End-to-End Integration Tests Passed Successfully!');
    console.log('======================================================\n');
  } catch (err) {
    console.error('✖ Integration test failed:', err);
    process.exit(1);
  } finally {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
    if (mongod) {
      await mongod.stop();
    }
  }
}

runIntegrationTests();

