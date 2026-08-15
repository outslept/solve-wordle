import {
  WORD_LEN,
  PATTERN_COUNT,
  ALPHABET_SIZE,
  CHAR_CODE_OFFSET,
} from "./types.js";
import { PatternMatrix } from "./matrix.js";
import { pickByLetterFrequency } from "./frequency.js";

export function getWeightsFromPriors(
  pm: PatternMatrix,
  possibleAnswerIndices: readonly number[],
  priorsMap: ReadonlyMap<string, number>,
): Float64Array {
  const w = new Float64Array(possibleAnswerIndices.length);
  let s = 0;
  for (let i = 0; i < possibleAnswerIndices.length; i++) {
    const idx = possibleAnswerIndices[i]!;
    const word = pm.answerWords[idx]!;
    const val = priorsMap.get(word) ?? 0;
    w[i] = val;
    s += val;
  }
  if (s === 0) {
    const u = 1 / possibleAnswerIndices.length;
    for (let i = 0; i < w.length; i++) w[i] = u;
  } else {
    for (let i = 0; i < w.length; i++) w[i]! /= s;
  }
  return w;
}

export function entropyOfDistribution(dist: Float64Array): number {
  let H = 0;
  for (const p of dist) {
    if (p > 0) H -= p * Math.log2(p);
  }
  return H;
}

const allowedToAnswerCache = new WeakMap<PatternMatrix, Int32Array>();

function getAllowedToAnswerIndex(pm: PatternMatrix): Int32Array {
  let map = allowedToAnswerCache.get(pm);
  if (map) return map;
  map = new Int32Array(pm.rows);
  for (let i = 0; i < pm.rows; i++) {
    map[i] = pm.getAnswerIndex(pm.allowedWords[i]!);
  }
  allowedToAnswerCache.set(pm, map);
  return map;
}

function computeLetterFrequencies(
  pm: PatternMatrix,
  possibleAnswerIndices: readonly number[],
): Int32Array {
  const freq = new Int32Array(ALPHABET_SIZE);
  for (const ai of possibleAnswerIndices) {
    const w = pm.answerWords[ai]!;
    for (let i = 0; i < WORD_LEN; i++) {
      const c = w.charCodeAt(i) - CHAR_CODE_OFFSET;
      if (c >>> 0 < ALPHABET_SIZE) freq[c] = freq[c]! + 1;
    }
  }
  return freq;
}

function scoreAllowedByLetterFreqAll(pm: PatternMatrix, letterFreq: Int32Array): Float64Array {
  const scores = new Float64Array(pm.rows);
  for (let i = 0; i < pm.rows; i++) {
    const w = pm.allowedWords[i]!;
    let seenMask = 0;
    let s = 0;
    for (let j = 0; j < WORD_LEN; j++) {
      const c = w.charCodeAt(j) - CHAR_CODE_OFFSET;
      if (c >>> 0 < ALPHABET_SIZE) {
        const bit = 1 << c;
        if ((seenMask & bit) === 0) {
          s += letterFreq[c]!;
          seenMask |= bit;
        }
      }
    }
    scores[i] = s;
  }
  return scores;
}

export function entropyToExpectedScore(ent: number): number {
  return Math.log(ent * 3.87 + 3.679);
}

export function pickLetterFrequencyGuess(
  pm: PatternMatrix,
  possibleAnswerIndices: readonly number[],
): string {
  return pickByLetterFrequency(pm.allowedWords, pm.answerWords, possibleAnswerIndices);
}

function buildCandidateIndices(
  pm: PatternMatrix,
  possibleAnswerIndices: readonly number[],
  cutoffFraction: number,
  minCandidates: number,
  maxCandidates: number,
): number[] {
  const letterFreq = computeLetterFrequencies(pm, possibleAnswerIndices);
  const scores = scoreAllowedByLetterFreqAll(pm, letterFreq);

  const sorted = [...possibleAnswerIndices].sort(
    (a, b) => scores[b]! - scores[a]!,
  );

  const targetK = Math.max(
    minCandidates,
    Math.min(maxCandidates, Math.floor(possibleAnswerIndices.length * cutoffFraction)),
  );
  return sorted.slice(0, Math.max(1, targetK));
}

function computePatternDistribution(
  pm: PatternMatrix,
  guessIndex: number,
  possibleAnswerIndices: readonly number[],
  weights: Float64Array,
): Float64Array {
  const dist = new Float64Array(PATTERN_COUNT);
  const base = guessIndex * pm.cols;
  for (let k = 0; k < possibleAnswerIndices.length; k++) {
    const col = possibleAnswerIndices[k]!;
    dist[pm.data[base + col]!]! += weights[k]!;
  }
  return dist;
}

export function pickMostInformativeGuess(
  pm: PatternMatrix,
  possibleAnswerIndices: readonly number[],
  priorsMap: ReadonlyMap<string, number>,
  options?: {
    cutoffFraction?: number;
    minCandidates?: number;
    maxCandidates?: number;
  },
): string {
  if (pm.rows === 0 || possibleAnswerIndices.length === 0) {
    throw new Error("no candidates");
  }

  const cutoffFraction = options?.cutoffFraction ?? 0.34;
  const minCandidates = options?.minCandidates ?? 100;
  const maxCandidates = options?.maxCandidates ?? pm.rows;

  const weights = getWeightsFromPriors(pm, possibleAnswerIndices, priorsMap);

  const candidateIndices = buildCandidateIndices(
    pm,
    possibleAnswerIndices,
    cutoffFraction,
    minCandidates,
    maxCandidates,
  );

  let bestIdx = candidateIndices[0]!;
  let bestEnt = -Infinity;

  for (const guessIndex of candidateIndices) {
    const dist = computePatternDistribution(pm, guessIndex, possibleAnswerIndices, weights);
    const H = entropyOfDistribution(dist);

    if (H > bestEnt) {
      bestEnt = H;
      bestIdx = guessIndex;
    }
  }

  return pm.allowedWords[bestIdx]!;
}

export function pickMinExpectedStepsGuess(
  pm: PatternMatrix,
  possibleAnswerIndices: readonly number[],
  priorsMap: ReadonlyMap<string, number>,
  options?: {
    cutoffFraction?: number;
    minCandidates?: number;
    maxCandidates?: number;
  },
): string {
  if (pm.rows === 0 || possibleAnswerIndices.length === 0) {
    throw new Error("no candidates");
  }

  const cutoffFraction = options?.cutoffFraction ?? 0.34;
  const minCandidates = options?.minCandidates ?? 100;
  const maxCandidates = options?.maxCandidates ?? pm.rows;

  const weights = getWeightsFromPriors(pm, possibleAnswerIndices, priorsMap);

  const H0 = entropyOfDistribution(weights);

  const pAnswer = new Float64Array(pm.cols);
  for (let j = 0; j < possibleAnswerIndices.length; j++) {
    pAnswer[possibleAnswerIndices[j]!] = weights[j]!;
  }

  const allowedToAnswer = getAllowedToAnswerIndex(pm);

  const candidateIndices = buildCandidateIndices(
    pm,
    possibleAnswerIndices,
    cutoffFraction,
    minCandidates,
    maxCandidates,
  );

  let bestIdx = candidateIndices[0]!;
  let bestVal = Number.POSITIVE_INFINITY;

  for (const guessIndex of candidateIndices) {
    const dist = computePatternDistribution(pm, guessIndex, possibleAnswerIndices, weights);
    const eInfo = entropyOfDistribution(dist);

    const infoLeft = H0 > eInfo ? H0 - eInfo : 0;
    const ansIdx = allowedToAnswer[guessIndex]!;
    const prob = ansIdx >= 0 ? pAnswer[ansIdx]! : 0;
    const expected = prob + (1 - prob) * (1 + entropyToExpectedScore(infoLeft));

    if (expected < bestVal) {
      bestVal = expected;
      bestIdx = guessIndex;
    }
  }

  return pm.allowedWords[bestIdx]!;
}
