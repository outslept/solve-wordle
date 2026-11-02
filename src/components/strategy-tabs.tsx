import type { Strategy } from "../../solver/pattern.ts";

interface StrategyTabsProps {
  strategy: Strategy;
  onSelect: (next: Strategy) => void;
}

const OPTIONS: readonly {
  id: Strategy;
  label: string;
  hint: string;
}[] = [
  {
    id: "expected",
    label: "Expected Steps",
    hint: "Fewer turns to win",
  },
  {
    id: "entropy",
    label: "Max Entropy",
    hint: "Maximum info split",
  },
  {
    id: "fast",
    label: "Fast",
    hint: "Letter frequency",
  },
];

export function StrategyTabs(props: StrategyTabsProps) {
  return (
    <div
      data-slot="strategy-buttons"
      class="flex flex-wrap items-center gap-1.5"
      role="group"
      aria-label="Solver algorithm"
    >
      {OPTIONS.map((opt) => {
        const isActive = props.strategy === opt.id;

        return (
          <button
            key={opt.id}
            type="button"
            aria-pressed={isActive}
            data-state={isActive ? "active" : "inactive"}
            onClick={() => props.onSelect(opt.id)}
            title={opt.hint}
            class="min-h-11 sm:min-h-9 px-3.5 py-1.5 text-xs font-medium border transition-colors cursor-pointer select-none data-[state=active]:bg-[#121212] data-[state=active]:text-[#f7f7f5] data-[state=active]:border-[#121212] data-[state=inactive]:bg-white data-[state=inactive]:text-[#525252] data-[state=inactive]:border-[#d6d6d2] hover:data-[state=inactive]:border-[#121212] hover:data-[state=inactive]:text-[#121212]"
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
