# Meme Button

A tiny single-page app: click the button, get a new random meme. No build
step, no dependencies, no backend — just static HTML/CSS/JS.

## Features

- One button, one job: fetches a fresh random meme on every click.
- Shows the meme image, its title, and a subreddit/author credit line.
- Loading and error states, so a slow or failed request doesn't look broken.
- Light/dark styling that follows your system theme.
- Loads an initial meme automatically on page load.

## Run it locally

Clone the repo, then either open the file directly or serve it:

```sh
git clone https://github.com/leeaky/meme-button-app.git
cd meme-button-app
```

**Option A — just open it:**
Double-click `index.html`, or open it in your browser directly.

**Option B — serve it (recommended, avoids any local file/CORS quirks):**
```sh
python3 -m http.server 8000
```
Then visit http://localhost:8000.

## How it works

- `index.html` — page structure: a button, an image, a title, and a credit line.
- `style.css` — layout and theming (light/dark via `prefers-color-scheme`).
- `script.js` — on click (and once on load), fetches a random meme from the
  public [meme-api.com](https://meme-api.com) endpoint (`GET /gimme`), which
  returns JSON like:

  ```json
  {
    "title": "...",
    "url": "https://i.redd.it/...",
    "subreddit": "memes",
    "author": "..."
  }
  ```

  The app renders `url` as the image, `title` as the caption, and
  `subreddit`/`author` as the credit line. While a request is in flight the
  button is disabled and shows "Loading...". If the request fails, an error
  message is shown instead and the button re-enables so you can retry.

- **Repeat avoidance:** the API has no "exclude" parameter, so the app keeps
  a rolling list of the last 10 memes shown (in `sessionStorage`, so it
  survives a page refresh but clears when the tab closes). On each click it
  fetches a meme and, if it matches something in that recent list, quietly
  re-fetches (up to 8 attempts) until it finds one that isn't a repeat, or
  gives up and shows the last one it got.

## Deploying

This is a static site, so any static host works (GitHub Pages, Netlify,
Vercel, etc.) — just point it at the repo root, no build command needed.

**GitHub Pages:** requires the repository to be public (or a paid GitHub
plan for private repos). Once public, enable Pages under
Settings → Pages → Source, or use the included
`.github/workflows/deploy-pages.yml` workflow, which deploys automatically
on every push to `main`.

## Notes

- Memes are pulled live from meme-api.com, which in turn sources from public
  subreddits — content is not curated or filtered, so expect the usual
  variety (and occasional NSFW-adjacent posts) that come with random Reddit
  memes.
- No API key, sign-up, or configuration required.
