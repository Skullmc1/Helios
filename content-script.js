(() => {
  const existing = document.querySelector('[id^="helios_host_"]');
  if (existing) existing.remove();

  const uid = Math.random().toString(36).slice(2, 8);

  let selecting = false;
  let hasSel = false;
  let sx = 0, sy = 0, ex = 0, ey = 0;
  const dpr = window.devicePixelRatio || 1;

  const host = document.createElement('div');
  host.id = 'helios_host_' + uid;
  host.style.cssText = 'all:initial;position:fixed;top:0;left:0;width:100vw;height:100vh;z-index:2147483647;pointer-events:none;display:block';

  const root = host.attachShadow({ mode: 'closed' });

  root.innerHTML = `
<style>
  *, *::before, *::after { box-sizing:border-box; margin:0; padding:0; }

  @keyframes pulse-border {
    0%, 100% { border-color:rgba(132,204,22,0.5); }
    50% { border-color:rgba(132,204,22,0.2); }
  }
  @keyframes slide-in {
    from { opacity:0; transform:translateX(20px) scale(0.96); }
    to { opacity:1; transform:translateX(0) scale(1); }
  }
  @keyframes fade-in {
    from { opacity:0; }
    to { opacity:1; }
  }

  .overlay {
    position:fixed; top:0; left:0; right:0; bottom:0;
    pointer-events:auto; cursor:crosshair;
    background:rgba(0,0,0,0.55);
    backdrop-filter:blur(1.5px);
    -webkit-backdrop-filter:blur(1.5px);
    animation:fade-in 0.2s ease;
  }

  .sel-box {
    position:fixed; top:0; left:0;
    pointer-events:none; display:none; z-index:1;
    border:1.5px solid #84cc16;
    background:rgba(132,204,22,0.04);
    box-shadow:
      0 0 0 9999px rgba(0,0,0,0.55),
      0 0 24px -4px rgba(132,204,22,0.15);
    animation:pulse-border 2s ease-in-out infinite;
  }
  .sel-box .corner {
    position:absolute;
    width:8px; height:8px;
    background:#84cc16;
    border-radius:1px;
  }
  .sel-box .corner.tl { top:-4px; left:-4px; }
  .sel-box .corner.tr { top:-4px; right:-4px; }
  .sel-box .corner.bl { bottom:-4px; left:-4px; }
  .sel-box .corner.br { bottom:-4px; right:-4px; }
  .sel-box .corner-label {
    position:absolute; bottom:-32px; left:50%; transform:translateX(-50%);
    background:#18181b; color:#a1a1aa;
    font:11px/1.4 system-ui,sans-serif;
    padding:3px 10px; border-radius:6px; white-space:nowrap;
    border:1px solid #27272a; pointer-events:none;
    animation:fade-in 0.15s ease;
  }

  .float-card {
    position:fixed; top:24px; right:24px; width:370px; max-height:440px;
    background:rgba(24,24,27,0.96);
    backdrop-filter:blur(16px);
    -webkit-backdrop-filter:blur(16px);
    border:1px solid #27272a;
    border-radius:12px;
    box-shadow:0 12px 48px -8px rgba(0,0,0,0.8), 0 0 0 1px rgba(132,204,22,0.06);
    z-index:2;
    display:none; pointer-events:auto;
    font:13.5px/1.7 system-ui,-apple-system,sans-serif; color:#fafafa;
    overflow:hidden; flex-direction:column;
    animation:slide-in 0.25s cubic-bezier(0.16,1,0.3,1);
  }
  .float-card .hdr {
    display:flex; align-items:center; justify-content:space-between;
    padding:10px 14px; background:rgba(0,0,0,0.3);
    border-bottom:1px solid #27272a;
    cursor:move; user-select:none; flex-shrink:0;
  }
  .float-card .hdr .ttl {
    font-size:12px; font-weight:600; letter-spacing:0.3px;
    color:#84cc16;
  }
  .float-card .hdr .ttl::before { content:''; display:inline-block; width:6px; height:6px; border-radius:50%; background:#84cc16; margin-right:8px; vertical-align:middle; box-shadow:0 0 8px rgba(132,204,22,0.4); }
  .float-card .hdr .close {
    background:none; border:none; color:#52525b; font:18px/1 system-ui;
    cursor:pointer; padding:2px 4px; border-radius:4px; transition:all 0.15s;
  }
  .float-card .hdr .close:hover { color:#fafafa; background:rgba(255,255,255,0.06); }
  .float-card .body {
    padding:14px; overflow-y:auto; flex:1;
    word-wrap:break-word;
    font-size:13.5px; line-height:1.75;
    color:#d4d4d8;
  }
  .float-card .body::-webkit-scrollbar { width:4px; }
  .float-card .body::-webkit-scrollbar-thumb { background:#27272a; border-radius:2px; }
  .float-card .body::-webkit-scrollbar-track { background:transparent; }

  .float-card .body.loading {
    display:flex; align-items:center; gap:12px;
    color:#52525b; font-size:13px;
    min-height:60px; justify-content:center;
  }
  .spinner {
    width:14px; height:14px;
    border:2px solid #27272a;
    border-top-color:#84cc16;
    border-radius:50%;
    animation:spin 0.7s linear infinite;
  }
  @keyframes spin { to { transform:rotate(360deg); } }
  .float-card .body.err { color:#ef4444; }

  .think-toggle {
    cursor:pointer; user-select:none;
    padding:7px 10px; margin-bottom:10px;
    color:#a1a1aa; font-size:12px; font-weight:500; letter-spacing:0.2px;
    display:flex; align-items:center; gap:8px;
    background:rgba(132,204,22,0.06); border:1px solid rgba(132,204,22,0.12);
    border-radius:8px; transition:all 0.15s;
  }
  .think-toggle:hover {
    background:rgba(132,204,22,0.1);
    border-color:rgba(132,204,22,0.2);
  }
  .think-arrow {
    transition:transform 0.2s cubic-bezier(0.16,1,0.3,1);
    font-size:8px; display:inline-flex; color:#84cc16;
  }
  .think-arrow.open { transform:rotate(90deg); }
  .think-content {
    display:none;
    background:rgba(0,0,0,0.25); border-radius:8px;
    padding:12px 14px; margin-bottom:12px;
    font-size:12.5px; color:#71717a; line-height:1.7;
    white-space:pre-wrap; border:1px solid #27272a;
  }
  .think-content.open { display:block; }
  .main-response { font-size:13.5px; line-height:1.75; color:#d4d4d8; }

  .main-response code {
    padding:1px 5px; background:#18181b; border-radius:4px;
    font-size:12.5px; color:#a3e635; font-family:'SF Mono','Fira Code','Cascadia Code',monospace;
  }
  .main-response pre {
    margin:8px 0; padding:12px 14px;
    background:#18181b; border-radius:8px; overflow-x:auto;
    border:1px solid #27272a;
  }
  .main-response pre code { padding:0; background:none; color:#d4d4d8; }
  .main-response h1, .main-response h2, .main-response h3 { color:#fafafa; font-weight:600; margin:12px 0 6px; line-height:1.3; }
  .main-response h1 { font-size:16px; }
  .main-response h2 { font-size:14.5px; }
  .main-response h3 { font-size:13.5px; }
  .main-response strong { color:#fafafa; }

  .copy-btn {
    position:absolute; bottom:14px; right:14px;
    background:rgba(255,255,255,0.04); border:1px solid #27272a;
    color:#52525b; font-size:11px; padding:5px 10px;
    border-radius:6px; cursor:pointer; transition:all 0.15s;
    line-height:1;
  }
  .copy-btn:hover { background:rgba(132,204,22,0.1); color:#84cc16; border-color:rgba(132,204,22,0.3); }
  .copy-btn.copied { background:rgba(132,204,22,0.15); color:#84cc16; border-color:rgba(132,204,22,0.3); }
</style>

<div class="overlay" id="overlay">
  <div class="sel-box" id="selBox">
    <span class="corner tl"></span>
    <span class="corner tr"></span>
    <span class="corner bl"></span>
    <span class="corner br"></span>
    <span class="corner-label" id="selLabel"></span>
  </div>
</div>

<div class="float-card" id="resultCard">
  <div class="hdr" id="dragHandle">
    <span class="ttl">Helios</span>
    <button class="close" id="closeBtn">&times;</button>
  </div>
  <div class="body" id="cardBody"></div>
</div>
`;

  const overlay = root.getElementById('overlay');
  const selBox = root.getElementById('selBox');
  const selLabel = root.getElementById('selLabel');
  const resultCard = root.getElementById('resultCard');
  const cardBody = root.getElementById('cardBody');
  const closeBtn = root.getElementById('closeBtn');
  const dragHandle = root.getElementById('dragHandle');

  document.documentElement.appendChild(host);

  function getPos(e) {
    return { x: e.clientX, y: e.clientY };
  }

  overlay.addEventListener('mousedown', (e) => {
    if (e.button !== 0) return;
    e.preventDefault();
    selecting = true; hasSel = false;
    const p = getPos(e);
    sx = p.x; sy = p.y; ex = p.x; ey = p.y;
    selBox.style.display = 'block';
    selBox.style.left = sx + 'px';
    selBox.style.top = sy + 'px';
    selBox.style.width = '0px';
    selBox.style.height = '0px';
  });

  document.addEventListener('mousemove', (e) => {
    if (!selecting) return;
    const p = getPos(e);
    ex = Math.max(0, p.x);
    ey = Math.max(0, p.y);
    updateSel();
  });

  document.addEventListener('mouseup', () => {
    if (!selecting) return;
    selecting = false;

    const w = Math.abs(ex - sx);
    const h = Math.abs(ey - sy);
    hasSel = w > 5 && h > 5;

    if (!hasSel) {
      selBox.style.display = 'none';
      selLabel.style.display = 'none';
      return;
    }

    const left = Math.min(sx, ex);
    const top = Math.min(sy, ey);

    overlay.style.display = 'none';

    showLoading();
    chrome.runtime.sendMessage({
      action: 'captureAndProcess',
      coords: { x: left, y: top, width: w, height: h },
      dpr: dpr
    }, (resp) => {
      if (resp?.success) {
        showResult(resp.text);
      } else {
        showResult(resp?.error || 'Request failed', true);
      }
    });
  });

  function updateSel() {
    const left = Math.min(sx, ex);
    const top = Math.min(sy, ey);
    const w = Math.abs(ex - sx);
    const h = Math.abs(ey - sy);

    selBox.style.left = left + 'px';
    selBox.style.top = top + 'px';
    selBox.style.width = w + 'px';
    selBox.style.height = h + 'px';

    selLabel.textContent = `${Math.round(w * dpr)} × ${Math.round(h * dpr)}`;
    selLabel.style.display = 'block';
  }

  function showLoading() {
    resultCard.style.display = 'flex';
    cardBody.className = 'body loading';
    cardBody.innerHTML = '<div class="spinner"></div><span>Analyzing...</span>';
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

  function showResult(text, isError = false) {
    cardBody.className = 'body' + (isError ? ' err' : '');
    if (isError) { cardBody.textContent = text; return; }

    cardBody.innerHTML = '';
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
      toggle.addEventListener('click', () => {
        content.classList.toggle('open');
        arrow.classList.toggle('open');
      });

      section.appendChild(toggle); section.appendChild(content);

      const mainDiv = document.createElement('div');
      mainDiv.className = 'main-response'; mainDiv.innerHTML = renderMarkdown(main);
      cardBody.appendChild(section);
      cardBody.appendChild(mainDiv);
    } else {
      cardBody.innerHTML = renderMarkdown(text);
    }

    // Copy button
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
    cardBody.appendChild(copyBtn);
    cardBody.style.paddingBottom = '44px';
  }

  closeBtn.addEventListener('click', () => {
    resultCard.style.display = 'none';
    host.remove();
  });

  let dragActive = false;
  let dragStartX = 0, dragStartY = 0;
  let cardStartLeft = 0, cardStartTop = 0;

  dragHandle.addEventListener('mousedown', (e) => {
    if (e.target.tagName === 'BUTTON') return;
    dragActive = true;
    dragStartX = e.clientX;
    dragStartY = e.clientY;
    const rect = resultCard.getBoundingClientRect();
    cardStartLeft = rect.left;
    cardStartTop = rect.top;
    e.preventDefault();
  });

  document.addEventListener('mousemove', (e) => {
    if (!dragActive) return;
    const dx = e.clientX - dragStartX;
    const dy = e.clientY - dragStartY;
    resultCard.style.left = (cardStartLeft + dx) + 'px';
    resultCard.style.top = (cardStartTop + dy) + 'px';
    resultCard.style.right = 'auto';
  });

  document.addEventListener('mouseup', () => {
    dragActive = false;
  });
})();
