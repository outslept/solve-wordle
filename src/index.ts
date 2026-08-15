import { readFileSync } from "node:fs";
import { mkdir, open, readFile, stat } from "node:fs/promises";
import { dirname } from "node:path";
import {
  WORD_LEN,
  PATTERN_COUNT,
  MISS,
  MISPLACED,
  EXACT,
  isWord,
  assertDefined,
  type WordList,
  type WordCodes,
  CHAR_CODE_OFFSET,
  ALPHABET_SIZE,
  MAX_PATTERN_DIGIT,
} from "./types.js";

const POW3 = new Int32Array(WORD_LEN);
for (let i = 0, p = 1; i < WORD_LEN; i++, p *= 3) POW3[i] = p;

export function readWordList(filePath: string): WordList {
  const txt = readFileSync(filePath, "utf8");
  const arr = txt
    .split(/\r?\n/)
    .map((s) => s.trim().toLowerCase())
    .filter(isWord);
  return arr;
}

export function patternArrayToInt(arr: readonly number[]): number {
  if (arr.length !== WORD_LEN) {
    throw new RangeError(`pattern array must have length ${WORD_LEN}`);
  }
  let v = 0;
  for (let i = 0; i < WORD_LEN; i++) {
    const d = arr[i];
    if (d === undefined || !Number.isInteger(d) || d < 0 || d > MAX_PATTERN_DIGIT) {
      throw new RangeError("pattern digits must be integers 0..2");
    }
    v += d * POW3[i]!;
  }
  return v;
}

export function patternIntToArray(v: number): number[] {
  if (!Number.isInteger(v) || v < 0 || v >= PATTERN_COUNT) {
    throw new RangeError("pattern int out of range");
  }
  const res = new Array<number>(WORD_LEN);
  for (let i = 0; i < WORD_LEN; i++) {
    res[i] = v % 3;
    v = Math.floor(v / 3);
  }
  return res;
}

export function lettersToCodes(word: string): WordCodes {
  if (word.length !== WORD_LEN) {
    throw new RangeError(`word length must be ${WORD_LEN}`);
  }
  const out = new Uint8Array(WORD_LEN);
  for (let i = 0; i < WORD_LEN; i++) {
    const code = word.charCodeAt(i);
    const c = code - CHAR_CODE_OFFSET;
    if (c < 0 || c >= ALPHABET_SIZE || !Number.isInteger(c)) {
      throw new TypeError("invalid character in word");
    }
    out[i] = c;
  }
  return out;
}

export function getPatternCodeFromCodes(guessCodes: WordCodes, answerCodes: WordCodes): number {
  if (guessCodes.length !== WORD_LEN || answerCodes.length !== WORD_LEN) {
    throw new RangeError("word codes must have length " + WORD_LEN);
  }
  const pat = Array(WORD_LEN).fill(MISS);
  let usedMask = 0;

  for (let i = 0; i < WORD_LEN; i++) {
    const gc = guessCodes[i]!;
    const ac = answerCodes[i]!;
    if (gc === ac) {
      pat[i] = EXACT;
      usedMask |= 1 << i;
    }
  }

  for (let i = 0; i < WORD_LEN; i++) {
    if (pat[i] === EXACT) continue;
    const g = guessCodes[i]!;
    for (let j = 0; j < WORD_LEN; j++) {
      if ((usedMask & (1 << j)) !== 0) continue;
      const a = answerCodes[j]!;
      if (a === g) {
        pat[i] = MISPLACED;
        usedMask |= 1 << j;
        break;
      }
    }
    if (pat[i] !== MISPLACED) pat[i] = MISS;
  }

  let v = 0;
  for (let i = 0; i < WORD_LEN; i++) v += pat[i]! * POW3[i]!;
  return v;
}

export function getPatternCode(guess: string, answer: string): number {
  return getPatternCodeFromCodes(
    lettersToCodes(guess.toLowerCase()),
    lettersToCodes(answer.toLowerCase()),
  );
}

/* Precompute and persist the matrix (allowed x answers => pattern) */

export async function generatePatternMatrixBin(
  allowedFile: string,
  answersFile: string,
  outBin: string,
  chunkSize = 1200,
): Promise<void> {
  const allowed = readWordList(allowedFile);
  const answers = readWordList(answersFile);
  const rows = allowed.length;
  const cols = answers.length;
  if (rows === 0 || cols === 0) throw new Error("empty word lists");

  const allowedCodes: WordCodes[] = new Array(rows);
  for (let i = 0; i < rows; i++) {
    const w = allowed[i];
    assertDefined(w, `allowed[${i}]`);
    allowedCodes[i] = lettersToCodes(w);
  }

  const answersCodes: WordCodes[] = new Array(cols);
  for (let j = 0; j < cols; j++) {
    const w = answers[j];
    assertDefined(w, `answers[${j}]`);
    answersCodes[j] = lettersToCodes(w);
  }

  await mkdir(dirname(outBin), { recursive: true });
  const fh = await open(outBin, "w");

  const now = (): string => {
    const d = new Date();
    const hh = String(d.getHours()).padStart(2, "0");
    const mm = String(d.getMinutes()).padStart(2, "0");
    const ss = String(d.getSeconds()).padStart(2, "0");
    const ms = String(d.getMilliseconds()).padStart(3, "0");
    return `${hh}:${mm}:${ss}.${ms}`;
  };
  const fmtTime = (ms: number) =>
    ms < 1000 ? `${Math.round(ms)}ms` : `${(ms / 1000).toFixed(2)}s`;

  console.log(`[${now()}] generating... rows=${rows} cols=${cols}`);
  const t0 = process.hrtime.bigint();
  try {
    for (let r0 = 0; r0 < rows; r0 += chunkSize) {
      const r1 = Math.min(rows, r0 + chunkSize);
      const actualRows = r1 - r0;
      const buf = Buffer.allocUnsafe(actualRows * cols);
      for (let ri = 0, r = r0; r < r1; r++, ri++) {
        const guessCodes = allowedCodes[r]!;
        const base = ri * cols;
        for (let c = 0; c < cols; c++) {
          const answerCodes = answersCodes[c]!;
          buf[base + c] = getPatternCodeFromCodes(guessCodes, answerCodes);
        }
      }
      await fh.write(buf);
    }
  } finally {
    await fh.close();
  }

  const durationMs = Number(process.hrtime.bigint() - t0) / 1e6;
  const s = await stat(outBin);
  console.log(
    `[${now()}] done in ${fmtTime(durationMs)}: ${outBin} (rows=${rows} cols=${cols} size=${s.size} B)`,
  );
}

export class PatternMatrix {
  public readonly allowedWords: WordList;
  public readonly answerWords: WordList;
  public readonly rows: number;
  public readonly cols: number;
  public readonly data: Uint8Array;

  private readonly allowedIndex: Map<string, number>;
  private readonly answerIndex: Map<string, number>;

  constructor(allowedWords: WordList, answerWords: WordList, data: Uint8Array) {
    this.allowedWords = allowedWords;
    this.answerWords = answerWords;
    this.rows = allowedWords.length;
    this.cols = answerWords.length;
    if (data.length !== this.rows * this.cols) {
      throw new Error("binary buffer size mismatch");
    }
    this.data = data;

    this.allowedIndex = new Map<string, number>();
    this.answerIndex = new Map<string, number>();

    for (let i = 0; i < this.allowedWords.length; i++) {
      const word = this.allowedWords[i];
      assertDefined(word, `allowedWords[${i}]`);
      this.allowedIndex.set(word, i);
    }
    for (let i = 0; i < this.answerWords.length; i++) {
      const word = this.answerWords[i];
      assertDefined(word, `answerWords[${i}]`);
      this.answerIndex.set(word, i);
    }
  }

  static async loadFromBin(
    binFile: string,
    allowedFile: string,
    answersFile: string,
  ): Promise<PatternMatrix> {
    const allowed = readWordList(allowedFile);
    const answers = readWordList(answersFile);
    const buf = await readFile(binFile);
    return new PatternMatrix(allowed, answers, buf);
  }

  getPatternByIndices(guessIndex: number, answerIndex: number): number {
    const idx = guessIndex * this.cols + answerIndex;
    return this.data[idx]!;
  }

  getGuessIndex(word: string): number {
    return this.allowedIndex.get(word) ?? -1;
  }

  getAnswerIndex(word: string): number {
    return this.answerIndex.get(word) ?? -1;
  }

  /* Apply a (guess, pattern) to shrink possibilities */
  filterPossibleAnswersByPattern(
    guessIndex: number,
    pattern: number,
    possibleAnswerIndices: readonly number[],
  ): number[] {
    const res: number[] = [];
    const base = guessIndex * this.cols;
    for (let k = 0; k < possibleAnswerIndices.length; k++) {
      const colIdx = possibleAnswerIndices[k]!;
      if (this.data[base + colIdx]! === pattern) res.push(colIdx);
    }
    return res;
  }
}

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
  for (let i = 0; i < dist.length; i++) {
    const p = dist[i]!;
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
    const w = pm.allowedWords[i]!;
    map[i] = pm.getAnswerIndex(w);
  }
  allowedToAnswerCache.set(pm, map);
  return map;
}

function computeLetterFrequencies(
  pm: PatternMatrix,
  possibleAnswerIndices: readonly number[],
): Int32Array {
  const freq = new Int32Array(ALPHABET_SIZE);
  for (let k = 0; k < possibleAnswerIndices.length; k++) {
    const ai = possibleAnswerIndices[k]!;
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
  const freq = new Map<string, number>();
  for (let k = 0; k < possibleAnswerIndices.length; k++) {
    const idx = possibleAnswerIndices[k]!;
    const w = pm.answerWords[idx]!;
    for (const ch of w) freq.set(ch, (freq.get(ch) ?? 0) + 1);
  }
  let best = pm.allowedWords[0]!;
  let bestScore = -1;
  for (let i = 0; i < pm.rows; i++) {
    const w = pm.allowedWords[i]!;
    const seen = new Set<string>();
    let s = 0;
    for (const ch of w) {
      if (!seen.has(ch)) {
        s += freq.get(ch) ?? 0;
        seen.add(ch);
      }
    }
    if (s > bestScore) {
      bestScore = s;
      best = w;
    }
  }
  return best;
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
    Math.min(maxCandidates, Math.floor(pm.rows * cutoffFraction)),
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

  for (let ci = 0; ci < candidateIndices.length; ci++) {
    const guessIndex = candidateIndices[ci]!;
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

  for (let ci = 0; ci < candidateIndices.length; ci++) {
    const guessIndex = candidateIndices[ci]!;
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
