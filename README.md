# solve-wordle.

An information-theoretic Wordle "assistant" with an interactive 6×5 board.

## How It Works

Each turn's 5-tile feedback is encoded as a base-3 integer in `0..242` (`0` = gray/miss, `1` = yellow/present, `2` = green/correct). On startup, the app builds an in-memory `Uint8Array` pattern lookup matrix across all allowed guesses and official answers, then ranks candidate guesses using one of three strategies:

- **Expected Steps** *(default)* - minimizes expected turns to win by combining immediate win probability with a log-regression estimate of remaining steps from residual entropy:
- **Max Entropy** - maximizes Shannon information gain across all 243 feedback buckets.
- **Fast** - ranks remaining answers by unique letter frequency across the surviving pool.

## Usage

1. Type any 5-letter word on your keyboard (or click **Fill on Board** to use the solver's suggestion).
2. Click tiles on the active row to cycle their feedback colors (**Gray** → **Yellow** → **Green**).
3. Press **Enter** to lock in the turn and update the optimal next guess, remaining candidates, and letter frequencies.
4. Click any previous row on the board to rewind and edit its feedback.
