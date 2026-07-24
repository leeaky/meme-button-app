# Meme Button

A tiny single-page app: click the button, get a new random meme.

## Run it

No build step or dependencies. Just open `index.html` in a browser, or serve
the folder locally:

```sh
python3 -m http.server 8000
```

Then visit http://localhost:8000.

## How it works

Fetches a random meme from the public [meme-api.com](https://meme-api.com)
endpoint (`/gimme`) each time the button is clicked, and displays the image,
title, and subreddit/author credit.
