import {
  toHistoryEntry,
  pickFreshMeme,
  HISTORY_LIMIT,
  MAX_FETCH_ATTEMPTS,
} from "./meme-dedupe.js";

const button = document.getElementById("meme-button");
const image = document.getElementById("meme-image");
const title = document.getElementById("meme-title");
const credit = document.getElementById("meme-credit");
const errorMessage = document.getElementById("error-message");

const MEME_API_BASE = "https://meme-api.com/gimme";
// meme-api.com's default pool is a small fixed set of subreddits; widening
// it to a bigger, explicit list gives more distinct memes to draw from and
// makes repeats less likely.
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
const MEME_API_URL = `${MEME_API_BASE}/${MEME_SUBREDDITS.join("+")}`;

const HISTORY_KEY = "meme-button-history";

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

async function fetchOneMeme() {
  try {
    return await fetchJson(MEME_API_URL);
  } catch (error) {
    // Fall back to the API's own default pool in case the multi-subreddit
    // path above isn't supported.
    console.warn("Widened subreddit fetch failed, falling back to default pool:", error);
    return fetchJson(MEME_API_BASE);
  }
}

async function fetchMeme() {
  button.disabled = true;
  button.textContent = "Loading...";
  errorMessage.hidden = true;

  try {
    const history = getHistory();
    const { meme } = await pickFreshMeme(fetchOneMeme, history, MAX_FETCH_ATTEMPTS);

    image.src = meme.url;
    image.hidden = false;
    title.textContent = meme.title;
    credit.textContent = `r/${meme.subreddit} · posted by u/${meme.author}`;
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
