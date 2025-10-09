// api/_shared.ts
import { join } from 'node:path'
import { existsSync } from 'node:fs'
import {
  PatternMatrix,
  readWordList,
} from '../src/index.js'
import type { WordList } from '../src/types.js'

export let pm: PatternMatrix | null = null
export let allowedWords: WordList = []
export let answerWords: WordList = []

let initialized = false

export async function ensureReady (): Promise<void> {
  if (initialized && pm && allowedWords.length && answerWords.length) return

  const g = globalThis as unknown as Record<string, any>
  if (g.__wordleCache) {
    pm = g.__wordleCache.pm
    allowedWords = g.__wordleCache.allowedWords
    answerWords = g.__wordleCache.answerWords
    initialized = true
    return
  }

  const dataDir = join(process.cwd(), 'data')
  const ALLOWED_FILE = join(dataDir, 'allowed_words.txt')
  const ANSWERS_FILE = join(dataDir, 'possible_words.txt')
  const PATTERN_BIN = join(dataDir, 'pattern_allowed_answers.bin')

  allowedWords = readWordList(ALLOWED_FILE)
  answerWords = readWordList(ANSWERS_FILE)

  if (existsSync(PATTERN_BIN)) {
    try {
      pm = await PatternMatrix.loadFromBin(PATTERN_BIN, ALLOWED_FILE, ANSWERS_FILE)
    } catch {
      pm = null
    }
  } else {
    pm = null
  }

  g.__wordleCache = { pm, allowedWords, answerWords }
  initialized = true
}
