# Helios

A browser extension for Chrome and Firefox that lets you select any area on a page and get an AI explanation — like having a tutor inside your right-click menu.

![icon](icons/icon128.png)

## How it works

1. **Right-click** any page → select **Helios**
2. A semi-transparent overlay appears with a blue glow border
3. **Drag** to select the area you want explained
4. Release — the selection auto-sends to Groq AI
5. A floating card slides in with the response

## Features

- **In-page overlay** — select directly on the live page, no popup windows
- **Custom prompt** — set your own prompt in the popup (default: study-style explanations)
- **Markdown rendering** — bold, code blocks, headers, and links in responses
- **Thought process toggle** — collapsible `<think>` section for model reasoning
- **Copy button** — one-click copy on every response
- **PDF support** — falls back to a window-based cropper when content scripts can't inject
- **Void theme** — pure black, lime accent, frosted glass cards

## Setup

1. Get a free API key at [console.groq.com](https://console.groq.com)
2. Click the Helios icon in your toolbar
3. Enter your `gsk_...` key and optional custom prompt
4. Right-click any page to start

## Install

### Chrome
1. Go to `chrome://extensions`
2. Enable **Developer mode**
3. Click **Load unpacked** → select the `Helios` folder
4. For permanent use, zip the folder and publish to the Chrome Web Store

### Firefox
1. Go to `about:debugging#/runtime/this-firefox`
2. Click **Load Temporary Add-on** → select `manifest.json`
3. For permanent use, zip the folder and submit to [addons.mozilla.org](https://addons.mozilla.org)

### Files

```
Helios/
├── manifest.json          # Firefox (background.scripts)
├── manifest1.json         # Chrome (background.service_worker)
├── background.js          # Service worker — injects content script, captures, crops, API
├── content-script.js      # In-page overlay, drag selection, result card (shadow DOM)
├── cropper/               # Fallback cropper for PDFs/restricted pages
├── popup/                 # API key and prompt settings
├── result/                # Fallback result window
└── icons/                 # Planet icon in lime on transparent
```

## Data

- **Screenshots** — captured when you select an area, sent to Groq API for analysis, not stored
- **API key** — stored locally via `chrome.storage`, never transmitted anywhere except to Groq
- **No analytics, no telemetry, no tracking**
