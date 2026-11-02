import { stat } from 'node:fs/promises';
import { join } from 'node:path';
import { generatePatternMatrix } from './solver/matrix.js';

const dataDir = join(import.meta.dirname, 'data');
const allowedFile = join(dataDir, 'allowed_words.txt');
const answersFile = join(dataDir, 'possible_words.txt');
const outFile = join(dataDir, 'pattern_allowed_answers.bin');

const start = performance.now();
console.log('Generating pattern matrix...');

await generatePatternMatrix(allowedFile, answersFile, outFile);

const { size } = await stat(outFile);
const seconds = ((performance.now() - start) / 1000).toFixed(2);
const megabytes = (size / 1024 ** 2).toFixed(2);

console.log(`Done in ${seconds}s: ${outFile} (${megabytes} MB)`);
