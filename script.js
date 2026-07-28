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

function rememberMeme(id) {
  const history = getHistory();
  history.push(id);
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
    let meme;
    for (let attempt = 0; attempt < MAX_FETCH_ATTEMPTS; attempt++) {
      meme = await fetchOneMeme();
      const id = meme.postLink || meme.url;
      if (!history.includes(id)) {
        break;
      }
    }

    image.src = meme.url;
    image.hidden = false;
    title.textContent = meme.title;
    credit.textContent = `r/${meme.subreddit} · posted by u/${meme.author}`;
    rememberMeme(meme.postLink || meme.url);
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
