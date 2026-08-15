import { join } from "node:path";
import { existsSync } from "node:fs";
import { PatternMatrix, readWordList } from "../src/index.js";
import type { WordList } from "../src/types.js";

interface Cache {
  pm: PatternMatrix | null;
  allowedWords: WordList;
  answerWords: WordList;
}

let cache: Cache | null = null;
let loading: Promise<Cache> | null = null;

async function load(): Promise<Cache> {
  const dataDir = join(process.cwd(), "data");
  const allowedFile = join(dataDir, "allowed_words.txt");
  const answersFile = join(dataDir, "possible_words.txt");
  const patternBin = join(dataDir, "pattern_allowed_answers.bin");

  const allowedWords = readWordList(allowedFile);
  const answerWords = readWordList(answersFile);

  let pm: PatternMatrix | null = null;
  if (existsSync(patternBin)) {
    try {
      pm = await PatternMatrix.loadFromBin(patternBin, allowedFile, answersFile);
    } catch {
      pm = null;
    }
  }

  return { pm, allowedWords, answerWords };
}

export async function ensureReady(): Promise<Cache> {
  if (!cache) {
    if (!loading) loading = load();
    cache = await loading;
  }
  return cache;
}
