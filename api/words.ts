import type { VercelRequest, VercelResponse } from "@vercel/node";
import { ensureReady } from "./_shared.js";

export default async function handler(_req: VercelRequest, res: VercelResponse) {
  const { pm, allowedWords, answerWords } = await ensureReady();
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.status(200).send(
    JSON.stringify({
      allowed: allowedWords,
      answers: answerWords,
      hasMatrix: !!pm,
    }),
  );
}
