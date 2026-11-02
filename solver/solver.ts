import { pickByLetterFrequency, scoreWordsByFrequency } from './frequency.ts';
import type { PatternMatrix } from './matrix.ts';
import { PATTERN_COUNT } from './pattern.ts';
import type { Strategy, Word } from './pattern.ts';

function estimateRemainingSteps(remainingEntropy: number): number {
  return Math.log(remainingEntropy * 3.87 + 3.679);
}

function buildWordIndex(words: Word[]): Map<Word, number> {
  const lookup = new Map<Word, number>();

  for (let i = 0; i < words.length; i++) {
    const word = words[i];

    if (word !== undefined) {
      lookup.set(word, i);
    }
  }

  return lookup;
}

// prune candidate pool to top frequency words + remaining answers, full scan when WebWorker is added
function selectCandidateWords(
  allowedWords: Word[],
  remainingAnswers: Word[],
): Word[] {
  const ranked = Array.from(scoreWordsByFrequency(allowedWords)).sort(
    (a, b) => b[1] - a[1],
  );
  const limit = Math.max(20, Math.floor(remainingAnswers.length / 3));
  const pool = new Set<Word>(remainingAnswers);

  for (let i = 0; i < limit && i < ranked.length; i++) {
    const entry = ranked[i];

    if (entry !== undefined) {
      pool.add(entry[0]);
    }
  }

  return Array.from(pool);
}

function computeGuessEntropy(
  guessIdx: number,
  answerIndices: number[],
  pm: PatternMatrix,
): number {
  const total = answerIndices.length;

  if (total === 0) {
    return 0;
  }

  const patternCounts = new Int32Array(PATTERN_COUNT);

  for (const ansIdx of answerIndices) {
    const pattern = pm.get(guessIdx, ansIdx);
    const current = patternCounts[pattern];

    if (current !== undefined) {
      patternCounts[pattern] = current + 1;
    }
  }

  let entropy = 0;

  for (let p = 0; p < PATTERN_COUNT; p++) {
    const count = patternCounts[p];

    if (count !== undefined && count > 0) {
      const prob = count / total;
      entropy -= prob * Math.log2(prob);
    }
  }

  return entropy;
}

export function pickMostInformativeGuess(
  allowedWords: Word[],
  answerWords: Word[],
  remainingAnswers: Word[],
  pm: PatternMatrix,
): Word | null {
  if (remainingAnswers.length === 0) {
    return null;
  }

  const allowedIndex = buildWordIndex(allowedWords);
  const answerIndex = buildWordIndex(answerWords);
  const answerIndices: number[] = [];

  for (const word of remainingAnswers) {
    const idx = answerIndex.get(word);

    if (idx !== undefined) {
      answerIndices.push(idx);
    }
  }

  const candidates = selectCandidateWords(allowedWords, remainingAnswers);
  let bestWord: Word | null = null;
  let maxEntropy = -1;

  for (const word of candidates) {
    const guessIdx = allowedIndex.get(word);

    if (guessIdx === undefined) {
      continue;
    }

    const entropy = computeGuessEntropy(guessIdx, answerIndices, pm);

    if (entropy > maxEntropy) {
      maxEntropy = entropy;
      bestWord = word;
    }
  }

  return bestWord;
}

export function pickMinExpectedStepsGuess(
  allowedWords: Word[],
  answerWords: Word[],
  remainingAnswers: Word[],
  pm: PatternMatrix,
): Word | null {
  const total = remainingAnswers.length;

  if (total === 0) {
    return null;
  }

  const allowedIndex = buildWordIndex(allowedWords);
  const answerIndex = buildWordIndex(answerWords);
  const answerIndices: number[] = [];

  for (const word of remainingAnswers) {
    const idx = answerIndex.get(word);

    if (idx !== undefined) {
      answerIndices.push(idx);
    }
  }

  const remainingSet = new Set<Word>(remainingAnswers);
  const initialEntropy = Math.log2(total);
  const candidates = selectCandidateWords(allowedWords, remainingAnswers);

  let bestWord: Word | null = null;
  let minScore = Infinity;

  for (const word of candidates) {
    const guessIdx = allowedIndex.get(word);

    if (guessIdx === undefined) {
      continue;
    }

    const infoGain = computeGuessEntropy(guessIdx, answerIndices, pm);
    const infoLeft = Math.max(0, initialEntropy - infoGain);
    const pWin = remainingSet.has(word) ? 1 / total : 0;
    const expectedScore =
      pWin + (1 - pWin) * estimateRemainingSteps(infoLeft);

    if (expectedScore < minScore) {
      minScore = expectedScore;
      bestWord = word;
    }
  }

  return bestWord;
}

export function filterRemainingAnswers(
  allowedWords: Word[],
  answerWords: Word[],
  pm: PatternMatrix,
  guesses: Word[],
  patterns: number[],
): Word[] {
  const allowedIndex = buildWordIndex(allowedWords);
  let candidateIndices: number[] = [];

  for (let j = 0; j < answerWords.length; j++) {
    candidateIndices.push(j);
  }

  for (let step = 0; step < guesses.length; step++) {
    const guessWord = guesses[step];
    const targetPattern = patterns[step];

    if (guessWord === undefined || targetPattern === undefined) {
      continue;
    }

    const guessIdx = allowedIndex.get(guessWord);

    if (guessIdx === undefined) {
      throw new Error(`Unknown guess word: ${guessWord}`);
    }

    candidateIndices = candidateIndices.filter(
      (ansIdx) => pm.get(guessIdx, ansIdx) === targetPattern,
    );
  }

  const remaining: Word[] = [];

  for (const ansIdx of candidateIndices) {
    const word = answerWords[ansIdx];

    if (word !== undefined) {
      remaining.push(word);
    }
  }

  return remaining;
}

export function pickNextGuess(
  allowedWords: Word[],
  answerWords: Word[],
  pm: PatternMatrix,
  guesses: Word[],
  patterns: number[],
  strategy: Strategy = 'expected',
): Word | null {
  const remaining = filterRemainingAnswers(
    allowedWords,
    answerWords,
    pm,
    guesses,
    patterns,
  );

  if (remaining.length === 0) {
    return null;
  }

  if (remaining.length === 1) {
    const only = remaining[0];

    return only !== undefined ? only : null;
  }

  // shortcut: precomputed optimal opener for full dictionary, recompute if dictionary changes
  if (remaining.length === pm.answerCount) {
    const opener = allowedWords.find((word) => word === 'tares');

    if (opener !== undefined) {
      return opener;
    }
  }

  if (strategy === 'fast') {
    return pickByLetterFrequency(remaining);
  }

  if (strategy === 'entropy') {
    return pickMostInformativeGuess(allowedWords, answerWords, remaining, pm);
  }

  return pickMinExpectedStepsGuess(allowedWords, answerWords, remaining, pm);
}
