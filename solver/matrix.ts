import { readFileSync } from 'node:fs';
import { mkdir, open, readFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { getPatternCode, isWord, type Word } from './pattern.ts';

export function readWords(filePath: string): readonly Word[] {
  return readFileSync(filePath, 'utf8')
    .split(/\r?\n/)
    .map((line) => line.trim().toLowerCase())
    .filter(isWord);
}

export async function generatePatternMatrix(
  allowedFile: string,
  answersFile: string,
  outFile: string,
  chunkSize = 1200,
): Promise<void> {
  const allowed = readWords(allowedFile);
  const answers = readWords(answersFile);
  const rows = allowed.length;
  const cols = answers.length;

  if (rows === 0 || cols === 0) {
    throw new Error('empty word lists');
  }

  await mkdir(dirname(outFile), { recursive: true });
  const fh = await open(outFile, 'w');

  try {
    for (let r0 = 0; r0 < rows; r0 += chunkSize) {
      const r1 = Math.min(rows, r0 + chunkSize);
      const buf = Buffer.allocUnsafe((r1 - r0) * cols);

      for (let r = r0; r < r1; r++) {
        const guess = allowed[r] ?? '';
        const rowOffset = (r - r0) * cols;
        for (let c = 0; c < cols; c++) {
          buf[rowOffset + c] = getPatternCode(guess, answers[c] ?? '');
        }
      }
      await fh.write(buf);
    }
  } finally {
    await fh.close();
  }
}

export class PatternMatrix {
  public readonly allowedWords: readonly Word[];
  public readonly answerWords: readonly Word[];
  public readonly rows: number;
  public readonly cols: number;

  private readonly data: Uint8Array;
  private readonly allowedIndex = new Map<string, number>();

  constructor(allowedWords: readonly Word[], answerWords: readonly Word[], data: Uint8Array) {
    this.allowedWords = allowedWords;
    this.answerWords = answerWords;
    this.rows = allowedWords.length;
    this.cols = answerWords.length;

    if (data.length !== this.rows * this.cols) {
      throw new Error('binary buffer size mismatch');
    }
    this.data = data;

    for (const [i, word] of allowedWords.entries()) {
      this.allowedIndex.set(word, i);
    }
  }

  static async load(
    binFile: string,
    allowedFile: string,
    answersFile: string,
  ): Promise<PatternMatrix> {
    const allowed = readWords(allowedFile);
    const answers = readWords(answersFile);
    const buf = await readFile(binFile);
    return new PatternMatrix(allowed, answers, buf);
  }

  getGuessIndex(word: string): number {
    return this.allowedIndex.get(word) ?? -1;
  }

  getPattern(guessIndex: number, answerIndex: number): number {
    return this.data[guessIndex * this.cols + answerIndex] ?? 0;
  }

  filterAnswers(guessIndex: number, pattern: number, remainingAnswers: readonly number[]): number[] {
    const rowOffset = guessIndex * this.cols;
    return remainingAnswers.filter((col) => this.data[rowOffset + col] === pattern);
  }
}
