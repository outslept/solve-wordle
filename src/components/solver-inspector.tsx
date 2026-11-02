import type { Strategy, Word } from '../../solver/pattern.ts';
import type { StepRecord } from '../types.ts';

interface SolverInspectorProps {
  strategy: Strategy;
  onStrategyChange: (next: Strategy) => void;
  bestGuess: Word | null;
  draftInput: string;
  computeTime: number;
  currentRemaining: Word[];
  answerCount: number;
  hasContradiction: boolean;
  steps: StepRecord[];
  letterStats: { letter: string; count: number; pct: number }[];
  onApplySuggested: () => void;
  onSelectCandidate: (word: Word) => void;
  onSubmitTurn: () => void;
  onEditStep: (index: number) => void;
  onResetAll: () => void;
}

const STRATEGIES: readonly { id: Strategy; label: string; hint: string }[] = [
  { id: 'expected', label: 'Expected', hint: 'Minimize expected turns to win' },
  { id: 'entropy', label: 'Entropy', hint: 'Maximize information gain' },
  { id: 'fast', label: 'Fast', hint: 'Letter frequency heuristic' },
];

export function SolverInspector(props: SolverInspectorProps) {
  const remainingCount = props.currentRemaining.length;
  const isSolved = remainingCount === 1 && !props.hasContradiction;

  const isRecommendedInDraft =
    props.bestGuess !== null && props.draftInput === props.bestGuess;

  const reductionPct =
    props.answerCount > 0
      ? Math.max(
          0,
          Math.min(100, (1 - remainingCount / props.answerCount) * 100),
        )
      : 0;

  return (
    <section
      data-slot="solver-inspector"
      aria-label="Solver recommendation and remaining dictionary"
      class="flex flex-col divide-y divide-[#d6d6d2] bg-[#f7f7f5]"
    >
      <div class="p-5 sm:p-7 bg-white flex flex-col gap-5">
        <div class="flex flex-wrap items-center justify-between gap-3">
          <div class="flex items-center gap-2.5">
            <span class="text-xs font-semibold uppercase tracking-[0.08em] text-[#63635e]">
              01 · Optimal Next Guess
            </span>
            {isSolved ? (
              <span class="px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider bg-[#6aaa64] text-white">
                Solved
              </span>
            ) : (
              <span
                class="font-mono text-[11px] tabular-nums text-[#63635e]"
                aria-live="polite"
              >
                {`${props.computeTime}\u00A0ms`}
              </span>
            )}
          </div>

          <div
            role="group"
            aria-label="Solver strategy"
            class="inline-flex border border-[#d6d6d2] divide-x divide-[#d6d6d2]"
          >
            {STRATEGIES.map((item) => {
              const isActive = props.strategy === item.id;

              return (
                <button
                  key={item.id}
                  type="button"
                  aria-pressed={isActive}
                  data-state={isActive ? 'active' : 'inactive'}
                  onClick={() => props.onStrategyChange(item.id)}
                  title={item.hint}
                  class="px-2.5 py-1 font-mono text-[11px] font-medium uppercase tracking-wider transition-colors cursor-pointer select-none data-[state=active]:bg-[#121212] data-[state=active]:text-[#f7f7f5] data-[state=inactive]:bg-[#f7f7f5] data-[state=inactive]:text-[#525252] hover:data-[state=inactive]:bg-white hover:data-[state=inactive]:text-[#121212]"
                >
                  {item.label}
                </button>
              );
            })}
          </div>
        </div>

        {props.hasContradiction ? (
          <div
            role="alert"
            class="border-l-4 border-[#b91c1c] bg-[#fef2f2] p-4 flex flex-col gap-3"
          >
            <p class="text-sm font-semibold text-[#991b1b]">
              No matching words remain in the dictionary.
            </p>
            <p class="text-xs text-[#7f1d1d] leading-relaxed">
              One of the tile feedback patterns on the board conflicts with all{' '}
              {props.answerCount.toLocaleString()} official answers. Click any
              row on the board to revise its colors.
            </p>
            <div class="flex flex-wrap gap-2 pt-1">
              {props.steps.length > 0 && (
                <button
                  type="button"
                  onClick={() => props.onEditStep(props.steps.length - 1)}
                  class="min-h-9 px-3 py-1.5 bg-[#991b1b] text-white text-xs font-semibold uppercase tracking-wider hover:bg-[#7f1d1d] transition-colors cursor-pointer"
                >
                  Edit Last Row
                </button>
              )}
              <button
                type="button"
                onClick={props.onResetAll}
                class="min-h-9 px-3 py-1.5 bg-white border border-[#fca5a5] text-[#991b1b] text-xs font-semibold uppercase tracking-wider hover:bg-[#fee2e2] transition-colors cursor-pointer"
              >
                Reset All
              </button>
            </div>
          </div>
        ) : (
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div class="flex items-center gap-1.5">
              {(props.bestGuess ? props.bestGuess.split('') : ['—', '—', '—', '—', '—']).map(
                (ch, idx) => (
                  <div
                    key={idx}
                    class={`size-12 sm:size-14 flex items-center justify-center font-mono text-2xl sm:text-3xl font-bold uppercase border-2 ${
                      isSolved
                        ? 'bg-[#6aaa64] border-[#6aaa64] text-white'
                        : 'bg-[#f7f7f5] border-[#121212] text-[#121212]'
                    }`}
                  >
                    {ch}
                  </div>
                ),
              )}
            </div>

            {props.bestGuess && (
              <div class="flex flex-wrap items-center gap-2">
                {!isRecommendedInDraft ? (
                  <button
                    type="button"
                    onClick={props.onApplySuggested}
                    class="min-h-11 px-4 bg-[#121212] text-[#f7f7f5] text-xs font-semibold uppercase tracking-[0.08em] hover:bg-[#2a2a2a] transition-colors cursor-pointer"
                  >
                    Fill “{props.bestGuess.toUpperCase()}” on Board →
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={props.onSubmitTurn}
                    class="min-h-11 px-4 bg-[#6aaa64] text-white text-xs font-semibold uppercase tracking-[0.08em] hover:opacity-95 transition-opacity cursor-pointer"
                  >
                    Submit “{props.bestGuess.toUpperCase()}” ↵
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      <div class="p-5 sm:p-7 flex flex-col gap-4">
        <div class="flex flex-wrap items-baseline justify-between gap-2">
          <div class="flex items-baseline gap-2.5">
            <span class="text-xs font-semibold uppercase tracking-[0.08em] text-[#63635e]">
              02 · Possible Answers
            </span>
            <span class="font-mono text-lg font-bold tabular-nums text-[#121212]">
              {remainingCount.toLocaleString()}
            </span>
            <span class="font-mono text-xs tabular-nums text-[#63635e]">
              of {props.answerCount.toLocaleString()}
            </span>
          </div>

          <span class="font-mono text-xs tabular-nums text-[#63635e]">
            {reductionPct.toFixed(1)}% eliminated
          </span>
        </div>

        {remainingCount > 0 ? (
          <div class="pt-1">
            <p class="text-[11px] text-[#63635e] mb-2.5">
              Click any candidate word to place it on the active board row:
            </p>
            <div class="flex flex-wrap gap-1.5 max-h-52 overflow-y-auto pr-1">
              {props.currentRemaining.slice(0, 90).map((word) => {
                const isTop = word === props.bestGuess;

                return (
                  <button
                    key={word}
                    type="button"
                    onClick={() => props.onSelectCandidate(word)}
                    data-state={isTop ? 'recommended' : 'normal'}
                    class="px-2.5 py-1.5 font-mono text-xs font-semibold uppercase tracking-wider border transition-colors cursor-pointer data-[state=recommended]:bg-[#121212] data-[state=recommended]:text-white data-[state=recommended]:border-[#121212] data-[state=normal]:bg-white data-[state=normal]:text-[#121212] data-[state=normal]:border-[#d6d6d2] hover:border-[#121212]"
                  >
                    {word}
                  </button>
                );
              })}
              {remainingCount > 90 && (
                <span class="px-2.5 py-1.5 font-mono text-xs tabular-nums text-[#63635e]">
                  +{(remainingCount - 90).toLocaleString()}&nbsp;more…
                </span>
              )}
            </div>
          </div>
        ) : (
          <p class="text-xs text-[#63635e]">
            0 candidate words match the current board constraints.
          </p>
        )}
      </div>

      {props.letterStats.length > 0 && (
        <div class="p-5 sm:p-7 flex flex-col gap-3">
          <span class="text-xs font-semibold uppercase tracking-[0.08em] text-[#63635e]">
            03 · Letter Frequency in Remaining Words
          </span>

          <div class="grid grid-cols-2 sm:grid-cols-5 gap-2 pt-1">
            {props.letterStats.map((stat) => (
              <div
                key={stat.letter}
                class="bg-white border border-[#d6d6d2] p-2.5 flex flex-col gap-1.5"
              >
                <div class="flex items-baseline justify-between">
                  <span class="font-mono text-sm font-bold text-[#121212]">
                    {stat.letter}
                  </span>
                  <span class="font-mono text-[11px] tabular-nums text-[#63635e]">
                    {stat.pct}%
                  </span>
                </div>
                <div class="w-full h-1 bg-[#e5e5e0] overflow-hidden">
                  <div
                    class="h-full bg-[#121212]"
                    style={{ width: `${stat.pct}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
