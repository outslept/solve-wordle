import type { VercelRequest, VercelResponse } from '@vercel/node'
import { ensureReady, pm, allowedWords, answerWords } from './_shared.js'
import {
  getPatternCode,
  pickLetterFrequencyGuess,
  pickMostInformativeGuess,
  pickMinExpectedStepsGuess,
} from '../src/index.js'

type Method = 'fast' | 'entropy' | 'expected'
type Options = { cutoffFraction?: number; minCandidates?: number; maxCandidates?: number }

export default async function handler (req: VercelRequest, res: VercelResponse) {
  await ensureReady()

  const body = (typeof req.body === 'string' ? JSON.parse(req.body) : req.body)

  const guesses = body.guesses || []
  const patterns = body.patterns || []
  const method: Method = body.method || 'fast'
  const options: Options | undefined = body.options

  let possible: number[] = answerWords.map((_, i) => i)

  if (pm) {
    for (let i = 0; i < guesses.length; i++) {
      const gi = pm.getGuessIndex(guesses[i]!.toLowerCase())
      if (gi >= 0) {
        possible = pm.filterPossibleAnswersByPattern(gi, patterns[i]!, possible)
      } else {
        possible = possible.filter((ai) => {
          const aw = answerWords[ai]!
          return getPatternCode(guesses[i]!, aw) === patterns[i]!
        })
      }
    }
  } else {
    for (let i = 0; i < guesses.length; i++) {
      possible = possible.filter((ai) => {
        const aw = answerWords[ai]!
        return getPatternCode(guesses[i]!, aw) === patterns[i]!
      })
    }
  }

  if (possible.length === 0) {
    res.status(200).json({ error: 'no possibilities left (check patterns/guesses)', possibleCount: 0, sample: [] })
    return
  }

  if (possible.length === 1) {
    const answer = answerWords[possible[0]!]!
    res.status(200).json({ nextGuess: answer, possibleCount: 1, sample: [answer] })
    return
  }

  let nextGuess = ''

  if (method === 'fast') {
    if (pm) {
      nextGuess = pickLetterFrequencyGuess(pm, possible)
    } else {
      const freq = new Map<string, number>()
      for (const ai of possible) {
        const w = answerWords[ai]!
        for (const ch of w) freq.set(ch, (freq.get(ch) ?? 0) + 1)
      }
      let best = allowedWords[0]!
      let bestScore = -1
      for (const w of allowedWords) {
        const seen = new Set<string>()
        let s = 0
        for (const ch of w) {
          if (!seen.has(ch)) {
            s += freq.get(ch) ?? 0
            seen.add(ch)
          }
        }
        if (s > bestScore) {
          bestScore = s
          best = w
        }
      }
      nextGuess = best
    }
  } else {
    if (!pm) {
      res.status(400).json({ error: 'method requires precomputed pattern matrix. Generate data/pattern_allowed_answers.bin first.' })
      return
    }
    const priors = new Map<string, number>()
    for (const w of answerWords) priors.set(w, 1)
    nextGuess =
      method === 'entropy'
        ? pickMostInformativeGuess(pm, possible, priors, options)
        : pickMinExpectedStepsGuess(pm, possible, priors, options)
  }

  const sample = possible.slice(0, 20).map((i) => answerWords[i]!)
  res.status(200).json({ nextGuess, possibleCount: possible.length, sample })
}
