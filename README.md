# Meme Button

A tiny single-page app: click the button, get a new random meme. No build
step, no dependencies, no backend — just static HTML/CSS/JS.

## Features

- One button, one job: fetches a fresh random meme on every click.
- Shows the meme image, its title, and a subreddit/author credit line.
- Loading and error states, so a slow or failed request doesn't look broken.
- Light/dark styling that follows your system theme.
- Loads an initial meme automatically on page load.
- A discreet `xxx/bb` counter in the bottom-right corner: how many memes
  shown from the current batch, and which batch number it is.

## Run it locally

Clone the repo, then serve it:

```sh
git clone https://github.com/leeaky/meme-button-app.git
cd meme-button-app
python3 -m http.server 8000
```

Then visit http://localhost:8000. `script.js` is loaded as an ES module, so
it needs to come from an actual `http://` origin — opening `index.html`
directly via `file://` will fail in most browsers (module scripts are
blocked by CORS on the `file://` protocol).

## How it works

- `index.html` — page structure: a button, an image, a title, and a credit line.
- `style.css` — layout and theming (light/dark via `prefers-color-scheme`).
- `meme-dedupe.js` — pure, DOM-free pool/dedup logic (see below), imported
  by `script.js` and covered by the tests in `tests/`.
- `script.js` — pulls memes from the public [meme-api.com](https://meme-api.com)
  API and serves them one at a time from a local pool:

  1. On first click (and whenever the pool runs out), it fetches a batch of
     up to 50 memes from each of 54 subreddits in parallel — general, wholesome,
     relatable, anime, programmer/tech, games, movie/TV, history, sports,
     and absurdist/low-effort humor — via meme-api.com's documented
     `GET /gimme/{subreddit}/{count}` endpoint (50 is its max per request)
     — up to ~2700 memes total. Each request is individually capped at 10s
     (`fetch` has no built-in timeout), so one slow/hanging subreddit can't
     stall the whole refill.
  2. The batches are combined and deduped (dropping anything that's the same
     post, or has the same title, as something already in the batch or
     already shown this session), then shuffled once.
  3. Each click serves the next meme from that shuffled pool, in sequence —
     rather than asking the API for one random meme per click, which risks
     landing on something already shown. A batch of ~2700 only needs
     refilling roughly every 2700 clicks.
  4. On refill, subreddit "hot" listings don't change every request, so
     fetching again soon after exhausting a batch can mostly return the same
     posts. If deduping against session history would leave fewer than 20
     memes, that's treated as "the content hasn't refreshed yet" rather than
     something to retry into oblivion — the new batch is deduped only
     against itself instead, accepting repeats of older history rather than
     collapsing down to a batch of 1.
  5. If every subreddit fetch fails outright, it falls back to the API's own
     default `/gimme` (single random meme, no dedup) as a last resort.

  Either way, a meme object looks like:

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
  button is disabled and shows "Loading...". If everything fails, an error
  message is shown instead and the button re-enables so you can retry.
  Open the browser console to see how many memes actually landed in each
  batch (`Loaded a fresh batch of N memes across 15 subreddits`) - or just
  glance at the bottom-right corner, which shows the same thing live as
  `xxx/bb` (memes shown from the current batch / batch number).

## Tests

The pool/dedup logic (`meme-dedupe.js`) is covered by tests using Node's
built-in test runner — no dependencies to install:

```sh
npm test
```

This checks title/id matching, that deduping across subreddit batches (and
against what's already been shown) works, and that the shuffle is a correct,
non-mutating permutation.

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
