import {
  buildPool,
  shuffle,
  toHistoryEntry,
  formatBatchCounter,
  HISTORY_LIMIT,
  MIN_BATCH_SIZE,
} from "./meme-dedupe.js";

const button = document.getElementById("meme-button");
const image = document.getElementById("meme-image");
const title = document.getElementById("meme-title");
const credit = document.getElementById("meme-credit");
const errorMessage = document.getElementById("error-message");
const batchCounter = document.getElementById("batch-counter");

const MEME_API_BASE = "https://meme-api.com/gimme";
// meme-api.com's default pool is just 'memes', 'dankmemes' and 'me_irl'.
// Pulling a batch from each of a wider set of subreddits (the API's
// documented max per request) gives a much bigger local pool to draw from.
const MEME_SUBREDDITS = [
  "memes",
  "dankmemes",
  "wholesomememes",
  "me_irl",
  "ProgrammerHumor",
  "funny",
  "AdviceAnimals",
  "comedyheaven",
  "terriblefacebookmemes",
  "MemeEconomy",
];
const BATCH_SIZE_PER_SUBREDDIT = 50; // meme-api.com's documented max per request
const HISTORY_KEY = "meme-button-history";

// The current batch of memes, in a fixed (shuffled once) serve order, plus
// how far through it we are. Serving sequentially - rather than asking the
// API for one random meme at a time - means no repeats until this whole
// batch is exhausted, rather than hoping a random pick avoids a collision.
let pool = [];
let poolIndex = 0;
let batchNumber = 0;

function getHistory() {
  try {
    return JSON.parse(sessionStorage.getItem(HISTORY_KEY)) || [];
  } catch {
    return [];
  }
}

function rememberMeme(meme) {
  const history = getHistory();
  history.push(toHistoryEntry(meme));
  while (history.length > HISTORY_LIMIT) {
    history.shift();
  }
  sessionStorage.setItem(HISTORY_KEY, JSON.stringify(history));
}

async function fetchJson(url) {
  // Bust caching (browser and any intermediate proxy/CDN) so we don't get
  // served the exact same response for an identical GET URL.
  const bustedUrl = `${url}?_=${Date.now()}-${Math.random()}`;
  const response = await fetch(bustedUrl, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}`);
  }
  return response.json();
}

async function fetchSubredditBatch(subreddit) {
  const data = await fetchJson(`${MEME_API_BASE}/${subreddit}/${BATCH_SIZE_PER_SUBREDDIT}`);
  return Array.isArray(data.memes) ? data.memes : [];
}

async function refillPool() {
  const results = await Promise.allSettled(MEME_SUBREDDITS.map(fetchSubredditBatch));
  const lists = results.filter((r) => r.status === "fulfilled").map((r) => r.value);

  let deduped = buildPool(lists, getHistory(), MIN_BATCH_SIZE);

  if (deduped.length === 0) {
    // Last resort: a single random meme from the API's own default pool.
    const fallback = await fetchJson(MEME_API_BASE);
    deduped = [fallback];
  }

  pool = shuffle(deduped);
  poolIndex = 0;
  batchNumber += 1;
  console.info(
    `Loaded a fresh batch of ${pool.length} memes across ${MEME_SUBREDDITS.length} subreddits.`
  );
}

async function fetchMeme() {
  button.disabled = true;
  button.textContent = "Loading...";
  errorMessage.hidden = true;

  try {
    if (poolIndex >= pool.length) {
      await refillPool();
    }

    const meme = pool[poolIndex];
    poolIndex += 1;

    image.src = meme.url;
    image.hidden = false;
    title.textContent = meme.title;
    credit.textContent = `r/${meme.subreddit} · posted by u/${meme.author}`;
    batchCounter.textContent = formatBatchCounter(poolIndex, batchNumber);
    rememberMeme(meme);
  } catch (error) {
    console.error("Failed to fetch meme:", error);
    errorMessage.textContent = "Couldn't load a meme right now. Try again.";
    errorMessage.hidden = false;
  } finally {
    button.disabled = false;
    button.textContent = "Show me another meme";
  }
}

button.addEventListener("click", fetchMeme);

fetchMeme();
