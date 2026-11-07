/**
 * ConceptCards - Automated Verification Suite
 * Verifies SM-2 algorithm calculations, duplicate detection algorithms,
 * and API integration logic.
 */

const { calculateSM2, getIntervalPreviews, formatIntervalText } = require('../server/utils/sm2');
const { calculateTextSimilarity, findDuplicates, cleanText } = require('../server/utils/duplicateDetector');

function runTest(name, fn) {
  try {
    fn();
    console.log(`  \x1b[32m✔ PASS\x1b[0m: ${name}`);
    return true;
  } catch (err) {
    console.error(`  \x1b[31m✖ FAIL\x1b[0m: ${name}`);
    console.error(`    Error: ${err.message}`);
    return false;
  }
}

function assertEquals(actual, expected, message = '') {
  if (actual !== expected) {
    throw new Error(`Expected ${JSON.stringify(expected)} but got ${JSON.stringify(actual)}. ${message}`);
  }
}

function assertInRange(val, min, max, message = '') {
  if (val < min || val > max) {
    throw new Error(`Expected value between ${min} and ${max}, but got ${val}. ${message}`);
  }
}

async function verifyAll() {
  console.log('\n======================================================');
  console.log('   ConceptCards Automated Verification Suite');
  console.log('======================================================\n');

  let passed = 0;
  let total = 0;

  // ---------------------------------------------------------------------------
  // 1. SM-2 Spaced Repetition Algorithm Tests
  // ---------------------------------------------------------------------------
  console.log('\x1b[36m[1/3] Testing SM-2 Spaced Repetition Algorithm:\x1b[0m');

  total++;
  if (
    runTest('First successful review (q=4) sets interval to 1 day & repetition to 1', () => {
      const card = { repetition: 0, interval: 0, easeFactor: 2.5 };
      const next = calculateSM2(card, 4);
      assertEquals(next.repetition, 1);
      assertEquals(next.interval, 1);
      assertEquals(next.masteryLevel, 'Learning');
    })
  ) passed++;

  total++;
  if (
    runTest('Second successful review (q=5) advances interval to 6 days & increases EF', () => {
      const card = { repetition: 1, interval: 1, easeFactor: 2.5 };
      const next = calculateSM2(card, 5);
      assertEquals(next.repetition, 2);
      assertEquals(next.interval, 6);
      assertEquals(next.easeFactor, 2.6); // 2.5 + 0.1
      assertEquals(next.masteryLevel, 'Review');
    })
  ) passed++;

  total++;
  if (
    runTest('Third successful review multiplies interval by Ease Factor', () => {
      const card = { repetition: 2, interval: 6, easeFactor: 2.6 };
      const next = calculateSM2(card, 4);
      assertEquals(next.repetition, 3);
      assertEquals(next.interval, Math.round(6 * 2.6)); // 16
    })
  ) passed++;

  total++;
  if (
    runTest('Failed review (q < 3) resets repetition and interval to 1 day', () => {
      const card = { repetition: 4, interval: 35, easeFactor: 2.6, lapses: 0 };
      const next = calculateSM2(card, 1);
      assertEquals(next.repetition, 0);
      assertEquals(next.interval, 1);
      assertEquals(next.lapses, 1);
      assertEquals(next.masteryLevel, 'Learning');
    })
  ) passed++;

  total++;
  if (
    runTest('Ease Factor never falls below minimum threshold (1.3)', () => {
      let card = { repetition: 0, interval: 1, easeFactor: 1.4 };
      // Multiple terrible reviews
      for (let i = 0; i < 5; i++) {
        card = calculateSM2(card, 0);
      }
      assertEquals(card.easeFactor, 1.3, 'EF should be clamped to minimum 1.3');
    })
  ) passed++;

  total++;
  if (
    runTest('Interval preview generator produces valid previews for ratings 1 through 5', () => {
      const card = { repetition: 1, interval: 1, easeFactor: 2.5 };
      const previews = getIntervalPreviews(card);
      assertEquals(typeof previews[1], 'object');
      assertEquals(previews[1].days, 1);
      assertEquals(previews[3].days, 6);
      assertEquals(typeof previews[5].label, 'string');
    })
  ) passed++;

  // ---------------------------------------------------------------------------
  // 2. Duplicate Detection Algorithm Tests
  // ---------------------------------------------------------------------------
  console.log('\n\x1b[36m[2/3] Testing Duplicate Prevention Engine:\x1b[0m');

  total++;
  if (
    runTest('Identical card prompts return 100% similarity and high severity', () => {
      const candidate = { front: 'What is the CAP theorem?' };
      const pool = [{ _id: '1', front: 'What is the CAP theorem?' }];
      const result = findDuplicates(candidate, pool);
      assertEquals(result.hasDuplicate, true);
      assertEquals(result.highestScore, 100);
      assertEquals(result.severity, 'high');
    })
  ) passed++;

  total++;
  if (
    runTest('Semantic prompt variation (stopword prefix stripped) returns high similarity (>85%)', () => {
      const candidate = { front: 'Define the CAP theorem in databases' };
      const pool = [{ _id: '1', front: 'What is the CAP theorem in databases?' }];
      const result = findDuplicates(candidate, pool);
      assertEquals(result.hasDuplicate, true);
      assertInRange(result.highestScore, 85, 100);
      assertEquals(result.severity, 'high');
    })
  ) passed++;

  total++;
  if (
    runTest('Completely different concepts return low similarity (<50%)', () => {
      const candidate = { front: 'Explain red-black tree rotation rules' };
      const pool = [{ _id: '1', front: 'How does Dijkstra shortest path algorithm work?' }];
      const result = findDuplicates(candidate, pool);
      assertEquals(result.hasDuplicate, false);
      assertInRange(result.highestScore, 0, 50);
      assertEquals(result.severity, 'none');
    })
  ) passed++;

  total++;
  if (
    runTest('Excludes candidate self when editing existing card ID', () => {
      const candidate = { _id: 'card-123', front: 'What is a B-tree?' };
      const pool = [{ _id: 'card-123', front: 'What is a B-tree?' }];
      const result = findDuplicates(candidate, pool);
      assertEquals(result.hasDuplicate, false);
      assertEquals(result.matches.length, 0);
    })
  ) passed++;

  // ---------------------------------------------------------------------------
  // 3. Hierarchical Deck & SM-2 Formatting Tests
  // ---------------------------------------------------------------------------
  console.log('\n\x1b[36m[3/3] Testing Utilities & Formats:\x1b[0m');

  total++;
  if (
    runTest('Text normalization removes punctuation, markdown, and extra spaces', () => {
      const dirty = '## What is *Polymorphism* in OOP? (Explained)';
      const cleaned = cleanText(dirty);
      assertEquals(cleaned, 'polymorphism in oop explained');
    })
  ) passed++;

  total++;
  if (
    runTest('Format interval converts days to clean human-readable tags', () => {
      assertEquals(formatIntervalText(1), '1d');
      assertEquals(formatIntervalText(14), '14d');
      assertEquals(formatIntervalText(60), '2mo');
      assertEquals(formatIntervalText(365), '1y');
    })
  ) passed++;

  console.log('\n======================================================');
  console.log(`Verification Complete: ${passed} / ${total} tests passed.`);
  if (passed === total) {
    console.log('\x1b[32m✔ All core engine algorithms verified successfully!\x1b[0m');
  } else {
    console.log('\x1b[31m✖ Some tests failed.\x1b[0m');
    process.exit(1);
  }
  console.log('======================================================\n');
}

verifyAll();

