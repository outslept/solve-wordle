export const WORD_LEN = 5;
export const PATTERN_COUNT = 3 ** WORD_LEN;

export type Strategy = 'fast' | 'entropy' | 'expected';
export type Word = string & { readonly __brand: 'word' };

const WORD_RE = /^[a-z]{5}$/;
const ASCII_A = 97;

export function isWord(value: string): value is Word {
  return WORD_RE.test(value);
}

export function getPatternCode(guess: string, answer: string): number {
  const counts = new Uint8Array(26);

  for (let i = 0; i < WORD_LEN; i++) {
    if (guess.charCodeAt(i) !== answer.charCodeAt(i)) {
      const idx = answer.charCodeAt(i) - ASCII_A;
      counts[idx] = (counts[idx] ?? 0) + 1;
    }
  }

  let code = 0;
  let multiplier = 1;

  for (let i = 0; i < WORD_LEN; i++) {
    const gCode = guess.charCodeAt(i);
    let digit = 0;

    if (gCode === answer.charCodeAt(i)) {
      digit = 2;
    } else {
      const idx = gCode - ASCII_A;
      const available = counts[idx];

      if (available !== undefined && available > 0) {
        digit = 1;
        counts[idx] = available - 1;
      }
    }

    code += digit * multiplier;
    multiplier *= 3;
  }

  return code;
}
