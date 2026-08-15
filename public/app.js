import { fetchSuggestion, fetchWords } from "./api.js";
import {
  filterAnswers,
  patternArrayToInt,
  patternIntToArray,
} from "./utils.js";
import {
  diagnosticsFooterHtml,
  diagnosticsHeaderHtml,
  diagnosticsRowHtml,
  emptyStateHtml,
  historyEmptyHtml,
  historyRowHtml,
  historyTilesHtml,
  letterFreqHtml,
  loadingHtml,
  problemBlockHtml,
  sampleWordsHtml,
} from "./templates.js";

const WORD_LEN = 5;
const WORD_PATTERN = /^[a-z]{5}$/;

const elements = {
  guessInput: document.getElementById("guessInput"),
  pickerRow: document.getElementById("pickerRow"),
  addBtn: document.getElementById("addGuessBtn"),
  updateBtn: document.getElementById("updateGuessBtn"),
  cancelEditBtn: document.getElementById("cancelEditBtn"),
  undoBtn: document.getElementById("undoBtn"),
  clearBtn: document.getElementById("clearBtn"),
  method: document.getElementById("method"),
  suggestion: document.getElementById("suggestion"),
  history: document.getElementById("historyContent"),
  possibleCount: document.getElementById("possibleCount"),
  requestTime: document.getElementById("requestTime"),
  entropy: document.getElementById("entropy"),
  letterFreq: document.getElementById("letterFreq"),
  sampleWords: document.getElementById("sampleWords"),
};

const state = {
  answers: [],
  guesses: [],
  patterns: [],
  editingIndex: -1,
  currentPossibleAnswers: [],
};

const pickerTiles = createPickerTiles();

function createPickerTiles() {
  const tiles = [];

  for (let i = 0; i < WORD_LEN; i++) {
    const tile = document.createElement("div");
    tile.className = "tile";
    tile.dataset.state = "0";

    tile.addEventListener("click", () => {
      const nextState = (Number(tile.dataset.state) + 1) % 3;
      setTileState(tile, nextState);
    });

    setTileState(tile, 0);
    elements.pickerRow.appendChild(tile);
    tiles.push(tile);
  }

  return tiles;
}

function setTileState(tile, state) {
  tile.dataset.state = String(state);
  tile.classList.remove("gray", "yellow", "green");

  if (state === 0) tile.classList.add("gray");
  else if (state === 1) tile.classList.add("yellow");
  else tile.classList.add("green");
}

function setPicker(word = "", pattern = null) {
  const normalizedWord = word.toUpperCase();

  for (let i = 0; i < WORD_LEN; i++) {
    const tile = pickerTiles[i];
    tile.textContent = normalizedWord[i] ?? "";
    setTileState(tile, pattern?.[i] ?? 0);
  }
}

function getPickerPattern() {
  return pickerTiles.map((tile) => Number(tile.dataset.state));
}

function getGuessInput() {
  const word = elements.guessInput.value.toLowerCase();

  if (!WORD_PATTERN.test(word)) {
    alert("Please enter a valid 5-letter word.");
    return null;
  }

  return word;
}

function setEditingMode(index = -1) {
  state.editingIndex = index;
  const editing = index >= 0;

  elements.addBtn.style.display = editing ? "none" : "inline-block";
  elements.updateBtn.style.display = editing ? "inline-block" : "none";
  elements.cancelEditBtn.style.display = editing ? "inline-block" : "none";
}

function startEdit(index) {
  state.editingIndex = index;

  const guess = state.guesses[index];
  const pattern = patternIntToArray(state.patterns[index]);

  elements.guessInput.value = guess;
  setPicker(guess, pattern);
  setEditingMode(index);
}

function cancelEdit() {
  elements.guessInput.value = "";
  setPicker();
  setEditingMode();
}

function renderLetterFrequency() {
  if (state.currentPossibleAnswers.length === 0) {
    elements.letterFreq.innerHTML = "";
    return;
  }

  const frequencies = new Map();

  for (const word of state.currentPossibleAnswers) {
    for (const letter of word) {
      frequencies.set(letter, (frequencies.get(letter) ?? 0) + 1);
    }
  }

  const mostCommon = [...frequencies.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);

  elements.letterFreq.innerHTML = letterFreqHtml(mostCommon);
}

function renderPossibleAnswers() {
  if (state.currentPossibleAnswers.length === 0) {
    elements.sampleWords.innerHTML = emptyStateHtml("No remaining possibilities");
    return;
  }

  const sampleSize = Math.min(30, state.currentPossibleAnswers.length);
  const sample = state.currentPossibleAnswers.slice(0, sampleSize);
  const remaining = state.currentPossibleAnswers.length - sampleSize;

  elements.sampleWords.innerHTML = sampleWordsHtml(sample, remaining);
}

function renderPossibleAnalysis() {
  renderLetterFrequency();
  renderPossibleAnswers();
}

function renderHistory() {
  if (state.guesses.length === 0) {
    elements.history.innerHTML = historyEmptyHtml();
    return;
  }

  elements.history.innerHTML = state.guesses
    .map((guess, index) => {
      const pattern = patternIntToArray(state.patterns[index]);
      const tilesHtml = historyTilesHtml(guess, pattern);
      return historyRowHtml(index, guess, state.patterns[index], tilesHtml);
    })
    .join("");
}

function checkStep(stepIndex) {
  const guesses = state.guesses.slice(0, stepIndex + 1);
  const patterns = state.patterns.slice(0, stepIndex + 1);
  const remaining = filterAnswers(state.answers, guesses, patterns);

  alert(`After step ${stepIndex + 1}: ${remaining.length} possibilities remaining`);
}

function renderDiagnostics() {
  if (state.guesses.length === 0) return;

  let remaining = state.answers.slice();
  let html = diagnosticsHeaderHtml(remaining.length);

  for (let i = 0; i < state.guesses.length; i++) {
    remaining = filterAnswers(
      remaining,
      [state.guesses[i]],
      [state.patterns[i]],
    );

    const pattern = patternIntToArray(state.patterns[i]);
    const patternText = pattern
      .map((value) => (value === 0 ? "gray" : value === 1 ? "yellow" : "green"))
      .join(" ");

    const contradiction = remaining.length === 0;
    html += diagnosticsRowHtml(i, state.guesses[i], patternText, remaining.length, contradiction);
  }

  html += diagnosticsFooterHtml();

  if (remaining.length === 0) {
    html += problemBlockHtml();
  }

  elements.sampleWords.innerHTML = html;
}

function renderInitialState() {
  elements.suggestion.textContent = "—";
  elements.requestTime.textContent = "—";

  elements.possibleCount.textContent = state.answers.length
    ? String(state.answers.length)
    : "—";

  elements.entropy.textContent = state.answers.length
    ? Math.log2(state.answers.length).toFixed(2)
    : "—";

  state.currentPossibleAnswers = state.answers.slice();

  renderPossibleAnalysis();
}

function resetGame() {
  state.guesses.length = 0;
  state.patterns.length = 0;

  cancelEdit();
  renderHistory();
  renderInitialState();
}

function setSuggestionLoading() {
  elements.suggestion.textContent = "Calculating...";
  elements.possibleCount.textContent = "—";
  elements.requestTime.textContent = "—";
  elements.entropy.textContent = "—";
  elements.letterFreq.innerHTML = loadingHtml();
  elements.sampleWords.innerHTML = loadingHtml();
}

async function requestNextSuggestion() {
  const startedAt = performance.now();
  setSuggestionLoading();

  try {
    const data = await fetchSuggestion(
      state.guesses.slice(),
      state.patterns.slice(),
      elements.method.value,
    );

    const elapsed = Math.round(performance.now() - startedAt);

    if (data.error) {
      elements.suggestion.textContent = "error";
      elements.possibleCount.textContent = "0";
      elements.requestTime.textContent = String(elapsed);
      elements.entropy.textContent = "0";
      elements.letterFreq.innerHTML = `<div class="error">${data.error}</div>`;
      renderDiagnostics();
      return;
    }

    elements.suggestion.textContent = data.nextGuess || "—";
    elements.possibleCount.textContent = String(data.possibleCount || 0);
    elements.requestTime.textContent = String(elapsed);

    const entropy =
      data.possibleCount > 0 ? Math.log2(data.possibleCount) : 0;

    elements.entropy.textContent = entropy.toFixed(2);

    state.currentPossibleAnswers = Array.isArray(data.sample)
      ? data.sample
      : [];

    renderPossibleAnalysis();
  } catch (error) {
    console.error("request failed:", error);

    elements.suggestion.textContent = "Request failed";
    elements.letterFreq.innerHTML =
      '<div class="error">Request failed</div>';
    elements.sampleWords.innerHTML = "";
  }
}

function addGuess() {
  const word = getGuessInput();
  if (!word) return false;

  state.guesses.push(word);
  state.patterns.push(patternArrayToInt(getPickerPattern()));

  elements.guessInput.value = "";
  setPicker();
  renderHistory();

  return true;
}

function updateGuess() {
  if (state.editingIndex < 0) return false;

  const word = getGuessInput();
  if (!word) return false;

  state.guesses[state.editingIndex] = word;
  state.patterns[state.editingIndex] =
    patternArrayToInt(getPickerPattern());

  cancelEdit();
  renderHistory();

  return true;
}

async function loadWords() {
  try {
    const data = await fetchWords();

    if (!Array.isArray(data.allowed) || !Array.isArray(data.answers)) {
      throw new Error("/api/words returned unexpected payload");
    }

    state.answers = data.answers;

    if (!data.hasMatrix) {
      elements.method.querySelector('option[value="entropy"]')?.setAttribute("disabled", "");
      elements.method.querySelector('option[value="expected"]')?.setAttribute("disabled", "");
    }

    renderInitialState();
  } catch (error) {
    console.error("failed to fetch words:", error);

    elements.letterFreq.innerHTML =
      '<div class="error">Failed to load word lists. check server console.</div>';
    elements.sampleWords.innerHTML =
      '<div class="error">Failed to load word lists.</div>';
  }
}

elements.guessInput.addEventListener("input", (event) => {
  const value = event.target.value.toLowerCase().slice(0, WORD_LEN);
  event.target.value = value;

  for (let i = 0; i < WORD_LEN; i++) {
    pickerTiles[i].textContent = value[i]?.toUpperCase() ?? "";
  }
});

elements.guessInput.addEventListener("keydown", (event) => {
  if (event.key !== "Enter") return;

  if (state.editingIndex >= 0) {
    elements.updateBtn.click();
  } else {
    elements.addBtn.click();
  }
});

elements.method.addEventListener("change", () => {
  if (state.guesses.length > 0) {
    void requestNextSuggestion();
  }
});

elements.addBtn.addEventListener("click", async () => {
  if (addGuess()) {
    await requestNextSuggestion();
  }
});

elements.updateBtn.addEventListener("click", async () => {
  if (updateGuess()) {
    await requestNextSuggestion();
  }
});

elements.cancelEditBtn.addEventListener("click", cancelEdit);

elements.undoBtn.addEventListener("click", async () => {
  if (state.guesses.length === 0) return;

  state.guesses.pop();
  state.patterns.pop();

  renderHistory();

  if (state.guesses.length === 0) {
    renderInitialState();
  } else {
    await requestNextSuggestion();
  }
});

elements.clearBtn.addEventListener("click", () => {
  if (state.guesses.length === 0) return;
  if (!confirm("Clear all guesses?")) return;

  resetGame();
});

elements.history.addEventListener("click", (event) => {
  const target = event.target;
  const row = target.closest(".history-row");

  if (!row) return;

  const index = Number(row.dataset.index);

  if (target.closest('[data-action="check"]')) {
    checkStep(index);
    return;
  }

  startEdit(index);
});

setPicker();
renderHistory();
await loadWords();
