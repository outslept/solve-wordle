const WORD_LEN = 5;
const PATTERN_BASE = 3;

export function patternArrayToInt(pattern) {
  let value = 0;
  let power = 1;

  for (let i = 0; i < WORD_LEN; i++) {
    value += (pattern[i] ?? 0) * power;
    power *= PATTERN_BASE;
  }

  return value;
}

export function patternIntToArray(value) {
  const pattern = [];

  for (let i = 0; i < WORD_LEN; i++) {
    pattern.push(value % PATTERN_BASE);
    value = Math.floor(value / PATTERN_BASE);
  }

  return pattern;
}

export function simulatePattern(guess, answer) {
  const pattern = Array(WORD_LEN).fill(0);
  const used = Array(WORD_LEN).fill(false);

  for (let i = 0; i < WORD_LEN; i++) {
    if (guess[i] === answer[i]) {
      pattern[i] = 2;
      used[i] = true;
    }
  }

  for (let i = 0; i < WORD_LEN; i++) {
    if (pattern[i] === 2) continue;

    for (let j = 0; j < WORD_LEN; j++) {
      if (used[j] || guess[i] !== answer[j]) continue;

      pattern[i] = 1;
      used[j] = true;
      break;
    }
  }

  return patternArrayToInt(pattern);
}

export function filterAnswers(answers, guesses, patterns) {
  let possible = answers.slice();

  for (let i = 0; i < guesses.length; i++) {
    possible = possible.filter(
      (answer) => simulatePattern(guesses[i], answer) === patterns[i],
    );
  }

  return possible;
}
