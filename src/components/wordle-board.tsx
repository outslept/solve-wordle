import { useEffect } from 'preact/hooks';
import { WORD_LEN } from '../../solver/pattern.ts';
import { getTileState, MAX_TURNS, TILE_LABELS } from '../types.ts';
import type { StepRecord, TileState } from '../types.ts';

interface WordleBoardProps {
  steps: StepRecord[];
  draftInput: string;
  onDraftChange: (value: string) => void;
  activePattern: number;
  onCycleTile: (colIndex: number) => void;
  inputError: string | null;
  onSubmitTurn: () => void;
  onEditStep: (index: number) => void;
  onResetAll: () => void;
}

const TURN_SLOTS = [0, 1, 2, 3, 4, 5] as const;
const COL_SLOTS = [0, 1, 2, 3, 4] as const;

export function WordleBoard(props: WordleBoardProps) {
  const activeTurnIndex = props.steps.length;
  const isBoardFull = activeTurnIndex >= MAX_TURNS;

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (isBoardFull || e.metaKey || e.ctrlKey || e.altKey) {
        return;
      }

      const target = e.target;

      if (
        target instanceof HTMLElement &&
        (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')
      ) {
        return;
      }

      if (e.key === 'Enter') {
        e.preventDefault();
        props.onSubmitTurn();

        return;
      }

      if (e.key === 'Backspace') {
        e.preventDefault();
        props.onDraftChange(props.draftInput.slice(0, -1));

        return;
      }

      if (/^[a-zA-Z]$/.test(e.key) && props.draftInput.length < WORD_LEN) {
        e.preventDefault();
        props.onDraftChange(props.draftInput + e.key);
      }
    }

    window.addEventListener('keydown', handleKeyDown);

    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isBoardFull, props.draftInput, props.onDraftChange, props.onSubmitTurn]);

  function handleFormSubmit(e: SubmitEvent) {
    e.preventDefault();
    props.onSubmitTurn();
  }

  return (
    <section
      data-slot="wordle-board"
      aria-label="Wordle 6 by 5 board"
      class="flex flex-col items-center justify-between p-5 sm:p-7 bg-white border-b lg:border-b-0 lg:border-r border-[#d6d6d2]"
    >
      <div class="w-full max-w-84 pb-4">
        <div class="flex items-center gap-2">
          <span class="text-xs font-semibold uppercase tracking-[0.08em] text-[#121212]">
            Board
          </span>
          <span class="font-mono text-xs tabular-nums text-[#63635e]">
            {props.steps.length}/{MAX_TURNS}
          </span>
        </div>

        {props.steps.length > 0 && (
          <button
            type="button"
            onClick={props.onResetAll}
            class="min-h-9 px-2.5 py-1 text-xs font-medium text-[#525252] bg-[#f7f7f5] border border-[#d6d6d2] hover:border-[#121212] hover:text-[#121212] transition-colors cursor-pointer"
          >
            Reset Board
          </button>
        )}
      </div>

      <div
        class="grid grid-rows-6 gap-1.5 w-full max-w-84"
        role="region"
        aria-label="Wordle guesses"
      >
        {TURN_SLOTS.map((turnIndex) => {
          const step = props.steps[turnIndex];

          if (step) {
            return (
              <div
                key={turnIndex}
                class="group relative grid grid-cols-5 gap-1.5"
              >
                {COL_SLOTS.map((colIndex) => {
                  const tileState = getTileState(step.pattern, colIndex);
                  const letter = step.word.charAt(colIndex).toUpperCase();

                  return (
                    <button
                      key={colIndex}
                      type="button"
                      onClick={() => props.onEditStep(turnIndex)}
                      title={`Click to edit Turn ${turnIndex + 1} (${TILE_LABELS[tileState]})`}
                      aria-label={`Turn ${turnIndex + 1}, letter ${letter}, ${TILE_LABELS[tileState]}. Click to edit from this row.`}
                      data-state={tileState}
                      class="aspect-square w-full flex flex-col items-center justify-center font-mono text-2xl font-bold uppercase select-none transition-transform active:scale-95 cursor-pointer text-white data-[state=miss]:bg-[#787c7e] data-[state=present]:bg-[#c9b458] data-[state=correct]:bg-[#6aaa64]"
                    >
                      <span>{letter}</span>
                    </button>
                  );
                })}
              </div>
            );
          }

          if (turnIndex === activeTurnIndex && !isBoardFull) {
            return (
              <div key={turnIndex} class="grid grid-cols-5 gap-1.5">
                {COL_SLOTS.map((colIndex) => {
                  const tileState = getTileState(props.activePattern, colIndex);
                  const letter = props.draftInput.charAt(colIndex).toUpperCase();
                  const hasLetter = letter.length > 0;

                  return (
                    <button
                      key={colIndex}
                      type="button"
                      onClick={() => props.onCycleTile(colIndex)}
                      aria-label={`Position ${colIndex + 1}, letter ${letter || 'empty'}, ${TILE_LABELS[tileState]}. Click to cycle tile color.`}
                      data-state={tileState}
                      class="aspect-square w-full flex flex-col items-center justify-center font-mono select-none transition-transform active:scale-95 cursor-pointer text-white ring-offset-white data-[state=miss]:bg-[#787c7e] data-[state=present]:bg-[#c9b458] data-[state=correct]:bg-[#6aaa64]"
                    >
                      <span class="text-2xl font-bold leading-none uppercase">
                        {hasLetter ? letter : '·'}
                      </span>
                    </button>
                  );
                })}
              </div>
            );
          }

          return (
            <div
              key={turnIndex}
              class="grid grid-cols-5 gap-1.5"
              aria-hidden="true"
            >
              {COL_SLOTS.map((colIndex) => (
                <div
                  key={colIndex}
                  class="aspect-square w-full border-2 border-[#d3d6da] bg-white"
                />
              ))}
            </div>
          );
        })}
      </div>

      <form
        onSubmit={handleFormSubmit}
         noValidate
        class="w-full max-w-84 flex flex-col gap-3"
      >
        <div class="flex items-center gap-3 text-[11px] font-medium text-[#525252]">
          <span class="inline-flex items-center gap-1.5">
            <span class="size-3 inline-block bg-[#787c7e]" />
            Gray = Miss
          </span>
          <span class="inline-flex items-center gap-1.5">
            <span class="size-3 inline-block bg-[#c9b458]" />
            Yellow = Spot
          </span>
          <span class="inline-flex items-center gap-1.5">
            <span class="size-3 inline-block bg-[#6aaa64]" />
            Green = Hit
          </span>
        </div>

        <div class="flex gap-2">
          <label for="word-guess-input" class="sr-only">
            Type 5-letter word
          </label>
          <input
            id="word-guess-input"
            name="guess"
            type="text"
            inputMode="text"
            autoComplete="off"
            autoCapitalize="characters"
            maxLength={WORD_LEN}
            disabled={isBoardFull}
            value={props.draftInput.toUpperCase()}
            onInput={(e) => props.onDraftChange(e.currentTarget.value)}
            placeholder={isBoardFull ? 'Board complete' : 'Type word…'}
            aria-invalid={props.inputError ? 'true' : 'false'}
            aria-describedby={props.inputError ? 'word-guess-error' : undefined}
            class="min-w-0 flex-1 min-h-11 px-3 bg-[#f7f7f5] border border-[#d6d6d2] focus:border-[#121212] focus:bg-white font-mono text-base font-bold uppercase tracking-[0.2em] text-[#121212] placeholder:font-sans placeholder:text-xs placeholder:font-normal placeholder:tracking-normal placeholder:text-[#787872] outline-none transition-colors"
          />
          <button
            type="submit"
            disabled={isBoardFull}
            class="min-h-11 px-4 bg-[#121212] text-[#f7f7f5] font-sans text-xs font-semibold uppercase tracking-[0.08em] hover:bg-[#2a2a2a] disabled:opacity-40 transition-colors cursor-pointer shrink-0"
          >
            Enter ↵
          </button>
        </div>

        {props.inputError && (
          <p
            id="word-guess-error"
            role="alert"
            aria-live="polite"
            class="text-xs font-medium text-[#b91c1c]"
          >
            {props.inputError}
          </p>
        )}
      </form>
    </section>
  );
}
