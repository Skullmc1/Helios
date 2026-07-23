const params = new URLSearchParams(location.search);
const key = params.get('key');
const isError = params.has('error');

const loading = document.getElementById('loading');
const respEl = document.getElementById('response');
const errEl = document.getElementById('error');
const closeBtn = document.getElementById('close');

closeBtn.addEventListener('click', () => window.close());

// Dragging
let dragging = false, dx = 0, dy = 0, wx = 0, wy = 0;
const hdr = document.getElementById('hdr');
hdr.addEventListener('mousedown', (e) => {
  dragging = true; dx = e.screenX; dy = e.screenY;
  wx = window.screenX; wy = window.screenY;
  e.preventDefault();
});
document.addEventListener('mousemove', (e) => {
  if (!dragging) return;
  window.moveTo(wx + e.screenX - dx, wy + e.screenY - dy);
});
document.addEventListener('mouseup', () => { dragging = false; });

function renderText(text, isErr) {
  loading.style.display = 'none';
  if (isErr) { errEl.style.display = 'block'; errEl.textContent = text; return; }

  const match = text.match(/<think>([\s\S]*?)<\/think>([\s\S]*)/);
  if (match) {
    const thought = match[1].trim();
    const main = match[2].trim();

    const section = document.createElement('div');
    const toggle = document.createElement('div');
    toggle.className = 'think-toggle'; toggle.tabIndex = 0;
    const arrow = document.createElement('span');
    arrow.className = 'think-arrow'; arrow.textContent = '\u25B6';
    const label = document.createElement('span');
    label.textContent = 'Thought Process';
    toggle.appendChild(arrow); toggle.appendChild(label);

    const content = document.createElement('div');
    content.className = 'think-content'; content.textContent = thought;
    toggle.addEventListener('click', () => {
      content.classList.toggle('open');
      arrow.classList.toggle('open');
    });

    section.appendChild(toggle); section.appendChild(content);

    const mainDiv = document.createElement('div');
    mainDiv.className = 'main-response'; mainDiv.textContent = main;

    respEl.style.display = 'block';
    respEl.appendChild(section);
    respEl.appendChild(mainDiv);
  } else {
    respEl.style.display = 'block';
    respEl.textContent = text;
  }
}

if (key) {
  chrome.storage.local.get([key]).then(r => {
    const text = r[key];
    if (text) renderText(text, isError);
    else { loading.style.display = 'none'; errEl.style.display = 'block'; errEl.textContent = 'Response data not found.'; }
    chrome.storage.local.remove([key]);
  }).catch(err => {
    loading.style.display = 'none'; errEl.style.display = 'block';
    errEl.textContent = 'Error: ' + err.message;
  });
} else {
  loading.style.display = 'none'; errEl.style.display = 'block';
  errEl.textContent = 'No response data provided.';
}
