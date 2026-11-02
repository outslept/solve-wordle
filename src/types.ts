import type { Word } from '../solver/pattern.ts';

export const MAX_TURNS = 6;
export const PATTERN_BASE = 3;

export type TileState = 'miss' | 'present' | 'correct';

export const TILE_LABELS: Record<TileState, string> = {
  miss: 'Gray (absent)',
  present: 'Yellow (wrong spot)',
  correct: 'Green (correct spot)',
};

export interface WordsResponse {
  allowedWords: Word[];
  answerWords: Word[];
}

export interface NextGuessResponse {
  nextGuess: Word | null;
  possibleOutputsCount: number;
  timeMs: number;
}

export interface StepRecord {
  word: Word;
  pattern: number;
  remainingCount: number;
  contradiction: boolean;
}

export function getTileState(pattern: number, colIndex: number): TileState {
  const divisor = PATTERN_BASE ** colIndex;
  const digit = Math.floor(pattern / divisor) % PATTERN_BASE;

  if (digit === 2) {
    return 'correct';
  }

  if (digit === 1) {
    return 'present';
  }

  return 'miss';
}

export function cyclePatternTile(pattern: number, colIndex: number): number {
  const divisor = PATTERN_BASE ** colIndex;
  const digit = Math.floor(pattern / divisor) % PATTERN_BASE;
  const nextDigit = (digit + 1) % PATTERN_BASE;

  return pattern + (nextDigit - digit) * divisor;
}
