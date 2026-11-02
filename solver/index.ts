export {
  WORD_LEN,
  PATTERN_COUNT,
  isWord,
  getPatternCode,
} from './pattern.ts';
export type { Strategy, Word } from './pattern.ts';

export {
  scoreWordsByFrequency,
  pickByLetterFrequency,
} from './frequency.ts';

export {
  parseWords,
  generatePatternMatrix,
  PatternMatrix,
} from './matrix.ts';

export {
  pickMostInformativeGuess,
  pickMinExpectedStepsGuess,
  filterRemainingAnswers,
  pickNextGuess,
} from './solver.ts';
