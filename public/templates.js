export function letterFreqHtml(entries) {
  return `
    <h4>Most common letters:</h4>
    <div>
      ${entries
      .map(([letter, count]) => `<span class="freq-item">${letter}: ${count}</span>`)
      .join("")}
    </div>
  `;
}

export function sampleWordsHtml(words, moreCount) {
  return `
    <h4 style="margin: 20px 0 12px 0;">Remaining possibilities:</h4>
    <div>
      ${words.join(", ")}
      ${moreCount > 0 ? `<span style="color: #999;">(+${moreCount} more)</span>` : ""}
    </div>
  `;
}

export function emptyStateHtml(text) {
  return `<div style="text-align: center; color: #999; margin-top: 20px;">${text}</div>`;
}

export function loadingHtml() {
  return '<div class="loading">Analyzing...</div>';
}

export function historyTilesHtml(guess, pattern) {
  return pattern
    .map((state, position) => {
      const color =
        state === 0 ? "#787c7e" : state === 1 ? "#c9b458" : "#6aaa64";
      return `<div class="history-tile" style="background: ${color}">${guess[position]?.toUpperCase() ?? ""}</div>`;
    })
    .join("");
}

export function historyRowHtml(index, guess, pattern, tilesHtml) {
  return `
    <div class="history-row" data-index="${index}">
      <div class="history-tiles">${tilesHtml}</div>
      <div class="meta">
        <strong>${guess}</strong> |
        pattern: ${pattern} |
        step ${index + 1}
        <button
          data-action="check"
          style="margin-left: 8px; padding: 2px 6px; font-size: 11px;"
        >
          check
        </button>
      </div>
    </div>
  `;
}

export function historyEmptyHtml() {
  return '<div class="empty-state">No guesses yet</div>';
}

export function diagnosticsHeaderHtml(initialLength) {
  return `
    <h4>diagnostics:</h4>
    <div style="font-family: monospace; font-size: 12px;">
      start: ${initialLength} possibilities<br>
  `;
}

export function diagnosticsRowHtml(index, guess, patternText, remainingLength, contradiction) {
  let row = `${index + 1}. ${guess} [${patternText}] → ${remainingLength} left`;
  if (contradiction) {
    row += ' <span style="color: #e00;">Contradiction here</span>';
  }
  return row + "<br>";
}

export function diagnosticsFooterHtml() {
  return "</div>";
}

export function problemBlockHtml() {
  return `
    <div style="margin-top: 12px; padding: 12px; background: #fef7f7; border: 1px solid #f5c6cb; border-radius: 6px; font-size: 13px;">
      <strong>Problem detected:</strong>
      no possibilities remain after applying all provided patterns.
      Check your patterns/guesses above.
    </div>
  `;
}
