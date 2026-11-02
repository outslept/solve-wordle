import { getPatternCode, isWord } from './pattern.ts';
import type { Word } from './pattern.ts';

export function parseWords(raw: string): Word[] {
  return raw.toLowerCase().split(/\r?\n/).filter(isWord);
}

export function generatePatternMatrix(
  allowedWords: Word[],
  answerWords: Word[],
): Uint8Array {
  const guessCount = allowedWords.length;
  const answerCount = answerWords.length;
  const matrix = new Uint8Array(guessCount * answerCount);

  for (let i = 0; i < guessCount; i++) {
    const guess = allowedWords[i];

    if (guess === undefined) {
      continue;
    }

    const offset = i * answerCount;

    for (let j = 0; j < answerCount; j++) {
      const answer = answerWords[j];

      if (answer === undefined) {
        continue;
      }

      matrix[offset + j] = getPatternCode(guess, answer);
    }
  }

  return matrix;
}

export class PatternMatrix {
  readonly data: Uint8Array;
  readonly guessCount: number;
  readonly answerCount: number;

  constructor(allowedWords: Word[], answerWords: Word[]) {
    this.data = generatePatternMatrix(allowedWords, answerWords);
    this.guessCount = allowedWords.length;
    this.answerCount = answerWords.length;
  }

  get(guessIdx: number, answerIdx: number): number {
    const value = this.data[guessIdx * this.answerCount + answerIdx];

    if (value === undefined) {
      throw new RangeError(
        `Index out of bounds: (${guessIdx}, ${answerIdx})`,
      );
    }

    return value;
  }
}
