import type { VercelRequest, VercelResponse } from "@vercel/node";
import { ensureReady } from "./_shared.js";
import {
  getPatternCode,
  pickMostInformativeGuess,
  pickMinExpectedStepsGuess,
} from "../src/index.js";
import { pickByLetterFrequency } from "../src/frequency.js";

type Method = "fast" | "entropy" | "expected";
type Options = { cutoffFraction?: number; minCandidates?: number; maxCandidates?: number };

function applyPattern(
  possible: number[],
  guess: string,
  pattern: number,
  answerWords: readonly string[],
): number[] {
  return possible.filter((ai) => {
    const aw = answerWords[ai]!;
    return getPatternCode(guess, aw) === pattern;
  });
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { pm, allowedWords, answerWords } = await ensureReady();

  const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;

  const guesses = body.guesses || [];
  const patterns = body.patterns || [];
  const method: Method = body.method || "fast";
  const options: Options | undefined = body.options;

  let possible: number[] = answerWords.map((_, i) => i);

  if (pm) {
    for (let i = 0; i < guesses.length; i++) {
      const gi = pm.getGuessIndex(guesses[i]!.toLowerCase());
      possible = gi >= 0
        ? pm.filterPossibleAnswersByPattern(gi, patterns[i]!, possible)
        : applyPattern(possible, guesses[i]!, patterns[i]!, answerWords);
    }
  } else {
    for (let i = 0; i < guesses.length; i++) {
      possible = applyPattern(possible, guesses[i]!, patterns[i]!, answerWords);
    }
  }

  if (possible.length === 0) {
    res.status(200).json({
      error: "no possibilities left (check patterns/guesses)",
      possibleCount: 0,
      sample: [],
    });
    return;
  }

  if (possible.length === 1) {
    const answer = answerWords[possible[0]!]!;
    res.status(200).json({ nextGuess: answer, possibleCount: 1, sample: [answer] });
    return;
  }

  let nextGuess = "";

  if (method === "fast") {
    nextGuess = pickByLetterFrequency(allowedWords, answerWords, possible);
  } else {
    if (!pm) {
      res.status(400).json({
        error:
          "method requires precomputed pattern matrix. Generate data/pattern_allowed_answers.bin first.",
      });
      return;
    }
    const priors = new Map<string, number>();
    for (const w of answerWords) priors.set(w, 1);
    nextGuess =
      method === "entropy"
        ? pickMostInformativeGuess(pm, possible, priors, options)
        : pickMinExpectedStepsGuess(pm, possible, priors, options);
  }

  const sample = possible.slice(0, 20).map((i) => answerWords[i]!);
  res.status(200).json({ nextGuess, possibleCount: possible.length, sample });
}
