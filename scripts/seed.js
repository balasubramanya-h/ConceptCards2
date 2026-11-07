/**
 * ConceptCards - Database Seeding Script
 * Populates realistic hierarchical decks, flashcards with varied SM-2 schedules,
 * and test accounts for collaborative development and demonstration.
 */

const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

const User = require('../server/models/User');
const Deck = require('../server/models/Deck');
const Card = require('../server/models/Card');
const ReviewLog = require('../server/models/ReviewLog');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/conceptcards';

async function seed() {
  console.log(`[Seed] Connecting to MongoDB: ${MONGODB_URI}...`);
  await mongoose.connect(MONGODB_URI, { serverSelectionTimeoutMS: 8000 });
  console.log('[Seed] Connected.');

  console.log('[Seed] Purging previous seed records...');
  await Promise.all([
    User.deleteMany({ email: { $in: ['demo@conceptcards.io', 'sarah@conceptcards.io'] } }),
    ReviewLog.deleteMany({}),
  ]);

  console.log('[Seed] Creating demo users...');
  const demoUser = await User.create({
    username: 'demo_learner',
    email: 'demo@conceptcards.io',
    password: 'demo123456',
    displayName: 'Alex Turing',
    bio: 'Software engineer mastering distributed systems and algorithmic complexity.',
    dailyReviewTarget: 25,
    streak: 5,
    lastStudyDate: new Date(),
  });

  const collabUser = await User.create({
    username: 'sarah_dev',
    email: 'sarah@conceptcards.io',
    password: 'demo123456',
    displayName: 'Sarah Connor',
    bio: 'Distributed databases and consensus protocol researcher.',
  });

  console.log('[Seed] Building hierarchical deck structure...');
  // 1. Root Deck: Computer Science
  const rootCS = await Deck.create({
    title: 'Computer Science Core',
    description: 'Foundational principles of algorithms, data structures, and computer architecture.',
    owner: demoUser._id,
    color: '#6366f1',
    tags: ['computer-science', 'foundations', 'theory'],
    isPublic: true,
  });

  // 1.1 Subdeck: Algorithms & Complexity
  const subAlgorithms = await Deck.create({
    title: 'Algorithms & Complexity',
    description: 'Graph algorithms, dynamic programming, and asymptotic bounds.',
    parentDeck: rootCS._id,
    owner: demoUser._id,
    color: '#0ea5e9',
    tags: ['algorithms', 'dsa', 'big-o'],
    isPublic: true,
  });

  // 1.2 Subdeck: Distributed Systems & Cloud
  const subDistributed = await Deck.create({
    title: 'Distributed Systems & Architecture',
    description: 'CAP theorem, consensus, eventual consistency, and distributed databases.',
    parentDeck: rootCS._id,
    owner: demoUser._id,
    collaborators: [{ user: collabUser._id, role: 'editor' }],
    color: '#10b981',
    tags: ['distributed-systems', 'cloud', 'architecture'],
    isPublic: true,
  });

  // 1.2.1 Nested Subdeck: Consensus Protocols
  const subConsensus = await Deck.create({
    title: 'Consensus & Replication',
    description: 'Raft, Paxos, Quorums, and two-phase commit.',
    parentDeck: subDistributed._id,
    owner: demoUser._id,
    collaborators: [{ user: collabUser._id, role: 'editor' }],
    color: '#f43f5e',
    tags: ['raft', 'paxos', 'consensus'],
    isPublic: false,
  });

  // 2. Standalone Root Deck: JavaScript & React Internals
  const rootReact = await Deck.create({
    title: 'Modern JavaScript & React Internals',
    description: 'Event loop, closures, React Fiber reconciliation, and concurrent mode.',
    owner: demoUser._id,
    color: '#8b5cf6',
    tags: ['javascript', 'react', 'web-dev'],
    isPublic: true,
  });

  console.log('[Seed] Populating cards with spaced repetition schedules...');

  const now = Date.now();
  const ONE_DAY = 24 * 60 * 60 * 1000;

  const cardsData = [
    // --- Algorithms Cards ---
    {
      deck: subAlgorithms._id,
      front: 'What is the time complexity of building a binary heap from an unsorted array of N elements?',
      back: 'O(N) time using Floyd’s linear-time heap construction algorithm (sift-down operations from the bottom up), rather than O(N log N) from repeated insertions.',
      hints: ['Think of the geometric summation of tree heights at each level.'],
      tags: ['heap', 'complexity'],
      createdBy: demoUser._id,
      repetition: 2,
      interval: 6,
      easeFactor: 2.5,
      nextReviewDate: new Date(now - ONE_DAY), // Due for review!
      masteryLevel: 'Review',
      totalReviews: 2,
    },
    {
      deck: subAlgorithms._id,
      front: 'How does Dijkstra’s shortest path algorithm handle negative edge weights?',
      back: 'Dijkstra’s algorithm fails on graphs with negative edge weights because it greedily assumes once a vertex is visited, its shortest distance is finalized. Bellman-Ford or SPFA must be used instead.',
      hints: ['Greedy optimality assumption is violated.'],
      tags: ['graphs', 'dijkstra'],
      createdBy: demoUser._id,
      repetition: 4,
      interval: 28,
      easeFactor: 2.6,
      nextReviewDate: new Date(now + 20 * ONE_DAY),
      masteryLevel: 'Mastered',
      totalReviews: 4,
    },
    {
      deck: subAlgorithms._id,
      front: 'What is the Master Theorem for divide-and-conquer recurrence relations?',
      back: 'For T(n) = a*T(n/b) + f(n):\nCase 1: If f(n) = O(n^(log_b(a) - ε)), then T(n) = Θ(n^(log_b(a))).\nCase 2: If f(n) = Θ(n^(log_b(a)) * log^k(n)), then T(n) = Θ(n^(log_b(a)) * log^(k+1)(n)).\nCase 3: If f(n) = Ω(n^(log_b(a) + ε)), then T(n) = Θ(f(n)).',
      hints: ['Compare f(n) against n^(log_b a).'],
      tags: ['recurrence', 'master-theorem'],
      createdBy: demoUser._id,
      repetition: 0,
      interval: 0,
      easeFactor: 2.5,
      nextReviewDate: new Date(now - 2 * ONE_DAY), // Due!
      masteryLevel: 'New',
    },

    // --- Distributed Systems Cards ---
    {
      deck: subDistributed._id,
      front: 'What does the CAP theorem state regarding distributed data stores?',
      back: 'A distributed data store can simultaneously provide at most two out of three guarantees: Consistency (every read receives the most recent write), Availability (every non-failing node returns a response), and Partition Tolerance (the system continues to operate despite network splits). Since partitions are inevitable across physical networks, systems must choose between CP and AP.',
      hints: ['Formulated by Eric Brewer in 2000.'],
      tags: ['cap-theorem', 'consistency'],
      createdBy: demoUser._id,
      repetition: 5,
      interval: 45,
      easeFactor: 2.7,
      nextReviewDate: new Date(now + 35 * ONE_DAY),
      masteryLevel: 'Mastered',
      totalReviews: 5,
    },
    {
      deck: subDistributed._id,
      front: 'What is the difference between Linearizability and Sequential Consistency?',
      back: 'Linearizability is a real-time guarantee: operations take effect instantaneously between invocation and response according to global wall-clock time. Sequential Consistency requires all operations to appear in some sequential order that respects each individual process’s program order, but without adhering to global real-time constraints.',
      hints: ['Linearizability is strictly stronger and real-time dependent.'],
      tags: ['linearizability', 'consistency-models'],
      createdBy: demoUser._id,
      repetition: 1,
      interval: 1,
      easeFactor: 2.3,
      nextReviewDate: new Date(now - 12 * 60 * 60 * 1000), // Due today!
      masteryLevel: 'Learning',
      totalReviews: 2,
    },

    // --- Consensus Protocols Cards ---
    {
      deck: subConsensus._id,
      front: 'In the Raft consensus algorithm, how is split vote resolved during Leader Election?',
      back: 'Raft uses randomized election timeouts (typically between 150ms and 300ms) for each follower. This ensures that one candidate usually timeouts first and collects quorum votes before another candidate can start competing, breaking election deadlocks.',
      hints: ['Randomization prevents synchronized split-vote cycles.'],
      tags: ['raft', 'leader-election'],
      createdBy: demoUser._id,
      repetition: 0,
      interval: 0,
      easeFactor: 2.5,
      nextReviewDate: new Date(now - 1000), // Due right now!
      masteryLevel: 'New',
    },
    {
      deck: subConsensus._id,
      front: 'What is the minimum quorum size in a Paxos or Raft cluster of N nodes?',
      back: 'A strict majority: ⌊N/2⌋ + 1 nodes. For a cluster of 5 nodes, the quorum is 3. Any two quorums must overlap in at least one node to guarantee consistency.',
      hints: ['Majority overlap property.'],
      tags: ['quorum', 'paxos', 'raft'],
      createdBy: demoUser._id,
      repetition: 3,
      interval: 16,
      easeFactor: 2.6,
      nextReviewDate: new Date(now + 10 * ONE_DAY),
      masteryLevel: 'Review',
      totalReviews: 3,
    },

    // --- React & JS Cards ---
    {
      deck: rootReact._id,
      front: 'What is the purpose of the React Fiber reconciler?',
      back: 'React Fiber is a complete rewrite of React’s reconciliation algorithm designed to enable Incremental Rendering: the ability to split rendering work into chunks, assign priorities to different updates (e.g. user input vs data fetch), and pause/resume or abort work without blocking the main browser thread.',
      hints: ['Introduced in React 16 to avoid call stack locking.'],
      tags: ['react', 'fiber', 'concurrency'],
      createdBy: demoUser._id,
      repetition: 2,
      interval: 6,
      easeFactor: 2.5,
      nextReviewDate: new Date(now - ONE_DAY), // Due!
      masteryLevel: 'Review',
      totalReviews: 2,
    },
    {
      deck: rootReact._id,
      front: 'How does the JavaScript event loop handle microtasks vs macrotasks?',
      back: 'The event loop processes one macrotask (e.g., setTimeout callback, I/O) from the task queue, and then immediately drains the entire microtask queue (Promise callbacks, queueMicrotask, MutationObserver) until empty before rendering and moving to the next macrotask.',
      hints: ['Microtasks run immediately after current execution stack and before next task.'],
      tags: ['event-loop', 'async', 'javascript'],
      createdBy: demoUser._id,
      repetition: 5,
      interval: 60,
      easeFactor: 2.8,
      nextReviewDate: new Date(now + 45 * ONE_DAY),
      masteryLevel: 'Mastered',
      totalReviews: 5,
    },
  ];

  await Card.insertMany(cardsData);

  console.log('[Seed] Seeding sample review logs for analytics...');
  await ReviewLog.create([
    {
      card: cardsData[0]._id || new mongoose.Types.ObjectId(),
      deck: subAlgorithms._id,
      user: demoUser._id,
      quality: 4,
      intervalBefore: 1,
      intervalAfter: 6,
      easeFactorBefore: 2.5,
      easeFactorAfter: 2.5,
      repetitionBefore: 1,
      repetitionAfter: 2,
      masteryLevelAfter: 'Review',
      responseTimeMs: 2400,
      reviewedAt: new Date(now - 6 * ONE_DAY),
    },
    {
      card: cardsData[3]._id || new mongoose.Types.ObjectId(),
      deck: subDistributed._id,
      user: demoUser._id,
      quality: 5,
      intervalBefore: 16,
      intervalAfter: 45,
      easeFactorBefore: 2.6,
      easeFactorAfter: 2.7,
      repetitionBefore: 4,
      repetitionAfter: 5,
      masteryLevelAfter: 'Mastered',
      responseTimeMs: 1800,
      reviewedAt: new Date(now - 2 * ONE_DAY),
    },
  ]);

  console.log('\n======================================================');
  console.log('   ConceptCards Database Seeding Complete!');
  console.log('======================================================');
  console.log('Demo Credentials:');
  console.log('  Email:    demo@conceptcards.io');
  console.log('  Password: demo123456');
  console.log('  Username: demo_learner');
  console.log('\nCollaborator Credentials:');
  console.log('  Email:    sarah@conceptcards.io');
  console.log('  Password: demo123456');
  console.log('  Username: sarah_dev');
  console.log('======================================================\n');

  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error('[Seed] Error during seeding:', err);
  process.exit(1);
});

