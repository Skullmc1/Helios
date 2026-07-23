chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({
      id: "helios-ask",
      title: "Helios",
      contexts: ["all"]
    });
  });
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId !== "helios-ask") return;

  const { apiKey } = await chrome.storage.local.get(['apiKey']);
  if (!apiKey) { chrome.action.openPopup(); return; }

  // Try to inject content script (works on normal web pages)
  try {
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ['content-script.js']
    });
    return;
  } catch (e) {
    // Injection failed — fall back to window-based approach (PDFs, chrome://, etc.)
  }

  // Fallback: capture, crop in a popup window, process, show result
  try {
    const dataUrl = await chrome.tabs.captureVisibleTab(tab.windowId, { format: 'png' });
    const key = 'fallback_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
    await chrome.storage.local.set({ [key]: dataUrl });
    await chrome.windows.create({
      url: chrome.runtime.getURL('cropper/cropper.html') + `?key=${key}`,
      type: 'popup', width: 900, height: 700
    });
  } catch (err) {
    console.error('Helios fallback failed:', err);
  }
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'captureAndProcess') {
    handleCaptureAndProcess(request, sender)
      .then(sendResponse)
      .catch(err => sendResponse({ success: false, error: err.message }));
    return true;
  }

  if (request.action === 'processImage') {
    handleProcessImage(request)
      .then(text => sendResponse({ success: true, text }))
      .catch(err => sendResponse({ success: false, error: err.message }));
    return true;
  }

  if (request.action === 'validateApiKey') {
    validateGroqKey(request.apiKey).then(valid => sendResponse({ valid }));
    return true;
  }
});

const DEFAULT_PROMPT = 'Explain this content like you\'re teaching a student. Break down complex ideas, define unfamiliar terms, and highlight key takeaways.';

async function getPrompt() {
  const { prompt } = await chrome.storage.local.get(['prompt']);
  return (prompt || DEFAULT_PROMPT).trim();
}

async function handleCaptureAndProcess(request, sender) {
  const tab = sender.tab;
  if (!tab) throw new Error('No tab context');

  const { apiKey } = await chrome.storage.local.get(['apiKey']);
  if (!apiKey) throw new Error('API key not configured');

  const prompt = await getPrompt();
  const dataUrl = await chrome.tabs.captureVisibleTab(tab.windowId, { format: 'png' });
  const cropped = await cropImage(dataUrl, request.coords, request.dpr);
  return { success: true, text: await queryGroq(cropped, prompt, apiKey) };
}

async function handleProcessImage(request) {
  const { apiKey } = await chrome.storage.local.get(['apiKey']);
  if (!apiKey) throw new Error('API key not configured');

  const prompt = await getPrompt();
  return await queryGroq(request.imageData, prompt, apiKey);
}

async function cropImage(dataUrl, coords, dpr) {
  const resp = await fetch(dataUrl);
  const img = await createImageBitmap(await resp.blob());
  const x = Math.round(coords.x * dpr);
  const y = Math.round(coords.y * dpr);
  const w = Math.round(coords.width * dpr);
  const h = Math.round(coords.height * dpr);
  const canvas = new OffscreenCanvas(Math.max(1, w), Math.max(1, h));
  canvas.getContext('2d').drawImage(img, x, y, w, h, 0, 0, w, h);
  const blob = await canvas.convertToBlob({ type: 'image/png' });
  const bytes = new Uint8Array(await blob.arrayBuffer());
  let bin = '';
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return 'data:image/png;base64,' + btoa(bin);
}

async function queryGroq(imageBase64, prompt, apiKey) {
  const resp = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: 'qwen/qwen3.6-27b',
      messages: [{ role: 'user', content: [{ type: 'text', text: prompt }, { type: 'image_url', image_url: { url: imageBase64 } }] }],
      max_tokens: 4096
    })
  });

  if (!resp.ok) {
    let msg;
    try { const e = await resp.json(); msg = e.error?.message || e.error || resp.statusText; }
    catch { msg = await resp.text(); }
    throw new Error(`API error (${resp.status}): ${msg}`);
  }

  return (await resp.json()).choices[0].message.content;
}

async function validateGroqKey(apiKey) {
  try {
    return (await fetch('https://api.groq.com/openai/v1/models', { headers: { 'Authorization': `Bearer ${apiKey}` } })).ok;
  } catch { return false; }
}
