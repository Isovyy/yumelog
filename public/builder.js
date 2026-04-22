// ═══════════════════════════════════════════════════════════
//  yumearchive — builder.js
// ═══════════════════════════════════════════════════════════

// ─────────────────────────────────────────────
//  DOM refs
// ─────────────────────────────────────────────

let page, emptyState, addContainerBtn, containerPicker, blockPicker, formatBar, fmtSize, saveIndicator, previewBtn;

// ─────────────────────────────────────────────
//  State
// ─────────────────────────────────────────────

let idCounter  = 0;
let saveTimer  = null;
let activeCol  = null;
let colorA     = '#7c6af7';
let colorB     = '#f06c9b';
let dragBlock  = null;

let themeAccent      = '#7c6af7';
let themeBg          = '#f2f2f2';
let themeSurface     = '#ffffff';
let themeBorderColor = '#e2e2e2';
let themeFontColor   = '#1a1a1a';
let themeFont        = 'system';
let themeRadius      = 'rounded';
let themeBorder      = 'solid';

const FONT_STACKS = {
  system: "system-ui, -apple-system, 'Segoe UI', sans-serif",
  serif:  "Georgia, 'Times New Roman', serif",
  mono:   "ui-monospace, 'SF Mono', Consolas, 'Courier New', monospace",
  nunito: "'Nunito', system-ui, sans-serif",
  lora:   "'Lora', Georgia, serif",
};
const FONT_GFONTS = {
  nunito: 'https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700&display=swap',
  lora:   'https://fonts.googleapis.com/css2?family=Lora:ital,wght@0,400;0,600;1,400&display=swap',
};

function uid() { return String(++idCounter); }

function scheduleSave() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(commitSave, 800);
}

function commitSave() {
  const containers = readPageState();
  localStorage.setItem('yumearchive_v1', JSON.stringify({ containers }));
  saveIndicator.textContent = 'saved ✓';
  setTimeout(() => { saveIndicator.textContent = ''; }, 2000);
}

// ─────────────────────────────────────────────
//  Read state from DOM
// ─────────────────────────────────────────────

function readPageState() {
  return [...page.querySelectorAll(':scope > .container-wrap')].map(cw => ({
    id:   cw.dataset.id,
    cols: parseInt(cw.dataset.cols),
    columns: [...cw.querySelectorAll('.col')].map(col => ({
      id:     col.dataset.id,
      blocks: [...col.querySelectorAll(':scope > .block')].map(b => ({
        id:   b.dataset.id,
        type: b.dataset.type,
        data: readBlockData(b),
      })),
    })),
  }));
}

// ─────────────────────────────────────────────
//  Container
// ─────────────────────────────────────────────

function addContainer(cols, existingId) {
  const id = existingId || uid();
  if (emptyState) emptyState.style.display = 'none';

  const wrap = document.createElement('div');
  wrap.className    = 'container-wrap';
  wrap.dataset.id   = id;
  wrap.dataset.cols = cols;

  wrap.innerHTML = `
    <div class="container-toolbar">
      <span class="container-label">${cols}-column container</span>
      <button class="toolbar-btn" title="Move up"   onclick="moveContainer(this,-1)">↑</button>
      <button class="toolbar-btn" title="Move down" onclick="moveContainer(this, 1)">↓</button>
      <button class="toolbar-btn toolbar-btn--del"  title="Delete" onclick="removeContainer(this)">✕</button>
    </div>
    <div class="container-body" data-cols="${cols}">
      ${Array.from({ length: cols }, (_, i) => `
        <div class="col" data-id="${uid()}">
          <button class="col-add-btn" onclick="openBlockPicker(event, this.closest('.col'))">+ Add block</button>
        </div>
      `).join('')}
    </div>
  `;

  page.appendChild(wrap);

  wrap.querySelectorAll('.col').forEach(wireColDrag);

  return wrap;
}

function removeContainer(btn) {
  btn.closest('.container-wrap').remove();
  if (emptyState && !page.querySelector('.container-wrap')) emptyState.style.display = '';
  scheduleSave();
}

function moveContainer(btn, dir) {
  const wrap  = btn.closest('.container-wrap');
  const items = [...page.querySelectorAll(':scope > .container-wrap')];
  const idx   = items.indexOf(wrap);
  const target = items[idx + dir];
  if (!target) return;
  dir === -1 ? page.insertBefore(wrap, target)
             : page.insertBefore(target, wrap);
  scheduleSave();
}

// ─────────────────────────────────────────────
//  Ship in Five Minutes preset
// ─────────────────────────────────────────────

function addFiveMinutesPreset() {
  const wrap = addContainer(3);

  const cols = wrap.querySelectorAll('.col');

  // Col 0 — left: portrait (me) + dynamic axes
  addBlock('character-portrait', { label: 'A' },               null, cols[0]);
  addBlock('dynamic-axis',       { title: 'How it Happens',   left: 'slowly',           right: 'at first sight',    pos_a: 25, pos_b: 75 }, null, cols[0]);
  addBlock('dynamic-axis',       { title: 'Showing Affection',left: 'takes initiative', right: "doesn't",           pos_a: 30, pos_b: 60 }, null, cols[0]);
  addBlock('dynamic-axis',       { title: 'Relationship Att.',left: 'attached',         right: 'tries not to be',   pos_a: 80, pos_b: 40 }, null, cols[0]);

  // Col 1 — center: speech bubbles + who does what + axes
  addBlock('speech-bubbles',  {}, null, cols[1]);
  addBlock('who-does-what',   {}, null, cols[1]);

  // Col 2 — right: character portrait + axes
  addBlock('character-portrait', { label: 'B · character' }, null, cols[2]);
  addBlock('dynamic-axis',       { title: 'Handling Conflict', left: 'head-on', right: 'avoids',       pos_a: 70, pos_b: 30 }, null, cols[2]);
  addBlock('dynamic-axis',       { title: 'Dealing w/ Jealousy', left: 'expressive', right: 'internalized', pos_a: 20, pos_b: 80 }, null, cols[2]);
  addBlock('dynamic-axis',       { title: 'Attachment Style',  left: 'secure', right: 'anxious',       pos_a: 50, pos_b: 65 }, null, cols[2]);
}

// ─────────────────────────────────────────────
//  Block — add
// ─────────────────────────────────────────────

function addBlock(type, data, existingId, targetCol) {
  const col = targetCol || activeCol;
  if (!col) return;

  const id   = existingId || uid();
  const meta = BLOCK_META[type] || { icon: '□', label: type };

  const block = document.createElement('div');
  block.className    = 'block';
  block.dataset.id   = id;
  block.dataset.type = type;

  block.innerHTML = `
    <div class="block-toolbar">
      <span class="block-label">${meta.icon} ${meta.label}</span>
      <button class="toolbar-btn toolbar-btn--sm" title="Move left"  onclick="moveBlockToCol(this,-1)">←</button>
      <button class="toolbar-btn toolbar-btn--sm" title="Move right" onclick="moveBlockToCol(this, 1)">→</button>
      <button class="toolbar-btn toolbar-btn--sm" title="Move up"    onclick="moveBlock(this,-1)">↑</button>
      <button class="toolbar-btn toolbar-btn--sm" title="Move down"  onclick="moveBlock(this, 1)">↓</button>
      ${TEXT_SIZE_TYPES.has(type) ? `<select class="toolbar-size-sel" title="Font size"><option value="">—</option><option value="xs">XS</option><option value="sm">S</option><option value="lg">L</option><option value="xl">XL</option></select>` : ''}
      <button class="toolbar-btn toolbar-btn--sm toolbar-btn--del"   title="Delete" onclick="removeBlock(this)">✕</button>
    </div>
    <div class="block-body">${blockHTML(type)}</div>
  `;

  // Insert before the "Add block" button
  const addBtn = col.querySelector('.col-add-btn');
  col.insertBefore(block, addBtn);

  if (data) writeBlockData(block, data);

  wireBlockBehavior(block);
  setupBlockDrag(block);

  // Auto-add color-code block the first time a color-dependent block is manually added
  if (!existingId && !data && COLOR_DEPENDENT_TYPES.has(type)) {
    autoAddColorCode(block.closest('.container-wrap'));
  }

  if (!existingId && !data) focusFirstInput(block);

  block.addEventListener('input',  scheduleSave);
  block.addEventListener('change', scheduleSave);

  return block;
}

function removeBlock(btn) {
  btn.closest('.block').remove();
  scheduleSave();
}

function moveBlockToCol(btn, dir) {
  const block  = btn.closest('.block');
  const col    = block.closest('.col');
  const cols   = [...col.closest('.container-wrap').querySelectorAll('.col')];
  const target = cols[cols.indexOf(col) + dir];
  if (!target) return;
  target.insertBefore(block, target.querySelector('.col-add-btn'));
  scheduleSave();
}

function moveBlock(btn, dir) {
  const block  = btn.closest('.block');
  const col    = block.closest('.col');
  const blocks = [...col.querySelectorAll(':scope > .block')];
  const idx    = blocks.indexOf(block);
  const target = blocks[idx + dir];
  if (!target) return;
  dir === -1 ? col.insertBefore(block, target)
             : col.insertBefore(target, block);
  scheduleSave();
}

// ─────────────────────────────────────────────
//  Block meta
// ─────────────────────────────────────────────

const BLOCK_META = {
  'ship-header':       { icon: '✦', label: 'Ship Header' },
  'about':             { icon: '♡', label: 'About This Ship' },
  'ship-tags':         { icon: '◇', label: 'Ship Tags' },
  'links':             { icon: '↗', label: 'Links' },
  'dni':               { icon: '⊘', label: 'DNI / Boundaries' },
  'character-portrait':{ icon: '◫', label: 'Character Portrait' },
  'speech-bubbles':    { icon: '❝', label: 'Speech Bubbles' },
  'dynamic-axis':      { icon: '⊟', label: 'Dynamic Axis' },
  'who-does-what':     { icon: '☑', label: 'Who Does What' },
  'height-diff':       { icon: '↕', label: 'Height' },
  'age-diff':          { icon: '∞', label: 'Age Diff' },
  'headcanons':        { icon: '✎', label: 'Headcanons' },
  'gallery':           { icon: '▦', label: 'Gallery' },
  'quote-letter':      { icon: '✉', label: 'Quote / Letter' },
  'ship-stats':        { icon: '◑', label: 'Ship Stats' },
  'fic-recs':          { icon: '✦', label: 'Fic Rec List' },
  'heading':           { icon: 'T', label: 'Heading' },
  'text':              { icon: '¶', label: 'Text' },
  'divider':           { icon: '—', label: 'Divider' },
  'color-code':        { icon: '◉', label: 'Color Code' },
};

// ─────────────────────────────────────────────
//  Block HTML templates
// ─────────────────────────────────────────────

function blockHTML(type) {
  switch (type) {

    case 'ship-header': return `
      <div class="ship-header-block">
        <input class="ship-header__name" data-field="name" type="text" placeholder="Name">
        <span class="ship-header__x">×</span>
        <input class="ship-header__fo" data-field="fo" type="text" placeholder="Name">
        <input class="ship-header__source" data-field="source" type="text" placeholder="Source">
      </div>`;

    case 'about': return `
      <div class="rich-area" contenteditable="true" data-field="body"
           data-placeholder=""></div>`;

    case 'ship-tags': return `
      <div class="tag-area" data-tag-field="tags">
        <input class="tag-area__input" type="text" placeholder="">
      </div>`;

    case 'links': return `
      <ul class="links-list"></ul>
      <button class="list-add-btn" onclick="addLinkRow(this.previousElementSibling)">+ add link</button>`;

    case 'dni': return `
      <div class="dni-block">
        <p class="field-label">Please don't interact if you —</p>
        <div class="tag-area" data-tag-field="rules">
          <input class="tag-area__input" type="text" placeholder="">
        </div>
        <div class="rich-area" contenteditable="true" data-field="note"
             data-placeholder="" style="margin-top:.75rem;"></div>
      </div>`;

    case 'character-portrait': return `
      <div class="portrait-block">
        <div class="portrait-img-wrap" onclick="pickPortraitImg(this)">
          <div class="portrait-placeholder">◫<br><small>click to upload image</small></div>
        </div>
        <input type="file" accept="image/*" class="portrait-file-input" style="display:none">
        <div class="portrait-size-row">
          <input type="number" class="portrait-size-input" data-field="portrait_w" placeholder="W" min="1"
                 oninput="applyPortraitSize(this.closest('.block'));scheduleSave()">
          <span class="portrait-size-sep">×</span>
          <input type="number" class="portrait-size-input" data-field="portrait_h" placeholder="H" min="1"
                 oninput="applyPortraitSize(this.closest('.block'));scheduleSave()">
          <span class="portrait-size-unit">px</span>
          <button class="portrait-crop-btn" onclick="openCropModal(this.closest('.block'))" style="display:none">✂ Crop</button>
        </div>
        <div class="rich-area portrait-caption" contenteditable="true" data-field="caption"
             data-placeholder="Add a caption…"></div>
      </div>`;

    case 'speech-bubbles': return `
      <div class="bubbles-block">
        <ul class="bubbles-list"></ul>
        <button class="list-add-btn" onclick="addBubble(this.closest('.bubbles-block').querySelector('.bubbles-list'), 'me')">+ A</button>
        <button class="list-add-btn" onclick="addBubble(this.closest('.bubbles-block').querySelector('.bubbles-list'), 'fo')">+ B</button>
      </div>`;

    case 'dynamic-axis': return `
      <div class="axis-block">
        <input type="hidden" data-field="pos_a" value="30">
        <input type="hidden" data-field="pos_b" value="70">
        <div class="axis-poles">
          <input class="axis-pole" data-field="left"  type="text" placeholder="←">
          <input class="axis-pole axis-pole--right" data-field="right" type="text" placeholder="→">
        </div>
        <div class="axis-track">
          <div class="axis-dot axis-dot--a" data-dot="a"></div>
          <div class="axis-dot axis-dot--b" data-dot="b"></div>
        </div>
      </div>`;

    case 'who-does-what': return `
      <div class="wdw-block">
        <div class="wdw-header">
          <span class="wdw-col-label">Trait</span>
          <span class="wdw-col-label">A</span>
          <span class="wdw-col-label">B</span>
        </div>
        <ul class="wdw-list"></ul>
        <button class="list-add-btn" onclick="addWdwRow(this.previousElementSibling)">+ add trait</button>
      </div>`;

    case 'height-diff': return `
      <div class="height-diff-block">
        <svg class="ha-svg" viewBox="0 0 120 110" xmlns="http://www.w3.org/2000/svg"></svg>
        <div class="ha-labels">
          <div class="ha-person-label">
            <input data-field="name_a" type="text" placeholder="A" class="ha-name">
            <div class="ha-height-row">
              <input data-field="height_a" type="number" placeholder="160" class="ha-height" min="0">
              <span class="ha-unit">cm</span>
            </div>
          </div>
          <div class="ha-person-label">
            <input data-field="name_b" type="text" placeholder="B" class="ha-name">
            <div class="ha-height-row">
              <input data-field="height_b" type="number" placeholder="175" class="ha-height" min="0">
              <span class="ha-unit">cm</span>
            </div>
          </div>
        </div>
      </div>`;

    case 'age-diff': return `
      <div class="age-diff-block">
        <div class="age-row">
          <div class="age-person">
            <input data-field="name_a" type="text" placeholder="A" class="age-name">
            <input data-field="age_a"  type="text" placeholder="age" class="age-val">
          </div>
          <span class="age-sep">/</span>
          <div class="age-person">
            <input data-field="name_b" type="text" placeholder="B" class="age-name">
            <input data-field="age_b"  type="text" placeholder="age" class="age-val">
          </div>
        </div>
      </div>`;

    case 'headcanons': return `
      <ul class="hc-list"></ul>
      <button class="list-add-btn" onclick="addHcItem(this.previousElementSibling)">+ add headcanon</button>`;

    case 'gallery': return `
      <div class="gallery-grid"></div>
      <input type="file" accept="image/*" multiple class="gallery-file-input" style="display:none">
      <button class="list-add-btn" onclick="pickGalleryImgs(this.closest('.block-body'))">+ add image</button>`;

    case 'quote-letter': return `
      <div class="quote-block">
        <div class="rich-area quote-body" contenteditable="true" data-field="body"
             data-placeholder=""></div>
        <input class="quote-attr" data-field="attr" type="text" placeholder="attribution">
      </div>`;

    case 'ship-stats': return `
      <div class="stats-block">
        <div class="stat-row">
          <span class="stat-label">Together since</span>
          <input data-field="since" type="text" placeholder="year / chapter">
        </div>
        <div class="stat-row">
          <span class="stat-label">Source</span>
          <input data-field="source" type="text" placeholder="fandom / media">
        </div>
        <div class="stat-row">
          <span class="stat-label">Status</span>
          <select data-field="status">
            <option value="current">Current</option>
            <option value="forever">Forever</option>
            <option value="new">New</option>
            <option value="retired">Retired</option>
          </select>
        </div>
        <div class="stat-row">
          <span class="stat-label">Dynamic</span>
          <input data-field="dynamic" type="text" placeholder="">
        </div>
      </div>`;

    case 'fic-recs': return `
      <ul class="fic-list"></ul>
      <button class="list-add-btn" onclick="addFicRow(this.previousElementSibling)">+ add fic</button>`;

    case 'heading': return `
      <div class="block-heading" contenteditable="true" data-field="html"
           data-placeholder="Heading…"></div>`;

    case 'text': return `
      <div class="rich-area" contenteditable="true" data-field="html"
           data-placeholder="Start typing…"></div>`;

    case 'divider': return `<hr>`;

    case 'color-code': return `
      <div class="color-code-block">
        <label class="cc-item">
          <input type="color" data-field="color_a" class="cc-wheel" value="#7c6af7">
          <span class="cc-label">A</span>
        </label>
        <label class="cc-item">
          <input type="color" data-field="color_b" class="cc-wheel" value="#f06c9b">
          <span class="cc-label">B</span>
        </label>
      </div>`;

    default: return `<p style="color:#888;font-size:.85rem;">Unknown block: ${escHTML(type)}</p>`;
  }
}

// ─────────────────────────────────────────────
//  Block behavior wiring
// ─────────────────────────────────────────────

// ─────────────────────────────────────────────
//  Drag and drop
// ─────────────────────────────────────────────

function clearDropIndicators() {
  document.querySelectorAll('.block--drop-before, .block--drop-after')
    .forEach(el => el.classList.remove('block--drop-before', 'block--drop-after'));
}

function setupBlockDrag(block) {
  block.setAttribute('draggable', 'true');

  block.addEventListener('dragstart', e => {
    if (block.getAttribute('draggable') !== 'true') { e.preventDefault(); return; }
    dragBlock = block;
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', '');
    requestAnimationFrame(() => block.classList.add('block--dragging'));
  });

  block.addEventListener('dragend', () => {
    block.classList.remove('block--dragging');
    clearDropIndicators();
    dragBlock = null;
  });

  block.addEventListener('dragover', e => {
    if (!dragBlock || dragBlock === block) return;
    e.preventDefault();
    e.stopPropagation();
    clearDropIndicators();
    const mid = block.getBoundingClientRect().top + block.offsetHeight / 2;
    block.classList.add(e.clientY < mid ? 'block--drop-before' : 'block--drop-after');
  });

  block.addEventListener('dragleave', () => {
    block.classList.remove('block--drop-before', 'block--drop-after');
  });

  block.addEventListener('drop', e => {
    if (!dragBlock || dragBlock === block) return;
    e.preventDefault();
    e.stopPropagation();
    const mid = block.getBoundingClientRect().top + block.offsetHeight / 2;
    block.parentElement.insertBefore(dragBlock, e.clientY < mid ? block : block.nextSibling);
    clearDropIndicators();
    scheduleSave();
  });
}

function wireColDrag(col) {
  col.addEventListener('dragover', e => {
    if (!dragBlock || e.target.closest('.block')) return;
    e.preventDefault();
    clearDropIndicators();
    col.classList.add('col--drop-target');
  });

  col.addEventListener('dragleave', e => {
    if (!col.contains(e.relatedTarget)) col.classList.remove('col--drop-target');
  });

  col.addEventListener('drop', e => {
    if (!dragBlock || e.target.closest('.block')) return;
    e.preventDefault();
    col.insertBefore(dragBlock, col.querySelector('.col-add-btn'));
    col.classList.remove('col--drop-target');
    clearDropIndicators();
    scheduleSave();
  });
}

function wireBlockBehavior(block) {
  const type = block.dataset.type;

  // Tag areas
  block.querySelectorAll('[data-tag-field]').forEach(wireTagArea);

  // Dynamic axis — sync sliders to dot positions
  if (type === 'dynamic-axis') wireAxis(block);

  // Height diff — sync height inputs to stickman SVG
  if (type === 'height-diff') wireHeightAge(block);

  // Color code — update global A/B colors
  if (type === 'color-code') wireColorCode(block);

  // Character portrait — apply saved size
  if (type === 'character-portrait') {
    applyPortraitSize(block);
  }

  // Text blocks — font size select
  if (TEXT_SIZE_TYPES.has(type)) {
    const sel  = block.querySelector('.toolbar-size-sel');
    const body = block.querySelector('.block-body');
    if (sel && body) {
      sel.addEventListener('change', () => { body.style.fontSize = FONT_SIZE_MAP[sel.value] || ''; scheduleSave(); });
      body.style.fontSize = FONT_SIZE_MAP[sel.value] || '';
    }
  }
}

function applyPortraitSize(block) {
  const wInput = block.querySelector('[data-field="portrait_w"]');
  const hInput = block.querySelector('[data-field="portrait_h"]');
  const wrap   = block.querySelector('.portrait-img-wrap');
  if (!wrap) return;
  const w = parseInt(wInput?.value) || 0;
  const h = parseInt(hInput?.value) || 0;
  wrap.style.maxWidth = w ? w + 'px' : '';
  wrap.style.height   = h ? h + 'px' : '';
}

function wireColorCode(block) {
  const inputA = block.querySelector('[data-field="color_a"]');
  const inputB = block.querySelector('[data-field="color_b"]');
  function update() {
    colorA = inputA.value;
    colorB = inputB.value;
    applyGlobalColors();
  }
  inputA.addEventListener('input', update);
  inputB.addEventListener('input', update);
  update();
}

function syncThemeBar() {
  const tbAccent  = document.getElementById('tb-accent');
  if (!tbAccent) return;
  tbAccent.value                                               = themeAccent;
  document.getElementById('tb-bg').value                      = themeBg;
  document.getElementById('tb-surface').value                 = themeSurface;
  document.getElementById('tb-border-color').value            = themeBorderColor;
  document.getElementById('tb-font-color').value              = themeFontColor;
  document.getElementById('tb-font').value                    = themeFont;
  document.getElementById('tb-radius').value                  = themeRadius;
  document.getElementById('tb-border').value                  = themeBorder;
}

const COLOR_DEPENDENT_TYPES = new Set(['height-diff', 'dynamic-axis', 'speech-bubbles']);
const TEXT_SIZE_TYPES = new Set(['text','heading','about','quote-letter','headcanons','fic-recs','links','dni','speech-bubbles']);
const FONT_SIZE_MAP = { xs: '0.72rem', sm: '0.82rem', lg: '1rem', xl: '1.15rem' };

function autoAddColorCode(targetContainer) {
  if (page.querySelector('.block[data-type="color-code"]')) return;
  const col = targetContainer.querySelector('.col');
  if (!col) return;
  const ccBlock = addBlock('color-code', null, null, col);
  // move to top of the column, before any other blocks
  const firstBlock = col.querySelector('.block');
  if (firstBlock && firstBlock !== ccBlock) col.insertBefore(ccBlock, firstBlock);
}

function wireAxis(block) {
  const track  = block.querySelector('.axis-track');
  const dotA   = block.querySelector('.axis-dot--a');
  const dotB   = block.querySelector('.axis-dot--b');
  const inputA = block.querySelector('[data-field="pos_a"]');
  const inputB = block.querySelector('[data-field="pos_b"]');

  function update() {
    dotA.style.left = inputA.value + '%';
    dotB.style.left = inputB.value + '%';
  }

  function makeDraggable(dot, input) {
    function onMove(e) {
      const rect   = track.getBoundingClientRect();
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const pct    = Math.round(Math.max(0, Math.min(100, (clientX - rect.left) / rect.width * 100)));
      input.value  = pct;
      update();
      scheduleSave();
    }
    function onUp() {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
      document.removeEventListener('touchmove', onMove);
      document.removeEventListener('touchend', onUp);
    }
    function onDown(e) {
      e.preventDefault();
      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp);
      document.addEventListener('touchmove', onMove, { passive: false });
      document.addEventListener('touchend', onUp);
    }
    dot.addEventListener('mousedown', onDown);
    dot.addEventListener('touchstart', onDown, { passive: false });
  }

  // Also allow clicking directly on the track to move the nearest dot
  track.addEventListener('click', e => {
    if (e.target === dotA || e.target === dotB) return;
    const rect = track.getBoundingClientRect();
    const pct  = Math.round(Math.max(0, Math.min(100, (e.clientX - rect.left) / rect.width * 100)));
    const distA = Math.abs(pct - parseInt(inputA.value));
    const distB = Math.abs(pct - parseInt(inputB.value));
    (distA <= distB ? inputA : inputB).value = pct;
    update();
    scheduleSave();
  });

  makeDraggable(dotA, inputA);
  makeDraggable(dotB, inputB);
  update();
}

function wireHeightAge(block) {
  const svg    = block.querySelector('.ha-svg');
  const inputA = block.querySelector('[data-field="height_a"]');
  const inputB = block.querySelector('[data-field="height_b"]');

  function update() {
    const a   = parseFloat(inputA.value) || 0;
    const b   = parseFloat(inputB.value) || 0;
    const max = Math.max(a, b, 1);
    const baseline = 104;
    const maxH     = 90;

    svg.innerHTML =
      `<line x1="10" y1="${baseline}" x2="110" y2="${baseline}" stroke="#e0e0e0" stroke-width="1"/>` +
      stickmanSVG(35, baseline, maxH * (a / max), colorA) +
      stickmanSVG(85, baseline, maxH * (b / max), colorB);
  }

  inputA.addEventListener('input', update);
  inputB.addEventListener('input', update);
  block._updateHeightSVG = update;
  update();
}

function hexToRgba(hex, alpha) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

function darkenHex(hex, factor) {
  const r = Math.round(parseInt(hex.slice(1,3),16) * (1 - factor));
  const g = Math.round(parseInt(hex.slice(3,5),16) * (1 - factor));
  const b = Math.round(parseInt(hex.slice(5,7),16) * (1 - factor));
  return '#' + [r,g,b].map(v => Math.max(0,Math.min(255,v)).toString(16).padStart(2,'0')).join('');
}

function blendHex(hexA, hexB, t) {
  const p = h => [parseInt(h.slice(1,3),16),parseInt(h.slice(3,5),16),parseInt(h.slice(5,7),16)];
  const [ra,ga,ba] = p(hexA), [rb,gb,bb] = p(hexB);
  return '#' + [ra+(rb-ra)*t, ga+(gb-ga)*t, ba+(bb-ba)*t]
    .map(v => Math.round(v).toString(16).padStart(2,'0')).join('');
}

function applyTheme() {
  const root = document.documentElement;
  root.style.setProperty('--accent',       themeAccent);
  root.style.setProperty('--accent-bg',    hexToRgba(themeAccent, 0.12));
  root.style.setProperty('--accent-dark',  darkenHex(themeAccent, 0.22));
  root.style.setProperty('--bg',           themeBg);
  root.style.setProperty('--surface',      themeSurface);
  root.style.setProperty('--surface-2',    blendHex(themeSurface, themeBg, 0.4));
  root.style.setProperty('--border',       themeBorderColor);
  root.style.setProperty('--text',         themeFontColor);
  const radiusMap   = { sharp: '0px', rounded: '8px',  pill: '16px' };
  const radiusSmMap = { sharp: '0px', rounded: '5px',  pill: '10px' };
  root.style.setProperty('--radius',       radiusMap[themeRadius]   || '8px');
  root.style.setProperty('--radius-sm',    radiusSmMap[themeRadius] || '5px');
  root.style.setProperty('--border-style', themeBorder);
  root.style.setProperty('--font', FONT_STACKS[themeFont] || FONT_STACKS.system);
  const gfUrl  = FONT_GFONTS[themeFont];
  let   gfLink = document.getElementById('ys-gfont');
  if (gfUrl) {
    if (!gfLink) {
      gfLink = document.createElement('link');
      gfLink.id  = 'ys-gfont';
      gfLink.rel = 'stylesheet';
      document.head.appendChild(gfLink);
    }
    if (gfLink.href !== gfUrl) gfLink.href = gfUrl;
  } else if (gfLink) {
    gfLink.href = '';
  }
}

function restoreTheme(saved) {
  if (!saved) return;
  if (saved.accent)      themeAccent      = saved.accent;
  if (saved.bg)          themeBg          = saved.bg;
  if (saved.surface)     themeSurface     = saved.surface;
  if (saved.borderColor) themeBorderColor = saved.borderColor;
  if (saved.fontColor)   themeFontColor   = saved.fontColor;
  if (saved.font)        themeFont        = saved.font;
  if (saved.radius)      themeRadius      = saved.radius;
  if (saved.border)      themeBorder      = saved.border;
  applyTheme();
  syncThemeBar();
}

function applyGlobalColors() {
  const root = document.documentElement;
  root.style.setProperty('--dot-a', colorA);
  root.style.setProperty('--dot-b', colorB);
  root.style.setProperty('--bubble-a-bg',    hexToRgba(colorA, 0.13));
  root.style.setProperty('--bubble-a-color', colorA);
  root.style.setProperty('--bubble-b-bg',    hexToRgba(colorB, 0.13));
  root.style.setProperty('--bubble-b-color', colorB);
  if (page) {
    page.querySelectorAll('.block[data-type="height-diff"]').forEach(b => {
      if (b._updateHeightSVG) b._updateHeightSVG();
    });
  }
}

function stickmanSVG(cx, baseline, h, color) {
  if (h < 4) return '';
  const sw      = Math.max(h * 0.045, 1.5);
  const hr      = Math.max(h * 0.13, 3);
  const headY   = baseline - h + hr;
  const neckY   = headY + hr;
  const hipY    = baseline - h * 0.38;
  const armY    = baseline - h * 0.62;
  const armW    = h * 0.21;
  const legW    = h * 0.16;

  return `
    <circle cx="${cx}" cy="${headY}" r="${hr}" fill="${color}" opacity="0.9"/>
    <line x1="${cx}"       y1="${neckY}"  x2="${cx}"       y2="${hipY}"    stroke="${color}" stroke-width="${sw}" stroke-linecap="round" opacity="0.9"/>
    <line x1="${cx-armW}"  y1="${armY}"   x2="${cx+armW}"  y2="${armY}"    stroke="${color}" stroke-width="${sw}" stroke-linecap="round" opacity="0.9"/>
    <line x1="${cx}"       y1="${hipY}"   x2="${cx-legW}"  y2="${baseline}" stroke="${color}" stroke-width="${sw}" stroke-linecap="round" opacity="0.9"/>
    <line x1="${cx}"       y1="${hipY}"   x2="${cx+legW}"  y2="${baseline}" stroke="${color}" stroke-width="${sw}" stroke-linecap="round" opacity="0.9"/>
  `;
}

// ─────────────────────────────────────────────
//  List helpers
// ─────────────────────────────────────────────

function addLinkRow(list, item) {
  const li = document.createElement('li');
  li.className = 'link-row';
  li.innerHTML = `
    <input data-field="label" type="text" placeholder="Label" value="${escAttr(item?.label)}">
    <input data-field="url"   type="text" placeholder="URL"   value="${escAttr(item?.url)}">
    <button class="row-del" onclick="this.closest('li').remove();scheduleSave();">✕</button>
  `;
  list.appendChild(li);
  scheduleSave();
}

function addBubble(list, side, text) {
  const li = document.createElement('li');
  li.className = `bubble bubble--${side}`;
  li.dataset.side = side;
  li.innerHTML = `
    <div class="bubble__text" contenteditable="true"
         data-placeholder="">${text || ''}</div>
    <button class="row-del bubble__del" onclick="this.closest('li').remove();scheduleSave();">✕</button>
  `;
  list.appendChild(li);
  if (!text) setTimeout(() => li.querySelector('[contenteditable]').focus(), 0);
  scheduleSave();
}

function addWdwRow(list, item) {
  const li = document.createElement('li');
  li.className = 'wdw-row';
  const me = item?.me ?? false;
  const fo = item?.fo ?? false;
  li.innerHTML = `
    <input class="wdw-trait" data-field="trait" type="text"
           placeholder="" value="${escAttr(item?.trait)}">
    <label class="wdw-check"><input type="checkbox" data-field="me" ${me ? 'checked' : ''}></label>
    <label class="wdw-check"><input type="checkbox" data-field="fo" ${fo ? 'checked' : ''}></label>
    <button class="row-del" onclick="this.closest('li').remove();scheduleSave();">✕</button>
  `;
  list.appendChild(li);
  scheduleSave();
}

function addHcItem(list, html) {
  const li = document.createElement('li');
  li.className = 'hc-item';
  li.innerHTML = `
    <div class="hc-item__text" contenteditable="true"
         data-placeholder="Add a headcanon…">${html || ''}</div>
    <button class="row-del" onclick="this.closest('li').remove();scheduleSave();">✕</button>
  `;
  list.appendChild(li);
  if (!html) setTimeout(() => li.querySelector('[contenteditable]').focus(), 0);
  scheduleSave();
}

function addGalleryCell(grid, src) {
  const cell = document.createElement('div');
  cell.className = 'gallery-cell';
  cell.innerHTML = `
    <img class="gallery-img" src="${escAttr(src)}" alt="">
    <button class="gallery-del" onclick="this.closest('.gallery-cell').remove();scheduleSave();">✕</button>
  `;
  grid.appendChild(cell);
  scheduleSave();
}

function pickGalleryImgs(body) {
  const fileInput = body.querySelector('.gallery-file-input');
  const grid      = body.querySelector('.gallery-grid');
  fileInput.onchange = async () => {
    for (const file of fileInput.files) {
      const dataUrl = await resizeImage(file, 800, 0.82);
      addGalleryCell(grid, dataUrl);
    }
    fileInput.value = '';
  };
  fileInput.click();
}

function addFicRow(list, item) {
  const li = document.createElement('li');
  li.className = 'fic-row';
  li.innerHTML = `
    <div class="fic-row__meta">
      <input data-field="title"  type="text" placeholder="Fic title"    value="${escAttr(item?.title)}">
      <input data-field="author" type="text" placeholder="Author"       value="${escAttr(item?.author)}">
      <input data-field="url"    type="text" placeholder="URL"           value="${escAttr(item?.url)}">
    </div>
    <input data-field="note" type="text" placeholder="Why you love it…" value="${escAttr(item?.note)}">
    <button class="row-del" onclick="this.closest('li').remove();scheduleSave();">✕</button>
  `;
  list.appendChild(li);
  scheduleSave();
}

function resizeImage(file, maxPx = 800, quality = 0.82) {
  return new Promise(resolve => {
    const reader = new FileReader();
    reader.onload = e => {
      const img = new Image();
      img.onload = () => {
        const scale = Math.min(1, maxPx / Math.max(img.width, img.height));
        const canvas = document.createElement('canvas');
        canvas.width  = Math.round(img.width  * scale);
        canvas.height = Math.round(img.height * scale);
        canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
}

function pickPortraitImg(wrap) {
  const block     = wrap.closest('.block');
  const fileInput = block.querySelector('.portrait-file-input');
  fileInput.onchange = async () => {
    const file = fileInput.files[0];
    if (!file) return;
    const dataUrl = await resizeImage(file);
    wrap.innerHTML = `<img src="${escAttr(dataUrl)}" alt="" class="portrait-img">`;
    const cropBtn = block.querySelector('.portrait-crop-btn');
    if (cropBtn) cropBtn.style.display = '';
    scheduleSave();
    fileInput.value = '';
  };
  fileInput.click();
}

// ─────────────────────────────────────────────
//  Tag chips
// ─────────────────────────────────────────────

function wireTagArea(area) {
  const input = area.querySelector('.tag-area__input');
  input.addEventListener('keydown', e => {
    if ((e.key === 'Enter' || e.key === ',') && input.value.trim()) {
      e.preventDefault();
      insertChip(area, input.value.trim());
      input.value = '';
      scheduleSave();
    }
    if (e.key === 'Backspace' && !input.value) {
      const chips = area.querySelectorAll('.chip');
      if (chips.length) { chips[chips.length - 1].remove(); scheduleSave(); }
    }
  });
}

function insertChip(area, value) {
  const chip = document.createElement('span');
  chip.className     = 'chip';
  chip.dataset.value = value;
  chip.innerHTML = `${escHTML(value)}<button class="chip__del" onclick="this.parentElement.remove();scheduleSave();">✕</button>`;
  area.insertBefore(chip, area.querySelector('.tag-area__input'));
}

// ─────────────────────────────────────────────
//  Read / write block data
// ─────────────────────────────────────────────

function readBlockData(block) {
  const type = block.dataset.type;
  const data = {};

  block.querySelectorAll('[data-field]').forEach(el => {
    const k = el.dataset.field;
    if (el.hasAttribute('contenteditable')) data[k] = el.innerHTML;
    else if (el.type === 'checkbox')        data[k] = el.checked;
    else                                    data[k] = el.value;
  });

  block.querySelectorAll('[data-tag-field]').forEach(area => {
    data[area.dataset.tagField] = [...area.querySelectorAll('.chip')].map(c => c.dataset.value);
  });

  if (type === 'speech-bubbles')
    data.bubbles = [...block.querySelectorAll('.bubble')].map(b => ({
      side: b.dataset.side,
      text: b.querySelector('[contenteditable]').innerHTML,
    }));

  if (type === 'who-does-what')
    data.rows = [...block.querySelectorAll('.wdw-row')].map(r => ({
      trait: r.querySelector('[data-field="trait"]').value,
      me:    r.querySelector('[data-field="me"]').checked,
      fo:    r.querySelector('[data-field="fo"]').checked,
    }));

  if (type === 'headcanons')
    data.items = [...block.querySelectorAll('.hc-item [contenteditable]')].map(e => e.innerHTML);

  if (type === 'gallery')
    data.items = [...block.querySelectorAll('.gallery-img')].map(i => i.src);

  if (type === 'links')
    data.items = [...block.querySelectorAll('.link-row')].map(r => ({
      label: r.querySelector('[data-field="label"]').value,
      url:   r.querySelector('[data-field="url"]').value,
    }));

  if (type === 'fic-recs')
    data.items = [...block.querySelectorAll('.fic-row')].map(r => ({
      title:  r.querySelector('[data-field="title"]').value,
      author: r.querySelector('[data-field="author"]').value,
      url:    r.querySelector('[data-field="url"]').value,
      note:   r.querySelector('[data-field="note"]').value,
    }));

  if (type === 'character-portrait') {
    const img = block.querySelector('.portrait-img');
    if (img) data.img = img.src;
  }

  if (TEXT_SIZE_TYPES.has(type)) {
    const sel = block.querySelector('.toolbar-size-sel');
    if (sel) data.font_size = sel.value;
  }

  return data;
}

function writeBlockData(block, data) {
  if (!data) return;
  const type = block.dataset.type;

  block.querySelectorAll('[data-field]').forEach(el => {
    const v = data[el.dataset.field];
    if (v == null) return;
    if (el.hasAttribute('contenteditable')) el.innerHTML = v;
    else if (el.type === 'checkbox')        el.checked = v;
    else                                    el.value = v;
  });

  block.querySelectorAll('[data-tag-field]').forEach(area => {
    const tags = data[area.dataset.tagField];
    if (tags) tags.forEach(t => insertChip(area, t));
  });

  if (type === 'speech-bubbles' && data.bubbles)
    data.bubbles.forEach(b => addBubble(block.querySelector('.bubbles-list'), b.side, b.text));

  if (type === 'who-does-what' && data.rows)
    data.rows.forEach(r => addWdwRow(block.querySelector('.wdw-list'), r));

  if (type === 'headcanons' && data.items)
    data.items.forEach(html => addHcItem(block.querySelector('.hc-list'), html));

  if (type === 'gallery' && data.items)
    data.items.forEach(src => addGalleryCell(block.querySelector('.gallery-grid'), src));

  if (type === 'links' && data.items)
    data.items.forEach(item => addLinkRow(block.querySelector('.links-list'), item));

  if (type === 'fic-recs' && data.items)
    data.items.forEach(item => addFicRow(block.querySelector('.fic-list'), item));

  if (type === 'character-portrait' && data.img) {
    const wrap = block.querySelector('.portrait-img-wrap');
    if (wrap) wrap.innerHTML = `<img src="${escAttr(data.img)}" alt="" class="portrait-img">`;
    const cropBtn = block.querySelector('.portrait-crop-btn');
    if (cropBtn) cropBtn.style.display = '';
  }

  if (TEXT_SIZE_TYPES.has(type) && data.font_size) {
    const sel  = block.querySelector('.toolbar-size-sel');
    const body = block.querySelector('.block-body');
    if (sel && body) {
      sel.value = data.font_size;
      body.style.fontSize = FONT_SIZE_MAP[sel.value] || '';
    }
  }

  // Re-wire dynamic behavior after data load
  wireBlockBehavior(block);
}

// ─────────────────────────────────────────────
//  Helpers
// ─────────────────────────────────────────────

function escAttr(v) {
  return v ? String(v).replace(/"/g, '&quot;') : '';
}
function escHTML(v) {
  return String(v).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}
function focusFirstInput(block) {
  const el = block.querySelector('input[type="text"], [contenteditable]');
  if (el) setTimeout(() => el.focus(), 0);
}

// ─────────────────────────────────────────────
//  Crop modal
// ─────────────────────────────────────────────

let _cropImg      = null;
let _cropCallback = null;
let _cropX = 0, _cropY = 0, _cropW = 0, _cropH = 0;
let _cropDragging = false, _cropStartX = 0, _cropStartY = 0;

function openCropModal(block) {
  const img = block.querySelector('.portrait-img');
  if (!img) return;
  _cropCallback = dataUrl => {
    block.querySelector('.portrait-img-wrap').innerHTML =
      `<img src="${escAttr(dataUrl)}" alt="" class="portrait-img">`;
    applyPortraitSize(block);
    scheduleSave();
  };
  const modal  = document.getElementById('crop-modal');
  const canvas = document.getElementById('crop-canvas');
  _cropImg = new Image();
  _cropImg.onload = () => {
    const maxW = Math.min(680, window.innerWidth  - 80);
    const maxH = Math.min(520, window.innerHeight - 180);
    const scale = Math.min(1, maxW / _cropImg.width, maxH / _cropImg.height);
    canvas.width  = Math.round(_cropImg.width  * scale);
    canvas.height = Math.round(_cropImg.height * scale);
    _cropX = 0; _cropY = 0; _cropW = canvas.width; _cropH = canvas.height;
    _redrawCrop();
    modal.style.display = 'flex';
  };
  _cropImg.src = img.src;
}

function closeCropModal() {
  document.getElementById('crop-modal').style.display = 'none';
  _cropImg = null; _cropCallback = null;
}

function confirmCrop() {
  if (!_cropImg || _cropW < 2 || _cropH < 2) { closeCropModal(); return; }
  const canvas = document.getElementById('crop-canvas');
  const scaleX = _cropImg.width  / canvas.width;
  const scaleY = _cropImg.height / canvas.height;
  const sx = Math.round(_cropX * scaleX);
  const sy = Math.round(_cropY * scaleY);
  const sw = Math.round(_cropW * scaleX);
  const sh = Math.round(_cropH * scaleY);
  const maxPx = 800;
  const s = Math.min(1, maxPx / Math.max(sw, sh));
  const out = document.createElement('canvas');
  out.width  = Math.round(sw * s);
  out.height = Math.round(sh * s);
  out.getContext('2d').drawImage(_cropImg, sx, sy, sw, sh, 0, 0, out.width, out.height);
  if (_cropCallback) _cropCallback(out.toDataURL('image/jpeg', 0.82));
  closeCropModal();
}

function _redrawCrop() {
  const canvas = document.getElementById('crop-canvas');
  if (!canvas || !_cropImg) return;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(_cropImg, 0, 0, canvas.width, canvas.height);
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  ctx.fillRect(0, 0, canvas.width, _cropY);
  ctx.fillRect(0, _cropY + _cropH, canvas.width, canvas.height - _cropY - _cropH);
  ctx.fillRect(0, _cropY, _cropX, _cropH);
  ctx.fillRect(_cropX + _cropW, _cropY, canvas.width - _cropX - _cropW, _cropH);
  ctx.strokeStyle = '#fff';
  ctx.lineWidth   = 1.5;
  ctx.setLineDash([5, 4]);
  ctx.strokeRect(_cropX + 0.75, _cropY + 0.75, _cropW - 1.5, _cropH - 1.5);
  ctx.setLineDash([]);
  const hs = 7;
  ctx.fillStyle = '#fff';
  [
    [_cropX,         _cropY        ],
    [_cropX + _cropW, _cropY        ],
    [_cropX,         _cropY + _cropH],
    [_cropX + _cropW, _cropY + _cropH],
  ].forEach(([x, y]) => ctx.fillRect(x - hs / 2, y - hs / 2, hs, hs));
}

// ─────────────────────────────────────────────
//  DOM init — called once by React when builder
//  HTML is in the DOM
// ─────────────────────────────────────────────

let _domInited = false;
function initBuilderDOM() {
  if (_domInited) return;
  _domInited = true;

  page            = document.getElementById('page');
  emptyState      = document.getElementById('empty-state');
  addContainerBtn = document.getElementById('add-container-btn');
  containerPicker = document.getElementById('container-picker');
  blockPicker     = document.getElementById('block-picker');
  formatBar       = document.getElementById('format-bar');
  fmtSize         = document.getElementById('fmt-size');
  saveIndicator   = document.getElementById('save-indicator');
  previewBtn      = document.getElementById('preview-btn');

  applyGlobalColors();

  // ── Theme bar ────────────────────────────────

  const tbAccent      = document.getElementById('tb-accent');
  const tbBg          = document.getElementById('tb-bg');
  const tbSurface     = document.getElementById('tb-surface');
  const tbBorderColor = document.getElementById('tb-border-color');
  const tbFontColor   = document.getElementById('tb-font-color');
  const tbFont        = document.getElementById('tb-font');
  const tbRadius      = document.getElementById('tb-radius');
  const tbBorder      = document.getElementById('tb-border');

  if (tbAccent) {
    function updateThemeFromBar() {
      themeAccent      = tbAccent.value;
      themeBg          = tbBg.value;
      themeSurface     = tbSurface.value;
      themeBorderColor = tbBorderColor.value;
      themeFontColor   = tbFontColor.value;
      themeFont        = tbFont.value;
      themeRadius      = tbRadius.value;
      themeBorder      = tbBorder.value;
      applyTheme();
      scheduleSave();
    }
    tbAccent.addEventListener('input',      updateThemeFromBar);
    tbBg.addEventListener('input',          updateThemeFromBar);
    tbSurface.addEventListener('input',     updateThemeFromBar);
    tbBorderColor.addEventListener('input', updateThemeFromBar);
    tbFontColor.addEventListener('input',   updateThemeFromBar);
    tbFont.addEventListener('change',       updateThemeFromBar);
    tbRadius.addEventListener('change',     updateThemeFromBar);
    tbBorder.addEventListener('change',     updateThemeFromBar);
  }

  // ── Crop modal ───────────────────────────────

  const cropCanvas = document.getElementById('crop-canvas');
  if (cropCanvas) {
    function _cropPointerDown(clientX, clientY) {
      const r  = cropCanvas.getBoundingClientRect();
      _cropStartX   = clientX - r.left;
      _cropStartY   = clientY - r.top;
      _cropDragging = true;
      _cropX = _cropStartX; _cropY = _cropStartY; _cropW = 0; _cropH = 0;
    }
    function _cropPointerMove(clientX, clientY) {
      if (!_cropDragging) return;
      const r = cropCanvas.getBoundingClientRect();
      const x = Math.max(0, Math.min(cropCanvas.width,  clientX - r.left));
      const y = Math.max(0, Math.min(cropCanvas.height, clientY - r.top));
      _cropX = Math.min(_cropStartX, x);
      _cropY = Math.min(_cropStartY, y);
      _cropW = Math.abs(x - _cropStartX);
      _cropH = Math.abs(y - _cropStartY);
      _redrawCrop();
    }
    cropCanvas.addEventListener('mousedown',  e => _cropPointerDown(e.clientX, e.clientY));
    document.addEventListener('mousemove',    e => _cropPointerMove(e.clientX, e.clientY));
    document.addEventListener('mouseup',      ()  => { _cropDragging = false; });
    cropCanvas.addEventListener('touchstart', e => { e.preventDefault(); _cropPointerDown(e.touches[0].clientX, e.touches[0].clientY); }, { passive: false });
    cropCanvas.addEventListener('touchmove',  e => { e.preventDefault(); _cropPointerMove(e.touches[0].clientX, e.touches[0].clientY); }, { passive: false });
    cropCanvas.addEventListener('touchend',   ()  => { _cropDragging = false; });
    document.getElementById('crop-confirm').addEventListener('click', confirmCrop);
    document.getElementById('crop-cancel').addEventListener('click',  closeCropModal);
  }

  // ── Container picker ────────────────────────

  addContainerBtn.addEventListener('click', e => {
    e.stopPropagation();
    containerPicker.style.display = 'block';
    requestAnimationFrame(() => {
      const rect = addContainerBtn.getBoundingClientRect();
      const h    = containerPicker.offsetHeight;
      containerPicker.style.top  = (rect.top - h - 6 + window.scrollY) + 'px';
      containerPicker.style.left = rect.left + 'px';
    });
  });

  containerPicker.addEventListener('click', e => {
    e.stopPropagation();
    const opt = e.target.closest('[data-cols]');
    const pre = e.target.closest('[data-preset]');
    if (opt) {
      addContainer(parseInt(opt.dataset.cols));
      containerPicker.style.display = 'none';
    }
    if (pre && pre.dataset.preset === 'five-minutes') {
      addFiveMinutesPreset();
      containerPicker.style.display = 'none';
    }
  });

  // ── Block picker ─────────────────────────────

  blockPicker.addEventListener('click', e => {
    e.stopPropagation();
    const opt = e.target.closest('[data-type]');
    if (!opt) return;
    addBlock(opt.dataset.type);
    blockPicker.style.display = 'none';
    activeCol = null;
  });

  document.addEventListener('click', () => {
    containerPicker.style.display = 'none';
    blockPicker.style.display     = 'none';
  });

  // ── Preview mode ─────────────────────────────

  if (previewBtn) {
    previewBtn.addEventListener('click', () => {
      document.body.classList.toggle('preview-mode');
      previewBtn.textContent = document.body.classList.contains('preview-mode') ? 'Edit' : 'Preview';
    });
  }

  new MutationObserver(() => {
    const inPreview = document.body.classList.contains('preview-mode');
    page.querySelectorAll('.block').forEach(b => b.setAttribute('draggable', inPreview ? 'false' : 'true'));
  }).observe(document.body, { attributes: true, attributeFilter: ['class'] });

  // ── Format bar ───────────────────────────────

  document.addEventListener('selectionchange', () => {
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed || !sel.toString().trim()) {
      formatBar.style.display = 'none'; return;
    }
    const editable = sel.anchorNode?.parentElement?.closest('[contenteditable]');
    if (!editable) { formatBar.style.display = 'none'; return; }

    const rect = sel.getRangeAt(0).getBoundingClientRect();
    if (!rect.width) return;
    formatBar.style.display = 'flex';

    requestAnimationFrame(() => {
      const bh = formatBar.offsetHeight, bw = formatBar.offsetWidth;
      let top  = rect.top + window.scrollY - bh - 8;
      let left = rect.left + window.scrollX + rect.width / 2 - bw / 2;
      left = Math.max(8, Math.min(left, window.innerWidth - bw - 8));
      if (top < window.scrollY + 8) top = rect.bottom + window.scrollY + 8;
      formatBar.style.top  = top + 'px';
      formatBar.style.left = left + 'px';
    });
    syncFmtActive();
  });

  formatBar.addEventListener('mousedown', e => e.preventDefault());
  formatBar.addEventListener('click', e => {
    const btn = e.target.closest('[data-cmd]');
    if (!btn) return;
    document.execCommand(btn.dataset.cmd, false, null);
    syncFmtActive(); scheduleSave();
  });
  fmtSize.addEventListener('mousedown', e => e.stopPropagation());
  fmtSize.addEventListener('change', () => {
    if (fmtSize.value) document.execCommand('fontSize', false, fmtSize.value);
    fmtSize.value = ''; scheduleSave();
  });
  document.addEventListener('mousedown', e => {
    if (!formatBar.contains(e.target)) formatBar.style.display = 'none';
  });
}

// ─────────────────────────────────────────────
//  Block picker (standalone fn — called from inline onclick)
// ─────────────────────────────────────────────

function openBlockPicker(e, col) {
  e.stopPropagation();
  activeCol = col;
  blockPicker.style.display = 'block';

  requestAnimationFrame(() => {
    const btn  = col.querySelector('.col-add-btn');
    const rect = btn.getBoundingClientRect();
    const h    = blockPicker.offsetHeight;
    const w    = blockPicker.offsetWidth;
    let top    = rect.top - h - 6 + window.scrollY;
    let left   = rect.left + window.scrollX;
    if (top < window.scrollY + 8) top = rect.bottom + window.scrollY + 8;
    left = Math.max(8, Math.min(left, window.innerWidth - w - 8));
    blockPicker.style.top  = top + 'px';
    blockPicker.style.left = left + 'px';
  });
}

function syncFmtActive() {
  formatBar.querySelectorAll('[data-cmd]').forEach(btn => {
    try { btn.classList.toggle('is-active', document.queryCommandState(btn.dataset.cmd)); } catch(_){}
  });
}

// ─────────────────────────────────────────────
//  Load saved state
// ─────────────────────────────────────────────

function loadSave() {
  const raw = localStorage.getItem('yumearchive_v1');
  if (!raw) return;
  try {
    const { containers } = JSON.parse(raw);
    containers.forEach(c => {
      const numId = parseInt(c.id);
      if (numId > idCounter) idCounter = numId;

      const wrap = addContainer(c.cols, c.id);

      c.columns.forEach((colData, i) => {
        const col = wrap.querySelectorAll('.col')[i];
        if (!col) return;
        col.dataset.id = colData.id;
        colData.blocks.forEach(b => {
          const bNum = parseInt(b.id);
          if (bNum > idCounter) idCounter = bNum;
          addBlock(b.type, b.data, b.id, col);
        });
      });
    });
  } catch(e) { console.warn('Load failed', e); }
}

// loadSave() — deferred; called by React via window.loadDraft / window.initBuilder

// ─────────────────────────────────────────────
//  Publish (called from edit page)
// ─────────────────────────────────────────────

window.initBuilder = function(slug, existingData) {
  initBuilderDOM();
  window.__ys_slug = slug;

  // Load existing published data if no local draft
  const draftKey = `yumearchive_draft_${slug}`;
  const hasDraft = localStorage.getItem(draftKey);
  if (!hasDraft && existingData && existingData.containers) {
    restoreColors(existingData.colors);
    restoreTheme(existingData.theme);
    existingData.containers.forEach(c => {
      const numId = parseInt(c.id);
      if (numId > idCounter) idCounter = numId;
      const wrap = addContainer(c.cols, c.id);
      c.columns.forEach((colData, i) => {
        const col = wrap.querySelectorAll('.col')[i];
        if (!col) return;
        col.dataset.id = colData.id;
        colData.blocks.forEach(b => {
          const bNum = parseInt(b.id);
          if (bNum > idCounter) idCounter = bNum;
          addBlock(b.type, b.data, b.id, col);
        });
      });
    });
    applyGlobalColors();
  }
};

window.publishArchive = async function(password) {
  const slug = window.__ys_slug;
  if (!slug) return { ok: false, error: 'No slug set' };

  const containers = readPageState();
  const res = await fetch(`/api/archive/${slug}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password, data: { containers, colors: { a: colorA, b: colorB }, theme: { accent: themeAccent, bg: themeBg, surface: themeSurface, borderColor: themeBorderColor, fontColor: themeFontColor, font: themeFont, radius: themeRadius, border: themeBorder } } }),
  });
  const json = await res.json();
  return { ok: res.ok, error: json.error };
};

// commitSave override — uses slug-specific localStorage key
function commitSave() {
  const slug = window.__ys_slug;
  const key  = slug ? `yumearchive_draft_${slug}` : 'yumearchive_v1';
  const containers = readPageState();
  const theme = { accent: themeAccent, bg: themeBg, surface: themeSurface, borderColor: themeBorderColor, fontColor: themeFontColor, font: themeFont, radius: themeRadius, border: themeBorder };
  localStorage.setItem(key, JSON.stringify({ containers, colors: { a: colorA, b: colorB }, theme }));
  if (saveIndicator) {
    saveIndicator.textContent = 'draft saved';
    setTimeout(() => { saveIndicator.textContent = ''; }, 2000);
  }
}

function restoreColors(saved) {
  if (!saved) return;
  if (saved.a) colorA = saved.a;
  if (saved.b) colorB = saved.b;
  applyGlobalColors();
}

// Override loadSave to use slug-specific key
window.loadDraft = function(slug) {
  initBuilderDOM();
  window.__ys_slug = slug;
  const key = `yumearchive_draft_${slug}`;
  const raw = localStorage.getItem(key);
  if (!raw) return false;
  try {
    const { containers, colors, theme } = JSON.parse(raw);
    restoreColors(colors);
    restoreTheme(theme);
    containers.forEach(c => {
      const numId = parseInt(c.id);
      if (numId > idCounter) idCounter = numId;
      const wrap = addContainer(c.cols, c.id);
      c.columns.forEach((colData, i) => {
        const col = wrap.querySelectorAll('.col')[i];
        if (!col) return;
        col.dataset.id = colData.id;
        colData.blocks.forEach(b => {
          const bNum = parseInt(b.id);
          if (bNum > idCounter) idCounter = bNum;
          addBlock(b.type, b.data, b.id, col);
        });
      });
    });
    applyGlobalColors();
    return true;
  } catch(e) { return false; }
};

// ─────────────────────────────────────────────
//  Public viewer — no editor chrome needed
// ─────────────────────────────────────────────

window.initViewer = function(slug, data) {
  page       = document.getElementById('page');
  emptyState = null;

  if (!data || !data.containers) return;
  restoreColors(data.colors);
  restoreTheme(data.theme);
  data.containers.forEach(c => {
    const numId = parseInt(c.id);
    if (numId > idCounter) idCounter = numId;
    const wrap = addContainer(c.cols, c.id);
    c.columns.forEach((colData, i) => {
      const col = wrap.querySelectorAll('.col')[i];
      if (!col) return;
      col.dataset.id = colData.id;
      colData.blocks.forEach(b => {
        const bNum = parseInt(b.id);
        if (bNum > idCounter) idCounter = bNum;
        addBlock(b.type, b.data, b.id, col);
      });
    });
  });
  applyGlobalColors();

  // Lock everything — nothing editable on the public page
  page.querySelectorAll('[contenteditable]').forEach(el => el.setAttribute('contenteditable', 'false'));
  page.querySelectorAll('input, select, textarea, button').forEach(el => { el.disabled = true; el.tabIndex = -1; });
  page.querySelectorAll('.block').forEach(el => el.setAttribute('draggable', 'false'));
  page.querySelectorAll('.axis-dot, .axis-track').forEach(el => el.style.pointerEvents = 'none');
  page.querySelectorAll('.portrait-img-wrap').forEach(el => el.onclick = null);
};
