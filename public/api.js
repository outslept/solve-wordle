async function request(url, options) {
  const response = await fetch(url, options);

  if (!response.ok) {
    throw new Error(`request failed: ${response.status}`);
  }

  return response.json();
}

export function fetchWords() {
  return request("/api/words");
}

export function fetchSuggestion(guesses, patterns, method) {
  return request("/api/next-guess", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      guesses,
      patterns,
      method,
    }),
  });
}
