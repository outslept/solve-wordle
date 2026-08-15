export const WORD_LEN = 5;
export const MISS = 0;
export const MISPLACED = 1;
export const EXACT = 2;
export const PATTERN_COUNT = 3 ** WORD_LEN;

export const ALPHABET_SIZE = 26;
export const CHAR_CODE_OFFSET = 97;
export const MAX_PATTERN_DIGIT = 2;

type Word = string & { readonly __brand: "word" };

export type WordList = readonly Word[];
export type WordCodes = Uint8Array;

export function isWord(value: unknown): value is Word {
  return typeof value === "string" && /^[a-z]{5}$/.test(value);
}
