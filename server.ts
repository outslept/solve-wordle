import { Hono } from "hono";
import { serve } from "@hono/node-server";
import { serveStatic } from "@hono/node-server/serve-static";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import {
  PatternMatrix,
  readWordList,
  pickLetterFrequencyGuess,
  pickMostInformativeGuess,
  pickMinExpectedStepsGuess,
} from "./src/index.js";
import type { WordList } from "./src/types.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, "data");
const ALLOWED_FILE = join(DATA_DIR, "allowed_words.txt");
const ANSWERS_FILE = join(DATA_DIR, "possible_words.txt");
const PATTERN_BIN = join(DATA_DIR, "pattern_allowed_answers.bin");
const PUBLIC_ROOT = join(__dirname, "public");

let pm!: PatternMatrix;
let allowedWords!: WordList;
let answerWords!: WordList;

await (async function init() {
  allowedWords = readWordList(ALLOWED_FILE);
  answerWords = readWordList(ANSWERS_FILE);
  pm = await PatternMatrix.loadFromBin(PATTERN_BIN, ALLOWED_FILE, ANSWERS_FILE);
})();

const app = new Hono();

app.get("/api/words", (c) =>
  c.json({ allowed: allowedWords, answers: answerWords, hasMatrix: true }),
);

app.post("/api/next-guess", async (c) => {
  const { guesses, patterns, method } = await c.req.json<{
    guesses: string[];
    patterns: number[];
    method: "fast" | "entropy" | "expected";
  }>();

  let possible: number[] = answerWords.map((_, i) => i);
  for (let i = 0; i < guesses.length; i++) {
    const gi = pm.getGuessIndex(guesses[i]!.toLowerCase());
    possible = pm.filterPossibleAnswersByPattern(gi, patterns[i]!, possible);
  }

  if (possible.length === 1) {
    const answer = answerWords[possible[0]!]!;
    return c.json({ nextGuess: answer, possibleCount: 1, sample: [answer] });
  }

  const priors = new Map<string, number>();
  for (const w of answerWords) priors.set(w, 1);

  const nextGuess =
    method === "fast"
      ? pickLetterFrequencyGuess(pm, possible)
      : method === "entropy"
        ? pickMostInformativeGuess(pm, possible, priors)
        : pickMinExpectedStepsGuess(pm, possible, priors);

  const sample = possible.slice(0, 20).map((i) => answerWords[i]!);
  return c.json({ nextGuess, possibleCount: possible.length, sample });
});

app.get("/", serveStatic({ path: join(PUBLIC_ROOT, "index.html") }));
app.use("/*", serveStatic({ root: PUBLIC_ROOT }));

const PORT = Number(process.env.PORT || 3000);
serve({ fetch: app.fetch, port: PORT });
