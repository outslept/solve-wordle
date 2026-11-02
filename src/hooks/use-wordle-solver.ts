import { useMemo, useState } from 'preact/hooks';
import allowedRaw from '../../data/allowed_words.txt?raw';
import answersRaw from '../../data/possible_words.txt?raw';
import {
  getPatternCode,
  isWord,
  parseWords,
  PatternMatrix,
  pickNextGuess,
  WORD_LEN,
} from '../../solver/index.ts';
import type { Strategy, Word } from '../../solver/index.ts';
import { cyclePatternTile, MAX_TURNS } from '../types.ts';
import type { StepRecord } from '../types.ts';

const ALPHABET = 'abcdefghijklmnopqrstuvwxyz';
const ALLOWED_WORDS = parseWords(allowedRaw);
const ANSWER_WORDS = parseWords(answersRaw);
const MATRIX = new PatternMatrix(ALLOWED_WORDS, ANSWER_WORDS);

interface Turn {
  word: Word;
  pattern: number;
}

export function useWordleSolver() {
  const [strategy, setStrategy] = useState<Strategy>('expected');
  const [turns, setTurns] = useState<Turn[]>([]);
  const [draftInput, setDraftInput] = useState('');
  const [activePattern, setActivePattern] = useState(0);
  const [inputError, setInputError] = useState<string | null>(null);

  const { steps, currentRemaining } = useMemo(() => {
    let remaining = ANSWER_WORDS;
    const history: StepRecord[] = [];

    for (const turn of turns) {
      const nextRemaining = remaining.filter(
        (answer) => getPatternCode(turn.word, answer) === turn.pattern,
      );

      remaining = nextRemaining;
      history.push({
        word: turn.word,
        pattern: turn.pattern,
        remainingCount: remaining.length,
        contradiction: remaining.length === 0,
      });
    }

    return { steps: history, currentRemaining: remaining };
  }, [turns]);

  const { bestGuess, computeTime } = useMemo(() => {
    const t0 = performance.now();
    const guess = pickNextGuess(
      ALLOWED_WORDS,
      ANSWER_WORDS,
      MATRIX,
      turns.map((turn) => turn.word),
      turns.map((turn) => turn.pattern),
      strategy,
    );
    const elapsed = Math.round((performance.now() - t0) * 10) / 10;

    return { bestGuess: guess, computeTime: elapsed };
  }, [turns, strategy]);

  const hasContradiction = steps.some((step) => step.contradiction);

  const letterStats = useMemo(() => {
    const total = currentRemaining.length;

    if (total === 0) {
      return [];
    }

    const stats: { letter: string; count: number; pct: number }[] = [];

    for (const ch of ALPHABET) {
      let count = 0;

      for (const word of currentRemaining) {
        if (word.includes(ch)) {
          count++;
        }
      }

      if (count > 0) {
        stats.push({
          letter: ch.toUpperCase(),
          count,
          pct: Math.round((count / total) * 100),
        });
      }
    }

    return stats.sort((a, b) => b.count - a.count).slice(0, 10);
  }, [currentRemaining]);

  function cyclePickerTile(colIndex: number) {
    setActivePattern((prev) => cyclePatternTile(prev, colIndex));
  }

  function updateDraft(raw: string) {
    const cleaned = raw.replace(/[^a-zA-Z]/g, '').toLowerCase().slice(0, WORD_LEN);
    setDraftInput(cleaned);
    setInputError(null);
  }

  function submitTurn() {
    if (turns.length >= MAX_TURNS) {
      return;
    }

    if (!isWord(draftInput)) {
      setInputError('Enter a 5-letter English word.');

      return;
    }

    if (!ALLOWED_WORDS.includes(draftInput)) {
      setInputError(`“${draftInput.toUpperCase()}” is not in the Wordle dictionary.`);

      return;
    }

    setTurns((prev) => [...prev, { word: draftInput, pattern: activePattern }]);
    setDraftInput('');
    setActivePattern(0);
    setInputError(null);
  }

  function editStep(index: number) {
    const target = turns[index];

    if (!target) {
      return;
    }

    setDraftInput(target.word);
    setActivePattern(target.pattern);
    setTurns((prev) => prev.slice(0, index));
    setInputError(null);
  }

  function resetAll() {
    setTurns([]);
    setDraftInput('');
    setActivePattern(0);
    setInputError(null);
  }

  function applySuggestedGuess() {
    if (!bestGuess) {
      return;
    }

    setDraftInput(bestGuess);
    setInputError(null);
  }

  return {
    answerCount: ANSWER_WORDS.length,
    strategy,
    setStrategy,
    steps,
    draftInput,
    updateDraft,
    activePattern,
    cyclePickerTile,
    inputError,
    bestGuess,
    computeTime,
    currentRemaining,
    hasContradiction,
    letterStats,
    submitTurn,
    editStep,
    resetAll,
    applySuggestedGuess,
  };
}
