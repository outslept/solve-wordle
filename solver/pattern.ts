export const WORD_LEN = 5;
export const PATTERN_COUNT = 3 ** WORD_LEN;

export type Strategy = 'fast' | 'entropy' | 'expected';
export type Word = string & { readonly __brand: 'word' };

const MISPLACED = 1;
const EXACT = 2;

export function isWord(value: string): value is Word {
  return /^[a-z]{5}$/.test(value);
}

export function getPatternCode(guess: string, answer: string): number {
  if (guess.length !== WORD_LEN || answer.length !== WORD_LEN) {
    throw new RangeError(`words must have length ${WORD_LEN}`);
  }

  let usedMask = 0;
  let exactMask = 0;
  let code = 0;

  // mark exact matches first so duplicate letters in the guess cannot claim them as misplaced
  for (let i = 0, power = 1; i < WORD_LEN; i++, power *= 3) {
    if (guess.charCodeAt(i) === answer.charCodeAt(i)) {
      const bit = 1 << i;
      usedMask |= bit;
      exactMask |= bit;
      code += EXACT * power;
    }
  }

  // consume remaining answer letters left-to-right so excess duplicate letters stay 0 (miss)
  for (let i = 0, power = 1; i < WORD_LEN; i++, power *= 3) {
    if ((exactMask & (1 << i)) !== 0) continue;
    const ch = guess.charCodeAt(i);

    for (let j = 0; j < WORD_LEN; j++) {
      const bit = 1 << j;
      if ((usedMask & bit) === 0 && answer.charCodeAt(j) === ch) {
        usedMask |= bit;
        code += MISPLACED * power;
        break;
      }
    }
  }

  return code;
}
