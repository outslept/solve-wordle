import { SolverInspector } from './components/solver-inspector.tsx';
import { WordleBoard } from './components/wordle-board.tsx';
import { useWordleSolver } from './hooks/use-wordle-solver.ts';

export function App() {
  const solver = useWordleSolver();

  return (
    <>
      <header class="border-b border-[#d6d6d2] px-5 sm:px-7 py-3.5 flex items-center">
        <div class="flex items-center gap-3">
          <div
            class="flex items-center gap-1 text-white font-mono text-xs font-bold"
            aria-hidden="true"
          >
            <span class="size-5 flex items-center justify-center bg-[#6aaa64]">
              W
            </span>
            <span class="size-5 flex items-center justify-center bg-[#c9b458]">
              O
            </span>
            <span class="size-5 flex items-center justify-center bg-[#787c7e]">
              R
            </span>
          </div>
          <h1 class="text-sm font-bold tracking-tight uppercase">
            Wordle Solver
          </h1>
        </div>
      </header>

      <main class="flex-1 max-w-6xl w-full mx-auto grid grid-cols-1 lg:grid-cols-[24rem_1fr] border-x border-b border-[#d6d6d2]">
        <WordleBoard
          steps={solver.steps}
          draftInput={solver.draftInput}
          onDraftChange={solver.updateDraft}
          activePattern={solver.activePattern}
          onCycleTile={solver.cyclePickerTile}
          inputError={solver.inputError}
          onSubmitTurn={solver.submitTurn}
          onEditStep={solver.editStep}
          onResetAll={solver.resetAll}
        />

        <SolverInspector
          strategy={solver.strategy}
          onStrategyChange={solver.setStrategy}
          bestGuess={solver.bestGuess}
          draftInput={solver.draftInput}
          computeTime={solver.computeTime}
          currentRemaining={solver.currentRemaining}
          answerCount={solver.answerCount}
          hasContradiction={solver.hasContradiction}
          steps={solver.steps}
          letterStats={solver.letterStats}
          onApplySuggested={solver.applySuggestedGuess}
          onSelectCandidate={(word) => solver.updateDraft(word)}
          onSubmitTurn={solver.submitTurn}
          onEditStep={solver.editStep}
          onResetAll={solver.resetAll}
        />
      </main>
    </>
  );
}
