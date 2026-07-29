// How many recently shown memes to remember, so a fresh batch doesn't
// immediately repeat what a previous batch already showed. Deliberately
// bigger than one full batch (10 subreddits x 50 max = 500) so the window
// always has slack to hold an entire batch's worth of history - otherwise
// the oldest entries from a just-finished batch could age out right as the
// next batch is deduped against it, allowing a handful of repeats right at
// the refill boundary.
export const HISTORY_LIMIT = 600;

// If history-aware dedup leaves fewer memes than this, the underlying
// subreddits just haven't refreshed since the last batch (their "hot"
// listings don't change every request) - not something retrying fixes.
export const MIN_BATCH_SIZE = 20;

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

// Builds the pool for a fresh batch. Prefers memes not seen in `history`,
// but if that leaves fewer than `minBatchSize` (the subreddits' content
// hasn't refreshed since the last batch), falls back to deduping only
// within this batch - accepting repeats of older history rather than
// collapsing down to almost nothing.
export function buildPool(memeLists, history, minBatchSize) {
  const freshOnly = dedupeMemes(memeLists, history);
  if (freshOnly.length >= minBatchSize) {
    return freshOnly;
  }
  return dedupeMemes(memeLists);
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

// "xxx/bb" - how many memes shown from the current batch, and which batch
// number this is. Zero-padded to 3 and 2 digits respectively (numbers
// larger than that just widen the field instead of getting truncated).
export function formatBatchCounter(shownCount, batchNumber) {
  return `${String(shownCount).padStart(3, "0")}/${String(batchNumber).padStart(2, "0")}`;
}
