import { useEffect, useMemo, useState } from 'preact/hooks';
import { getPatternCode, isWord, WORD_LEN } from '../../solver/pattern.ts';
import type { Strategy, Word } from '../../solver/pattern.ts';
import { cyclePatternTile, MAX_TURNS } from '../types.ts';
import type { NextGuessResponse, StepRecord, WordsResponse } from '../types.ts';

const ALPHABET = 'abcdefghijklmnopqrstuvwxyz';

interface Turn {
  word: Word;
  pattern: number;
}

export function useWordleSolver() {
  const [allowedWords, setAllowedWords] = useState<Word[]>([]);
  const [answerWords, setAnswerWords] = useState<Word[]>([]);
  const [isBooting, setIsBooting] = useState(true);
  const [bootError, setBootError] = useState<string | null>(null);

  const [strategy, setStrategy] = useState<Strategy>('expected');
  const [turns, setTurns] = useState<Turn[]>([]);
  const [draftInput, setDraftInput] = useState('');
  const [activePattern, setActivePattern] = useState(0);
  const [inputError, setInputError] = useState<string | null>(null);

  const [bestGuess, setBestGuess] = useState<Word | null>(null);
  const [computeTime, setComputeTime] = useState(0);
  const [isSlowLoading, setIsSlowLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;

    fetch('/api/words')
      .then((res) => {
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }

        return res.json();
      })
      .then((data: WordsResponse) => {
        if (cancelled) {
          return;
        }

        setAllowedWords(data.allowedWords);
        setAnswerWords(data.answerWords);
        setIsBooting(false);
      })
      .catch((err: Error) => {
        if (cancelled) {
          return;
        }

        setBootError(err.message);
        setIsBooting(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const { steps, currentRemaining } = useMemo(() => {
    let remaining = answerWords;
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
  }, [turns, answerWords]);

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

  useEffect(() => {
    if (allowedWords.length === 0) {
      return;
    }

    let cancelled = false;
    setIsSlowLoading(true);

    fetch('/api/next-guess', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        guesses: turns.map((turn) => turn.word),
        patterns: turns.map((turn) => turn.pattern),
        strategy,
      }),
    })
      .then((res) => {
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }

        return res.json();
      })
      .then((data: NextGuessResponse) => {
        if (cancelled) {
          return;
        }

        setBestGuess(data.nextGuess);
        setComputeTime(data.timeMs);
        setIsSlowLoading(false);
      })
      .catch(() => {
        if (cancelled) {
          return;
        }

        setIsSlowLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [allowedWords.length, turns, strategy]);

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

    if (!allowedWords.includes(draftInput)) {
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
    allowedCount: allowedWords.length,
    answerCount: answerWords.length,
    isBooting,
    bootError,
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
    isSlowLoading,
    currentRemaining,
    hasContradiction,
    letterStats,
    submitTurn,
    editStep,
    resetAll,
    applySuggestedGuess,
  };
}
