import { WORD_LEN } from "./pattern.ts";

const ALPHABET_SIZE = 26;
const CHAR_CODE_A = 97;

export function scoreWordsByFrequency(
  allowedWords: readonly string[],
  answerWords: readonly string[],
  remainingAnswers: readonly number[],
): Int32Array {
  const counts = new Int32Array(ALPHABET_SIZE);
  for (const answerIdx of remainingAnswers) {
    const word = answerWords[answerIdx] ?? "";
    for (let i = 0; i < WORD_LEN; i++) {
      const c = word.charCodeAt(i) - CHAR_CODE_A;
      counts[c] = (counts[c] ?? 0) + 1;
    }
  }

  const scores = new Int32Array(allowedWords.length);
  for (let i = 0; i < allowedWords.length; i++) {
    const word = allowedWords[i] ?? "";
    let seenMask = 0;
    let score = 0;

    for (let j = 0; j < WORD_LEN; j++) {
      const c = word.charCodeAt(j) - CHAR_CODE_A;
      const bit = 1 << c;
      // count each unique letter once so repeated letters do not inflate coverage
      if ((seenMask & bit) === 0) {
        seenMask |= bit;
        score += counts[c] ?? 0;
      }
    }
    scores[i] = score;
  }

  return scores;
}

export function pickByLetterFrequency(
  allowedWords: readonly string[],
  answerWords: readonly string[],
  remainingAnswers: readonly number[],
): string {
  const scores = scoreWordsByFrequency(allowedWords, answerWords, remainingAnswers);
  let bestWord = allowedWords[0] ?? "";
  let bestScore = -1;

  for (let i = 0; i < allowedWords.length; i++) {
    const score = scores[i] ?? -1;
    if (score > bestScore) {
      bestScore = score;
      bestWord = allowedWords[i] ?? bestWord;
    }
  }

  return bestWord;
}
