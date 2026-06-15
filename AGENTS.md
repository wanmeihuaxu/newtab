# Agent Instructions

## What this is

Chrome Manifest V3 extension that replaces the new tab page. Vue 3 single-component app (`src/App.vue`) with four Vite entry points: `index.html` (newtab page), `popup.html`, `src/background.js` (service worker), `src/content.js`.

## Build & run

```bash
npm install
npm run build        # outputs to dist/
npm run build:crx    # build + pack into newtab.crx (requires `crx` CLI)
npm run dev          # local dev server (serves pages but NOT as a Chrome extension)
```

**Important:** `npm run dev` is only useful for rapid UI iteration. To test actual extension behavior (chrome.storage, background script, content script), you must `npm run build` then load the `dist/` folder in `chrome://extensions/` as an unpacked extension.

## Vite quirk

The project overrides `vite` with `rolldown-vite@7.2.5` via `package.json` overrides. Don't swap it back to stock Vite without checking `vite.config.js` compatibility.

## Storage architecture

Two separate storage layers — do not confuse them:

- **chrome.storage.sync**: sites list, opacity settings. Use `chrome.storage.sync.get/set`.
- **localforage** (IndexedDB): large binary blobs — background images, site icon base64 data. Keys prefixed `icon-` are icon data. The key `backgroundImage` holds the current bg image URL/data.

Data export/import (`exportData` / `importData` in App.vue) serializes both stores into a single JSON file.

## Multi-entry build

The Vite config in `vite.config.js` defines explicit `rollupOptions.input` with four entries. `background.js` and `content.js` are output as plain `.js` (no hash), matching `manifest.json` references. If you add a new JS entry, update both `vite.config.js` input map and `public/manifest.json`.

## No test/lint/typecheck

There are no tests, linter, formatter, or typecheck scripts. CI is absent. After making changes, manually verify by building and loading the extension in Chrome.

## Icon generation

`npm run convert-icon` uses ImageMagick (`magick`) to resize `icon.png` into the four sizes under `public/`. Requires ImageMagick installed on the system.

## Code style

- All UI is in a single `App.vue` file (~700 lines) using `<script setup>` composition API.
- Comments are in Chinese — maintain that convention.
- No TypeScript, no CSS preprocessor, no component splitting.
