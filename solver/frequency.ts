import type { Word } from './pattern.ts';

const ASCII_A = 97;

export function scoreWordsByFrequency(words: Word[]): Map<Word, number> {
  const counts = new Uint32Array(26);

  for (const word of words) {
    for (let i = 0; i < word.length; i++) {
      const idx = word.charCodeAt(i) - ASCII_A;
      const current = counts[idx];

      if (current !== undefined) {
        counts[idx] = current + 1;
      }
    }
  }

  const scores = new Map<Word, number>();

  for (const word of words) {
    let seenMask = 0;
    let score = 0;

    for (let i = 0; i < word.length; i++) {
      const idx = word.charCodeAt(i) - ASCII_A;
      const bit = 1 << idx;

      if ((seenMask & bit) === 0) {
        seenMask |= bit;
        const freq = counts[idx];

        if (freq !== undefined) {
          score += freq;
        }
      }
    }

    scores.set(word, score);
  }

  return scores;
}

export function pickByLetterFrequency(words: Word[]): Word | null {
  const scores = scoreWordsByFrequency(words);
  let bestWord: Word | null = null;
  let bestScore = -1;

  for (const [word, score] of scores) {
    if (score > bestScore) {
      bestScore = score;
      bestWord = word;
    }
  }

  return bestWord;
}
