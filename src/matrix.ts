import { readFileSync } from "node:fs";
import {
  WORD_LEN,
  MISS,
  MISPLACED,
  EXACT,
  CHAR_CODE_OFFSET,
  ALPHABET_SIZE,
  MAX_PATTERN_DIGIT,
  isWord,
  type WordList,
  type WordCodes,
  PATTERN_COUNT,
} from "./types.js";
import { mkdir, open, readFile, stat } from "node:fs/promises";
import { dirname } from "node:path";

const POW3 = new Int32Array(WORD_LEN);
for (let i = 0, p = 1; i < WORD_LEN; i++, p *= 3) POW3[i] = p;

export function readWordList(filePath: string): WordList {
  const txt = readFileSync(filePath, "utf8");
  return txt
    .split(/\r?\n/)
    .map((s) => s.trim().toLowerCase())
    .filter(isWord);
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
  return Array.from({ length: WORD_LEN }, () => {
    const digit = v % 3;
    v = Math.floor(v / 3);
    return digit;
  });
}

export function lettersToCodes(word: string): WordCodes {
  if (word.length !== WORD_LEN) {
    throw new RangeError(`word length must be ${WORD_LEN}`);
  }
  const out = new Uint8Array(WORD_LEN);
  for (let i = 0; i < WORD_LEN; i++) {
    const code = word.charCodeAt(i);
    const c = code - CHAR_CODE_OFFSET;
    if (c < 0 || c >= ALPHABET_SIZE) {
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
    if (guessCodes[i] === answerCodes[i]) {
      pat[i] = EXACT;
      usedMask |= 1 << i;
    }
  }

  for (let i = 0; i < WORD_LEN; i++) {
    if (pat[i] === EXACT) continue;
    const g = guessCodes[i]!;
    for (let j = 0; j < WORD_LEN; j++) {
      if ((usedMask & (1 << j)) !== 0) continue;
      if (answerCodes[j] === g) {
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
    allowedCodes[i] = lettersToCodes(allowed[i]!);
  }

  const answerCodes: WordCodes[] = new Array(cols);
  for (let j = 0; j < cols; j++) {
    answerCodes[j] = lettersToCodes(answers[j]!);
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
          buf[base + c] = getPatternCodeFromCodes(guessCodes, answerCodes[c]!);
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

    this.allowedIndex = new Map();
    this.answerIndex = new Map();

    for (const [i, word] of allowedWords.entries()) {
      this.allowedIndex.set(word, i);
    }
    for (const [j, word] of answerWords.entries()) {
      this.answerIndex.set(word, j);
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
    return this.data[guessIndex * this.cols + answerIndex]!;
  }

  getGuessIndex(word: string): number {
    return this.allowedIndex.get(word) ?? -1;
  }

  getAnswerIndex(word: string): number {
    return this.answerIndex.get(word) ?? -1;
  }

  filterPossibleAnswersByPattern(
    guessIndex: number,
    pattern: number,
    possibleAnswerIndices: readonly number[],
  ): number[] {
    const res: number[] = [];
    const base = guessIndex * this.cols;
    for (const colIdx of possibleAnswerIndices) {
      if (this.data[base + colIdx] === pattern) res.push(colIdx);
    }
    return res;
  }
}
