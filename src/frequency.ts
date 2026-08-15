export function pickByLetterFrequency(
  allowedWords: readonly string[],
  answerWords: readonly string[],
  possibleIndices: readonly number[],
): string {
  const freq = new Map<string, number>();
  for (const ai of possibleIndices) {
    const w = answerWords[ai]!;
    for (const ch of w) freq.set(ch, (freq.get(ch) ?? 0) + 1);
  }
  let best = allowedWords[0]!;
  let bestScore = -1;
  for (const w of allowedWords) {
    const seen = new Set<string>();
    let s = 0;
    for (const ch of w) {
      if (!seen.has(ch)) {
        s += freq.get(ch) ?? 0;
        seen.add(ch);
      }
    }
    if (s > bestScore) {
      bestScore = s;
      best = w;
    }
  }
  return best;
}
