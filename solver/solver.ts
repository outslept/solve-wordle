import { PATTERN_COUNT, getPatternCode, type Strategy } from './pattern.ts';
import { PatternMatrix } from './matrix.ts';
import { pickByLetterFrequency, scoreWordsByFrequency } from './frequency.ts';

const FIRST_GUESS = 'tares';
const CUTOFF_FRACTION = 1 / 3;
const MIN_CANDIDATES = 20;

function estimateRemainingSteps(remainingEntropy: number): number {
  return Math.log(remainingEntropy * 3.87 + 3.679);
}

// prunes by letter coverage instead of corpus word frequencies, upgrade if word frequency data is added
function selectCandidates(pm: PatternMatrix, remainingAnswers: readonly number[]): number[] {
  const scores = scoreWordsByFrequency(pm.allowedWords, pm.answerWords, remainingAnswers);

  const allAllowed = Array.from({ length: pm.rows }, (_, i) => i);
  allAllowed.sort((a, b) => (scores[b] ?? 0) - (scores[a] ?? 0));

  const limit = Math.max(MIN_CANDIDATES, Math.floor(remainingAnswers.length * CUTOFF_FRACTION));
  const candidates = new Set<number>(allAllowed.slice(0, limit));

  // always include remaining answers so the solver can weigh immediate wins against pure probes
  for (const ansIdx of remainingAnswers) {
    const guessIdx = pm.getGuessIndex(pm.answerWords[ansIdx] ?? '');
    if (guessIdx >= 0) candidates.add(guessIdx);
  }

  return [...candidates];
}

function computePatternEntropy(
  pm: PatternMatrix,
  guessIndex: number,
  remainingAnswers: readonly number[],
  buckets: Int32Array,
): number {
  buckets.fill(0);
  const total = remainingAnswers.length;

  for (const answerIndex of remainingAnswers) {
    const pattern = pm.getPattern(guessIndex, answerIndex);
    buckets[pattern] = (buckets[pattern] ?? 0) + 1;
  }

  let entropy = 0;
  for (const count of buckets) {
    if (count > 0) {
      const p = count / total;
      entropy -= p * Math.log2(p);
    }
  }
  return entropy;
}

export function pickMostInformativeGuess(
  pm: PatternMatrix,
  remainingAnswers: readonly number[],
): string {
  if (pm.rows === 0 || remainingAnswers.length === 0) {
    throw new Error('no candidates');
  }
  if (remainingAnswers.length === pm.cols && pm.getGuessIndex(FIRST_GUESS) >= 0) {
    return FIRST_GUESS;
  }

  const candidates = selectCandidates(pm, remainingAnswers);
  const buckets = new Int32Array(PATTERN_COUNT);

  let bestIndex = candidates[0] ?? 0;
  let bestEntropy = -Infinity;

  for (const guessIndex of candidates) {
    const entropy = computePatternEntropy(pm, guessIndex, remainingAnswers, buckets);
    if (entropy > bestEntropy) {
      bestEntropy = entropy;
      bestIndex = guessIndex;
    }
  }

  return pm.allowedWords[bestIndex] ?? '';
}

export function pickMinExpectedStepsGuess(
  pm: PatternMatrix,
  remainingAnswers: readonly number[],
): string {
  if (pm.rows === 0 || remainingAnswers.length === 0) {
    throw new Error('no candidates');
  }
  if (remainingAnswers.length === pm.cols && pm.getGuessIndex(FIRST_GUESS) >= 0) {
    return FIRST_GUESS;
  }

  const total = remainingAnswers.length;
  const initialEntropy = Math.log2(total);
  const winProb = 1 / total;

  const remainingGuessIndices = new Set<number>();
  for (const ansIdx of remainingAnswers) {
    const guessIdx = pm.getGuessIndex(pm.answerWords[ansIdx] ?? '');
    if (guessIdx >= 0) remainingGuessIndices.add(guessIdx);
  }

  const candidates = selectCandidates(pm, remainingAnswers);
  const buckets = new Int32Array(PATTERN_COUNT);

  let bestIndex = candidates[0] ?? 0;
  let bestScore = Infinity;

  for (const guessIndex of candidates) {
    const infoGain = computePatternEntropy(pm, guessIndex, remainingAnswers, buckets);
    const infoLeft = Math.max(0, initialEntropy - infoGain);
    // only words still in the answer pool can win on this turn; pure probes have pWin = 0
    const pWin = remainingGuessIndices.has(guessIndex) ? winProb : 0;
    const expectedSteps = pWin + (1 - pWin) * estimateRemainingSteps(infoLeft);

    if (expectedSteps < bestScore) {
      bestScore = expectedSteps;
      bestIndex = guessIndex;
    }
  }

  return pm.allowedWords[bestIndex] ?? '';
}

export function filterRemainingAnswers(
  answerWords: readonly string[],
  guesses: readonly string[],
  patterns: readonly number[],
  pm: PatternMatrix | null,
): number[] {
  let remaining = answerWords.map((_, i) => i);

  for (let i = 0; i < guesses.length; i++) {
    const guess = (guesses[i] ?? '').toLowerCase();
    const pattern = patterns[i] ?? 0;
    const guessIndex = pm ? pm.getGuessIndex(guess) : -1;

    remaining =
      pm && guessIndex >= 0
        ? pm.filterAnswers(guessIndex, pattern, remaining)
        : remaining.filter((ai) => getPatternCode(guess, answerWords[ai] ?? '') === pattern);
  }

  return remaining;
}

export function pickNextGuess(
  allowedWords: readonly string[],
  answerWords: readonly string[],
  remainingAnswers: readonly number[],
  strategy: Strategy,
  pm: PatternMatrix | null,
): string {
  if (remainingAnswers.length === 1) {
    return answerWords[remainingAnswers[0] ?? 0] ?? '';
  }

  if (strategy === 'fast') {
    return pickByLetterFrequency(allowedWords, answerWords, remainingAnswers);
  }

  if (!pm) {
    throw new Error('strategy requires precomputed pattern matrix');
  }

  return strategy === 'entropy'
    ? pickMostInformativeGuess(pm, remainingAnswers)
    : pickMinExpectedStepsGuess(pm, remainingAnswers);
}
