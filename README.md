# Udemy Deep Buffer

A tiny, build-free Chrome extension that asks Udemy's Shaka Player to maintain a larger rolling buffer. This makes forward seeking within the next two minutes much less likely to pause for loading.

## Install locally

1. Open `chrome://extensions` in Chrome.
2. Enable **Developer mode**.
3. Click **Load unpacked**.
4. Select this repository's directory.
5. Refresh an open Udemy course page.

Chrome keeps an unpacked extension installed across browser restarts. After editing its files, click the extension's **Reload** button on `chrome://extensions`, then refresh Udemy.

## Verify

On a Udemy course page, open DevTools and run:

```js
window.__udemy_deep_buffer__
```

It should return `120`. The extension also writes a confirmation to the page console.

Run the dependency-free self-check with:

```sh
node test.mjs
```

## Tune

Edit `BUFFER_AHEAD_SECONDS` near the top of `content.js`. `120` seconds is the tested default; `300` uses more bandwidth and memory. Browsers may evict old media segments, so trying to hold an entire long lecture in memory is not reliable.
