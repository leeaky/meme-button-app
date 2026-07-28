import { toHistoryEntry, pickFreshMeme } from "./meme-dedupe.js";

const button = document.getElementById("meme-button");
const image = document.getElementById("meme-image");
const title = document.getElementById("meme-title");
const credit = document.getElementById("meme-credit");
const errorMessage = document.getElementById("error-message");

const MEME_API_URL = "https://meme-api.com/gimme";

// How many of the most recently shown memes to avoid repeating.
const HISTORY_LIMIT = 10;
// How many times to retry if we keep landing on recently-shown memes.
const MAX_FETCH_ATTEMPTS = 8;
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

async function fetchOneMeme() {
  // Bust caching (browser and any intermediate proxy/CDN) so we don't get
  // served the exact same response for an identical GET URL.
  const url = `${MEME_API_URL}?_=${Date.now()}-${Math.random()}`;
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}`);
  }
  return response.json();
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
