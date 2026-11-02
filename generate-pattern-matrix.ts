import fs from 'node:fs';
import path from 'node:path';
import { generatePatternMatrix, parseWords } from './solver/index.ts';

const dataDir = path.resolve('data');
const allowedWords = parseWords(
  fs.readFileSync(path.join(dataDir, 'allowed_words.txt'), 'utf-8'),
);
const answerWords = parseWords(
  fs.readFileSync(path.join(dataDir, 'possible_words.txt'), 'utf-8'),
);

const matrix = generatePatternMatrix(allowedWords, answerWords);
const outPath = path.join(dataDir, 'pattern_allowed_answers.bin');

fs.writeFileSync(outPath, matrix);
console.log(
  `Saved ${matrix.byteLength} bytes (${allowedWords.length}x${answerWords.length}) to ${outPath}`,
);
