import { existsSync } from "node:fs";
import type { IncomingMessage, ServerResponse } from "node:http";
import { join } from "node:path";
import preact from "@preact/preset-vite";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig, type Plugin } from "vite";
import {
  PatternMatrix,
  filterRemainingAnswers,
  pickNextGuess,
  readWords,
  type Strategy,
} from "./solver/index.ts";

function solverApi(): Plugin {
  const dataDir = join(import.meta.dirname, "data");
  const allowedFile = join(dataDir, "allowed_words.txt");
  const answersFile = join(dataDir, "possible_words.txt");
  const patternBin = join(dataDir, "pattern_allowed_answers.bin");

  const allowedWords = existsSync(allowedFile) ? readWords(allowedFile) : [];
  const answerWords = existsSync(answersFile) ? readWords(answersFile) : [];
  const pmPromise = existsSync(patternBin)
    ? PatternMatrix.load(patternBin, allowedFile, answersFile).catch(() => null)
    : Promise.resolve(null);

  const handler = async (req: IncomingMessage, res: ServerResponse, next: () => void) => {
    if (req.url === "/api/words" && req.method === "GET") {
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ allowedWords, answerWords }));
      return;
    }

    if (req.url === "/api/next-guess" && req.method === "POST") {
      const pm = await pmPromise;
      const chunks: Buffer[] = [];
      for await (const chunk of req) chunks.push(Buffer.from(chunk));

      const body = JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}") as {
        guesses?: string[];
        patterns?: number[];
        strategy?: Strategy;
      };

      const guesses = body.guesses ?? [];
      const patterns = body.patterns ?? [];
      const strategy: Strategy = body.strategy ?? "expected";

      const t0 = performance.now();
      const remaining = filterRemainingAnswers(answerWords, guesses, patterns, pm);

      let nextGuess: string | null = null;
      if (remaining.length > 0) {
        const effectiveStrategy = !pm && strategy !== "fast" ? "fast" : strategy;
        nextGuess = pickNextGuess(allowedWords, answerWords, remaining, effectiveStrategy, pm);
      }
      const timeMs = (performance.now() - t0).toFixed(1);

      res.setHeader("Content-Type", "application/json");
      res.end(
        JSON.stringify({
          nextGuess,
          possibleOutputsCount: remaining.length,
          timeMs,
        }),
      );
      return;
    }

    next();
  };

  return {
    name: "solver-api",
    configureServer(server) {
      server.middlewares.use(handler);
    },
    configurePreviewServer(server) {
      server.middlewares.use(handler);
    },
  };
}

export default defineConfig({
  plugins: [preact(), tailwindcss(), solverApi()],
});
