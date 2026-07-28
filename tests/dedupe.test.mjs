import { test } from "node:test";
import assert from "node:assert/strict";
import {
  normalizeTitle,
  wasRecentlyShown,
  toHistoryEntry,
  pickFreshMeme,
  HISTORY_LIMIT,
  MAX_FETCH_ATTEMPTS,
} from "../meme-dedupe.js";

function meme(id, title, subreddit = "memes") {
  return { postLink: id, url: `https://i.redd.it/${id}.jpg`, title, subreddit, author: "someone" };
}

// A fetcher that returns memes from a fixed pool, one per call, wrapping
// around if it's called more times than the pool has entries.
function poolFetcher(pool) {
  let i = 0;
  return async () => pool[i++ % pool.length];
}

test("normalizeTitle trims and lowercases", () => {
  assert.equal(normalizeTitle("  Funny Cat  "), "funny cat");
  assert.equal(normalizeTitle(undefined), "");
});

test("wasRecentlyShown matches on id even with a different title", () => {
  const history = [toHistoryEntry(meme("post-1", "Original caption"))];
  assert.equal(wasRecentlyShown(meme("post-1", "Different caption"), history), true);
});

test("wasRecentlyShown matches on title (case-insensitive) even with a different id/url", () => {
  // Same joke reposted under a new file/post - this is the "same meme,
  // different filename" case.
  const history = [toHistoryEntry(meme("post-1", "When the code finally works"))];
  const repost = meme("post-2", "  WHEN THE CODE FINALLY WORKS  ");
  assert.equal(wasRecentlyShown(repost, history), true);
});

test("wasRecentlyShown returns false for a genuinely new meme", () => {
  const history = [toHistoryEntry(meme("post-1", "Cat meme"))];
  assert.equal(wasRecentlyShown(meme("post-2", "Dog meme"), history), false);
});

test("pickFreshMeme skips repeats and returns the first fresh meme within maxAttempts", async () => {
  const history = [toHistoryEntry(meme("dup-1", "Repeat one")), toHistoryEntry(meme("dup-2", "Repeat two"))];
  const pool = [meme("dup-1", "Repeat one"), meme("dup-2", "Repeat two"), meme("fresh-1", "New meme")];
  const fetchOne = poolFetcher(pool);

  const { meme: result, attempts } = await pickFreshMeme(fetchOne, history, MAX_FETCH_ATTEMPTS);

  assert.equal(result.postLink, "fresh-1");
  assert.equal(attempts, 3); // two repeats, then the fresh one
});

test(`pickFreshMeme gives up after maxAttempts (n=${MAX_FETCH_ATTEMPTS}) if the pool never yields a fresh meme`, async () => {
  const history = [toHistoryEntry(meme("only-1", "The only meme")), toHistoryEntry(meme("only-2", "Another repeat"))];
  const pool = [meme("only-1", "The only meme"), meme("only-2", "Another repeat")];
  const fetchOne = poolFetcher(pool);

  const { meme: result, attempts } = await pickFreshMeme(fetchOne, history, MAX_FETCH_ATTEMPTS);

  assert.equal(attempts, MAX_FETCH_ATTEMPTS); // exhausted every attempt, never found a fresh one
  assert.ok(result.postLink === "only-1" || result.postLink === "only-2");
});

test(`${MAX_FETCH_ATTEMPTS} consecutive picks from a large-enough pool never repeat a meme`, async () => {
  // Each click's fetcher restarts from the top of the pool (worst case: the
  // first `click` entries are always repeats), so the pool just needs to be
  // bigger than the number of clicks, and the last click needs exactly
  // MAX_FETCH_ATTEMPTS tries - this checks that budget is actually enough.
  const poolSize = MAX_FETCH_ATTEMPTS + 10;
  const pool = Array.from({ length: poolSize }, (_, i) => meme(`post-${i}`, `Meme number ${i}`));
  let history = [];
  const shown = [];

  for (let click = 0; click < MAX_FETCH_ATTEMPTS; click++) {
    const fetchOne = poolFetcher(pool);
    const { meme: result } = await pickFreshMeme(fetchOne, history, MAX_FETCH_ATTEMPTS);
    shown.push(result.postLink);
    history.push(toHistoryEntry(result));
  }

  assert.equal(
    new Set(shown).size,
    MAX_FETCH_ATTEMPTS,
    `expected ${MAX_FETCH_ATTEMPTS} unique memes, got repeats: ${shown.join(", ")}`
  );
});
