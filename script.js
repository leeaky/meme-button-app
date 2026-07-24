const button = document.getElementById("meme-button");
const image = document.getElementById("meme-image");
const title = document.getElementById("meme-title");
const credit = document.getElementById("meme-credit");
const errorMessage = document.getElementById("error-message");

const MEME_API_URL = "https://meme-api.com/gimme";

async function fetchMeme() {
  button.disabled = true;
  button.textContent = "Loading...";
  errorMessage.hidden = true;

  try {
    const response = await fetch(MEME_API_URL);
    if (!response.ok) {
      throw new Error(`Request failed with status ${response.status}`);
    }
    const meme = await response.json();

    image.src = meme.url;
    image.hidden = false;
    title.textContent = meme.title;
    credit.textContent = `r/${meme.subreddit} · posted by u/${meme.author}`;
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
