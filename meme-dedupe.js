// How many recently shown memes to remember, so a fresh batch doesn't
// immediately repeat what a previous batch already showed.
export const HISTORY_LIMIT = 500;

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

// Combines several subreddit batches into one deduped pool: drops anything
// that's a repeat of something earlier in the same batch (the same meme
// cross-posted to more than one of our subreddits) or of `seenHistory`
// (memes already shown in a previous batch this session).
export function dedupeMemes(memeLists, seenHistory = []) {
  const seen = seenHistory.slice();
  const result = [];
  for (const meme of memeLists.flat()) {
    if (!wasRecentlyShown(meme, seen)) {
      result.push(meme);
      seen.push(toHistoryEntry(meme));
    }
  }
  return result;
}

// Fisher-Yates shuffle. Takes a randomFn (defaulting to Math.random) so
// behavior is deterministic and testable; never mutates the input array.
export function shuffle(array, randomFn = Math.random) {
  const arr = array.slice();
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(randomFn() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}
