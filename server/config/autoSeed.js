const User = require('../models/User');
const Deck = require('../models/Deck');
const Card = require('../models/Card');
const ReviewLog = require('../models/ReviewLog');

/**
 * Automatically seeds the database if empty in development mode
 */
async function autoSeedIfEmpty() {
  try {
    const userCount = await User.countDocuments();
    if (userCount > 0) return;

    console.log('[AutoSeed] Database is empty. Seeding initial demo account and sample flashcard decks...');

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

    // 1. Root Deck
    const rootCS = await Deck.create({
      title: 'Computer Science Core',
      description: 'Foundational principles of algorithms, data structures, and computer architecture.',
      owner: demoUser._id,
      color: '#6366f1',
      tags: ['computer-science', 'foundations', 'theory'],
      isPublic: true,
    });

    // 1.1 Subdeck: Algorithms
    const subAlgorithms = await Deck.create({
      title: 'Algorithms & Complexity',
      description: 'Graph algorithms, dynamic programming, and asymptotic bounds.',
      parentDeck: rootCS._id,
      owner: demoUser._id,
      color: '#0ea5e9',
      tags: ['algorithms', 'dsa', 'big-o'],
      isPublic: true,
    });

    // 1.2 Subdeck: Distributed Systems
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

    // 2. Standalone Root Deck
    const rootReact = await Deck.create({
      title: 'Modern JavaScript & React Internals',
      description: 'Event loop, closures, React Fiber reconciliation, and concurrent mode.',
      owner: demoUser._id,
      color: '#8b5cf6',
      tags: ['javascript', 'react', 'web-dev'],
      isPublic: true,
    });

    const now = Date.now();
    const ONE_DAY = 24 * 60 * 60 * 1000;

    const cardsData = [
      {
        deck: subAlgorithms._id,
        front: 'What is the time complexity of building a binary heap from an unsorted array of N elements?',
        back: 'O(N) time using Floyd’s linear-time heap construction algorithm (sift-down operations from bottom up), rather than O(N log N) from repeated insertions.',
        hints: ['Think of geometric summation of heights at each tree level.'],
        tags: ['heap', 'complexity'],
        createdBy: demoUser._id,
        repetition: 2,
        interval: 6,
        easeFactor: 2.5,
        nextReviewDate: new Date(now - ONE_DAY), // Due!
        masteryLevel: 'Review',
        totalReviews: 2,
      },
      {
        deck: subAlgorithms._id,
        front: 'How does Dijkstra’s shortest path algorithm handle negative edge weights?',
        back: 'Dijkstra’s algorithm fails on graphs with negative edge weights because it greedily assumes visited nodes have finalized distances. Bellman-Ford or SPFA must be used instead.',
        hints: ['Greedy optimality assumption fails.'],
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
        deck: subDistributed._id,
        front: 'What does the CAP theorem state regarding distributed data stores?',
        back: 'A distributed data store can simultaneously provide at most two out of three guarantees: Consistency, Availability, and Partition Tolerance. Since network partitions are inevitable, distributed stores choose between CP and AP.',
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
        back: 'Linearizability is a real-time guarantee where operations take effect instantaneously between invocation and response according to global wall-clock time. Sequential Consistency requires an execution order respecting each process’s program order without real-time constraints.',
        hints: ['Linearizability is strictly stronger.'],
        tags: ['linearizability', 'consistency-models'],
        createdBy: demoUser._id,
        repetition: 1,
        interval: 1,
        easeFactor: 2.3,
        nextReviewDate: new Date(now - 12 * 60 * 60 * 1000), // Due!
        masteryLevel: 'Learning',
        totalReviews: 2,
      },
      {
        deck: subConsensus._id,
        front: 'In the Raft consensus algorithm, how is split vote resolved during Leader Election?',
        back: 'Raft uses randomized election timeouts (150ms-300ms) for followers. One candidate times out first and gathers quorum votes before another candidate can compete, breaking election deadlocks.',
        hints: ['Randomization breaks symmetry.'],
        tags: ['raft', 'leader-election'],
        createdBy: demoUser._id,
        repetition: 0,
        interval: 0,
        easeFactor: 2.5,
        nextReviewDate: new Date(now - 1000), // Due!
        masteryLevel: 'New',
      },
      {
        deck: rootReact._id,
        front: 'What is the purpose of the React Fiber reconciler?',
        back: 'React Fiber enables Incremental Rendering: splitting rendering into chunks, prioritizing updates (user input vs data fetch), and pausing or resuming work without blocking the main browser thread.',
        hints: ['Introduced in React 16.'],
        tags: ['react', 'fiber', 'concurrency'],
        createdBy: demoUser._id,
        repetition: 2,
        interval: 6,
        easeFactor: 2.5,
        nextReviewDate: new Date(now - ONE_DAY), // Due!
        masteryLevel: 'Review',
        totalReviews: 2,
      },
    ];

    await Card.insertMany(cardsData);

    console.log('[AutoSeed] Sample hierarchical decks and cards seeded successfully!');
    console.log('[AutoSeed] Ready to log in with: demo@conceptcards.io / demo123456');
  } catch (err) {
    console.warn('[AutoSeed] Notice:', err.message);
  }
}

module.exports = autoSeedIfEmpty;

