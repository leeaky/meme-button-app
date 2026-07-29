import { test } from "node:test";
import assert from "node:assert/strict";
import {
  normalizeTitle,
  wasRecentlyShown,
  toHistoryEntry,
  dedupeMemes,
  shuffle,
  formatBatchCounter,
  HISTORY_LIMIT,
} from "../meme-dedupe.js";

function meme(id, title, subreddit = "memes") {
  return { postLink: id, url: `https://i.redd.it/${id}.jpg`, title, subreddit, author: "someone" };
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

test("dedupeMemes drops the same meme cross-posted to more than one subreddit batch", () => {
  const listA = [meme("post-1", "Cat meme", "memes"), meme("post-2", "Dog meme", "memes")];
  const listB = [meme("post-1", "Cat meme", "dankmemes"), meme("post-3", "Bird meme", "dankmemes")];

  const result = dedupeMemes([listA, listB]);

  assert.deepEqual(
    result.map((m) => m.postLink),
    ["post-1", "post-2", "post-3"]
  );
});

test("dedupeMemes drops reposts with a matching title across batches, even with a different id", () => {
  const listA = [meme("post-1", "Same joke")];
  const listB = [meme("post-2", "  same joke  ")]; // repost, different post/id

  const result = dedupeMemes([listA, listB]);

  assert.equal(result.length, 1);
  assert.equal(result[0].postLink, "post-1");
});

test("dedupeMemes excludes anything already in seenHistory", () => {
  const seenHistory = [toHistoryEntry(meme("post-1", "Cat meme"))];
  const batch = [meme("post-1", "Cat meme"), meme("post-2", "Dog meme")];

  const result = dedupeMemes([batch], seenHistory);

  assert.deepEqual(
    result.map((m) => m.postLink),
    ["post-2"]
  );
});

test(`HISTORY_LIMIT is big enough to cover a full 10-subreddit x 50 batch`, () => {
  assert.ok(HISTORY_LIMIT >= 500, `expected HISTORY_LIMIT >= 500, got ${HISTORY_LIMIT}`);
});

test("shuffle returns a permutation of the input without mutating it", () => {
  const original = [1, 2, 3, 4, 5];
  const copy = [...original];

  const result = shuffle(original);

  assert.deepEqual(original, copy, "input array must not be mutated");
  assert.deepEqual([...result].sort(), [...original].sort());
});

test("shuffle actually reorders using the Fisher-Yates algorithm (deterministic randomFn)", () => {
  const input = [1, 2, 3, 4, 5];
  // Fixed sequence of "random" values, one consumed per swap.
  const values = [0.9, 0.1, 0.5, 0.0];
  let i = 0;
  const fakeRandom = () => values[i++];

  const result = shuffle(input, fakeRandom);

  // Manually replay the same Fisher-Yates steps to compute the expected result.
  const expected = [...input];
  let vi = 0;
  for (let idx = expected.length - 1; idx > 0; idx--) {
    const j = Math.floor(values[vi++] * (idx + 1));
    [expected[idx], expected[j]] = [expected[j], expected[idx]];
  }

  assert.deepEqual(result, expected);
});

test("formatBatchCounter zero-pads to 3 and 2 digits", () => {
  assert.equal(formatBatchCounter(7, 1), "007/01");
  assert.equal(formatBatchCounter(0, 1), "000/01");
});

test("formatBatchCounter widens instead of truncating past the padding width", () => {
  assert.equal(formatBatchCounter(1234, 5), "1234/05");
  assert.equal(formatBatchCounter(500, 123), "500/123");
});
