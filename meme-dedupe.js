// How many of the most recently shown memes to avoid repeating.
export const HISTORY_LIMIT = 50;
// How many times to retry if we keep landing on recently-shown memes.
export const MAX_FETCH_ATTEMPTS = 20;

export function normalizeTitle(str) {
  return (str || "").trim().toLowerCase();
}

export function toHistoryEntry(meme) {
  return { id: meme.postLink || meme.url, title: normalizeTitle(meme.title) };
}

export function wasRecentlyShown(meme, history) {
  const id = meme.postLink || meme.url;
  const normTitle = normalizeTitle(meme.title);
  return history.some(
    (entry) => entry.id === id || (normTitle && entry.title === normTitle)
  );
}

// Calls fetchOne() up to maxAttempts times, stopping as soon as it gets a
// meme that isn't in `history`. If every attempt is a repeat, returns the
// last one fetched rather than retrying forever.
export async function pickFreshMeme(fetchOne, history, maxAttempts) {
  let meme;
  let attempts = 0;
  while (attempts < maxAttempts) {
    meme = await fetchOne();
    attempts += 1;
    if (!wasRecentlyShown(meme, history)) {
      break;
    }
  }
  return { meme, attempts };
}
