const keyInput = document.getElementById('api-key');
const promptInput = document.getElementById('prompt');
const saveBtn = document.getElementById('save-btn');
const clearBtn = document.getElementById('clear-btn');
const statusEl = document.getElementById('status');

const DEFAULT_PROMPT = 'Explain this content like you\'re teaching a student. Break down complex ideas, define unfamiliar terms, and highlight key takeaways.';

function showStatus(msg, type) {
  statusEl.textContent = msg;
  statusEl.className = type;
}

chrome.storage.local.get(['apiKey', 'prompt']).then(({ apiKey, prompt }) => {
  if (apiKey) {
    keyInput.value = apiKey;
    showStatus('API key is configured.', 'info');
  }
  promptInput.value = prompt || DEFAULT_PROMPT;
});

saveBtn.addEventListener('click', () => {
  const key = keyInput.value.trim();
  const prompt = promptInput.value.trim();

  if (!key) {
    showStatus('Please enter an API key.', 'error');
    return;
  }
  if (!key.startsWith('gsk_')) {
    showStatus('Key should start with "gsk_". Get one at console.groq.com.', 'error');
    return;
  }

  saveBtn.disabled = true;
  saveBtn.textContent = 'Validating...';

  chrome.runtime.sendMessage({ action: 'validateApiKey', apiKey: key }, (response) => {
    saveBtn.disabled = false;
    saveBtn.textContent = 'Save';
    if (response?.valid) {
      chrome.storage.local.set({ apiKey: key, prompt }).then(() => {
        showStatus('Saved successfully!', 'success');
      }).catch(() => {
        showStatus('Failed to save.', 'error');
      });
    } else {
      showStatus('Invalid API key.', 'error');
    }
  });
});

clearBtn.addEventListener('click', () => {
  chrome.storage.local.remove(['apiKey', 'prompt']).then(() => {
    keyInput.value = '';
    promptInput.value = DEFAULT_PROMPT;
    showStatus('Cleared.', 'info');
  }).catch(() => {
    showStatus('Failed to clear.', 'error');
  });
});
