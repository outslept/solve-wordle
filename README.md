# wordle-solve

A tiny web app and API for solving Wordle. It supports three suggestion strategies:

- `letter-frequency` (fast; no preprocessing)
- `information gain` (entropy; requires a precomputed pattern matrix)
- `expected steps` (score minimization; requires the same matrix)

The UI lives in `public/`, the engine in `src/`, and you can run it locally via a Node + Hono server or deploy the API to Vercel serverless.

## API

`GET /api/words`

- Returns the dictionary and whether the matrix is available.

```json
{
  "allowed": ["tares", "..."],
  "answers": ["raise", "..."],
  "hasMatrix": true
}
```

`POST /api/next-guess`

- Body:

```json
{
  "guesses": ["raise", "adieu"],
  "patterns": [0, 242],
  "method": "fast" | "entropy" | "expected"
}
```

- Response:

```json
{
  "nextGuess": "trace",
  "possibleCount": 37,
  "sample": ["trace", "crate", "... up to 20"]
}
```

- Example:

```sh
curl -s -X POST http://localhost:3000/api/next-guess \
  -H "Content-Type: application/json" \
  -d '{"guesses":["raise"],"patterns":[0],"method":"fast"}'
```

Notes:

- `guesses`: array of your past guesses (lowercase `a–z`, exactly `5` letters each)
- `patterns`: array of pattern codes for each guess (same length as `guesses`)
- `method`:
  - `fast` → letter frequency
  - `entropy` → information gain (requires matrix)
  - `expected` → expected steps minimization (requires matrix)

## How it works

- We precompute a pattern matrix `M` of size `[allowed × answers]`, where each cell is one byte: the Wordle feedback pattern for `(guess, answer)`.
- Pattern encoding:
  - `MISS = 0`, `MISPLACED = 1`, `EXACT = 2`
  - A 5-digit base-3 number, least significant digit is position `0`.
  - All-miss is `0`; all-green is `242` (`2 * (1 + 3 + 9 + 27 + 81)`).
- Suggestion strategies:
  - `letter-frequency`: greedy coverage over remaining answer letters
  - `entropy`: pick the guess maximizing expected information gain over pattern buckets
  - `expected`: pick the guess minimizing an empirical expected-step surrogate

## Based on

https://www.youtube.com/watch?v=fRed0Xmc2Wg

https://www.youtube.com/watch?v=v68zYyaEmEA

https://www.youtube.com/watch?v=doFowk4xj7Q
