const params = new URLSearchParams(location.search);
const imageKey = params.get('key');
if (!imageKey) { document.body.innerHTML = '<p style="color:#ef4444;padding:20px">Error: No screenshot data.</p>'; throw new Error('Missing key'); }

let selecting = false, hasSel = false, sx = 0, sy = 0, ex = 0, ey = 0, scaleX = 1, scaleY = 1;

const img = document.getElementById('screenshot');
const wrapper = document.getElementById('wrapper');
const selBox = document.getElementById('sel-box');
const selLabel = document.getElementById('sel-label');
const confirmBtn = document.getElementById('confirm-btn');
const cancelBtn = document.getElementById('cancel-btn');
const toolbar = document.getElementById('toolbar');
const container = document.getElementById('container');
const resultView = document.getElementById('result-view');
const resultBody = document.getElementById('result-body');
const resultClose = document.getElementById('result-close');
const resultHdr = document.getElementById('result-hdr');

cancelBtn.addEventListener('click', () => window.close());
confirmBtn.addEventListener('click', () => { if (hasSel) cropAndSend(); });
resultClose.addEventListener('click', () => window.close());

chrome.storage.local.get([imageKey]).then(r => {
  const d = r[imageKey];
  if (!d) { document.body.innerHTML = '<p style="color:#ef4444;padding:20px">Screenshot expired.</p>'; return; }
  img.src = d;
  chrome.storage.local.remove([imageKey]);
});

img.addEventListener('load', () => {
  const cr = document.getElementById('container').getBoundingClientRect();
  const pad = 20, mw = cr.width - pad*2, mh = cr.height - pad*2;
  let w = img.naturalWidth, h = img.naturalHeight;
  if (w > mw) { h = h*mw/w; w = mw; }
  if (h > mh) { w = w*mh/h; h = mh; }
  img.style.width = Math.round(w)+'px';
  img.style.height = Math.round(h)+'px';
  scaleX = img.naturalWidth / img.width;
  scaleY = img.naturalHeight / img.height;
});

wrapper.addEventListener('mousedown', (e) => {
  if (e.button !== 0) return;
  e.preventDefault();
  selecting = true; hasSel = false; confirmBtn.disabled = true;
  const r = wrapper.getBoundingClientRect();
  sx = e.clientX - r.left; sy = e.clientY - r.top;
  ex = sx; ey = sy;
  selBox.style.display = 'block';
  selBox.style.left = sx+'px'; selBox.style.top = sy+'px';
  selBox.style.width = '0px'; selBox.style.height = '0px';
});

document.addEventListener('mousemove', (e) => {
  if (!selecting) return;
  const r = wrapper.getBoundingClientRect();
  ex = Math.max(0, Math.min(e.clientX - r.left, wrapper.offsetWidth));
  ey = Math.max(0, Math.min(e.clientY - r.top, wrapper.offsetHeight));
  updateSel();
});

document.addEventListener('mouseup', () => {
  if (!selecting) return;
  selecting = false;
  const w = Math.abs(ex-sx), h = Math.abs(ey-sy);
  hasSel = w > 5 && h > 5;
  confirmBtn.disabled = !hasSel;
  if (!hasSel) { selBox.style.display = 'none'; selLabel.style.display = 'none'; }
});

function updateSel() {
  const l = Math.min(sx,ex), t = Math.min(sy,ey), w = Math.abs(ex-sx), h = Math.abs(ey-sy);
  selBox.style.left = l+'px'; selBox.style.top = t+'px';
  selBox.style.width = w+'px'; selBox.style.height = h+'px';
  if (w > 0 && h > 0) {
    selLabel.textContent = `${Math.round(w*scaleX)} × ${Math.round(h*scaleY)} px`;
    selLabel.style.display = 'block';
  }
}

function renderMarkdown(txt) {
  let h = txt.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  h = h.replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>');
  h = h.replace(/`([^`]+)`/g, '<code>$1</code>');
    h = h.replace(/^### (.+)$/gm, '<h3>$1</h3>');
    h = h.replace(/^## (.+)$/gm, '<h2>$1</h2>');
    h = h.replace(/^# (.+)$/gm, '<h1>$1</h1>');
    h = h.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    h = h.replace(/\*([^*]+)\*/g, '<em>$1</em>');
    h = h.replace(/\n/g, '<br>');
  return h;
}

function showResult(text, isError) {
  toolbar.style.display = 'none';
  container.style.display = 'none';
  resultView.style.display = 'flex';

  if (isError) { resultBody.textContent = text; return; }

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
    content.className = 'think-content'; content.innerHTML = renderMarkdown(thought);
    toggle.addEventListener('click', () => { content.classList.toggle('open'); arrow.classList.toggle('open'); });

    section.appendChild(toggle); section.appendChild(content);

    const mainDiv = document.createElement('div');
    mainDiv.className = 'main-response'; mainDiv.innerHTML = renderMarkdown(main);

    resultBody.appendChild(section);
    resultBody.appendChild(mainDiv);
  } else {
    resultBody.innerHTML = renderMarkdown(text);
  }

  const copyBtn = document.createElement('button');
  copyBtn.className = 'copy-btn';
  copyBtn.textContent = 'Copy';
  copyBtn.addEventListener('click', () => {
    navigator.clipboard.writeText(text).then(() => {
      copyBtn.textContent = 'Copied';
      copyBtn.classList.add('copied');
      setTimeout(() => { copyBtn.textContent = 'Copy'; copyBtn.classList.remove('copied'); }, 2000);
    });
  });
  resultBody.appendChild(copyBtn);
}

function cropAndSend() {
  const l = Math.min(sx,ex), t = Math.min(sy,ey), w = Math.abs(ex-sx), h = Math.abs(ey-sy);
  const sx2 = Math.round(l*scaleX), sy2 = Math.round(t*scaleY), sw = Math.round(w*scaleX), sh = Math.round(h*scaleY);
  const canvas = document.createElement('canvas');
  canvas.width = sw; canvas.height = sh;
  canvas.getContext('2d').drawImage(img, sx2, sy2, sw, sh, 0, 0, sw, sh);
  const cropped = canvas.toDataURL('image/png');

  confirmBtn.disabled = true; confirmBtn.textContent = 'Processing...';
  chrome.runtime.sendMessage({ action: 'processImage', imageData: cropped, prompt: 'Explain this in short' }, (resp) => {
    if (resp?.success) {
      showResult(resp.text);
    } else {
      showResult(resp?.error || 'Request failed', true);
    }
  });
}

/* ─── drag result view ─── */
let dragActive = false, dsx = 0, dsy = 0, wsx = 0, wsy = 0;
resultHdr.addEventListener('mousedown', (e) => {
  if (e.target.tagName === 'BUTTON') return;
  dragActive = true; dsx = e.screenX; dsy = e.screenY;
  wsx = window.screenX; wsy = window.screenY;
  e.preventDefault();
});
document.addEventListener('mousemove', (e) => {
  if (!dragActive) return;
  window.moveTo(wsx + e.screenX - dsx, wsy + e.screenY - dsy);
});
document.addEventListener('mouseup', () => { dragActive = false; });
