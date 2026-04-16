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
let activeCol  = null; // column el that the block picker was opened from

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
  emptyState.style.display = 'none';

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
  return wrap;
}

function removeContainer(btn) {
  btn.closest('.container-wrap').remove();
  if (!page.querySelector('.container-wrap')) emptyState.style.display = '';
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
      <button class="toolbar-btn toolbar-btn--sm" title="Move up"   onclick="moveBlock(this,-1)">↑</button>
      <button class="toolbar-btn toolbar-btn--sm" title="Move down" onclick="moveBlock(this, 1)">↓</button>
      <button class="toolbar-btn toolbar-btn--sm toolbar-btn--del"  title="Delete" onclick="removeBlock(this)">✕</button>
    </div>
    <div class="block-body">${blockHTML(type)}</div>
  `;

  // Insert before the "Add block" button
  const addBtn = col.querySelector('.col-add-btn');
  col.insertBefore(block, addBtn);

  if (data) writeBlockData(block, data);

  wireBlockBehavior(block);

  if (!existingId && !data) focusFirstInput(block);

  block.addEventListener('input',  scheduleSave);
  block.addEventListener('change', scheduleSave);

  return block;
}

function removeBlock(btn) {
  btn.closest('.block').remove();
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
};

// ─────────────────────────────────────────────
//  Block HTML templates
// ─────────────────────────────────────────────

function blockHTML(type) {
  switch (type) {

    case 'ship-header': return `
      <div class="ship-header-block">
        <input class="ship-header__name" data-field="name" type="text" placeholder="Your name / S/I name">
        <span class="ship-header__x">×</span>
        <input class="ship-header__fo" data-field="fo" type="text" placeholder="F/O name">
        <input class="ship-header__source" data-field="source" type="text" placeholder="Source — fandom / media">
      </div>`;

    case 'about': return `
      <div class="rich-area" contenteditable="true" data-field="body"
           data-placeholder="Write about your ship…"></div>`;

    case 'ship-tags': return `
      <div class="tag-area" data-tag-field="tags">
        <input class="tag-area__input" type="text" placeholder="rivals-to-lovers, slow burn…">
      </div>`;

    case 'links': return `
      <ul class="links-list"></ul>
      <button class="list-add-btn" onclick="addLinkRow(this.previousElementSibling)">+ add link</button>`;

    case 'dni': return `
      <div class="dni-block">
        <p class="field-label">Please don't interact if you —</p>
        <div class="tag-area" data-tag-field="rules">
          <input class="tag-area__input" type="text" placeholder="anti yume, under 16…">
        </div>
        <div class="rich-area" contenteditable="true" data-field="note"
             data-placeholder="Any additional notes…" style="margin-top:.75rem;"></div>
      </div>`;

    case 'character-portrait': return `
      <div class="portrait-block">
        <div class="portrait-img-wrap" onclick="pickPortraitImg(this)">
          <div class="portrait-placeholder">◫<br><small>click to add image</small></div>
        </div>
        <input class="portrait-label" data-field="label" type="text" placeholder="A · name">
        <input class="portrait-source" data-field="source" type="text" placeholder="source media">
      </div>`;

    case 'speech-bubbles': return `
      <div class="bubbles-block">
        <ul class="bubbles-list"></ul>
        <button class="list-add-btn" onclick="addBubble(this.previousElementSibling, 'me')">+ A</button>
        <button class="list-add-btn" onclick="addBubble(this.previousElementSibling, 'fo')">+ B</button>
      </div>`;

    case 'dynamic-axis': return `
      <div class="axis-block">
        <div class="axis-poles">
          <input class="axis-pole" data-field="left"  type="text" placeholder="left pole">
          <input class="axis-pole axis-pole--right" data-field="right" type="text" placeholder="right pole">
        </div>
        <div class="axis-track" id="">
          <div class="axis-dot axis-dot--a" data-dot="a"></div>
          <div class="axis-dot axis-dot--b" data-dot="b"></div>
        </div>
        <div class="axis-sliders">
          <label class="axis-slider-label">
            <span class="dot-swatch dot-swatch--a"></span> A
            <input type="range" data-field="pos_a" min="0" max="100" value="30">
          </label>
          <label class="axis-slider-label">
            <span class="dot-swatch dot-swatch--b"></span> B
            <input type="range" data-field="pos_b" min="0" max="100" value="70">
          </label>
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
            <input data-field="color_a" type="color" value="#7c6af7" class="ha-color">
            <input data-field="name_a" type="text" placeholder="A" class="ha-name">
            <div class="ha-height-row">
              <input data-field="height_a" type="number" placeholder="160" class="ha-height" min="0">
              <span class="ha-unit">cm</span>
            </div>
          </div>
          <div class="ha-person-label">
            <input data-field="color_b" type="color" value="#f06c9b" class="ha-color">
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
            <input data-field="name_a" type="text" placeholder="A (optional)" class="age-name">
            <input data-field="age_a"  type="text" placeholder="age" class="age-val">
          </div>
          <span class="age-sep">/</span>
          <div class="age-person">
            <input data-field="name_b" type="text" placeholder="B (optional)" class="age-name">
            <input data-field="age_b"  type="text" placeholder="age" class="age-val">
          </div>
        </div>
      </div>`;

    case 'headcanons': return `
      <ul class="hc-list"></ul>
      <button class="list-add-btn" onclick="addHcItem(this.previousElementSibling)">+ add headcanon</button>`;

    case 'gallery': return `
      <div class="gallery-grid"></div>
      <button class="list-add-btn" onclick="promptGalleryImg(this.previousElementSibling)">+ add image</button>`;

    case 'quote-letter': return `
      <div class="quote-block">
        <div class="rich-area quote-body" contenteditable="true" data-field="body"
             data-placeholder="A quote, a letter, a confession…"></div>
        <input class="quote-attr" data-field="attr" type="text" placeholder="— attribution">
      </div>`;

    case 'ship-stats': return `
      <div class="stats-block">
        <div class="stat-row">
          <span class="stat-label">Together since</span>
          <input data-field="since" type="text" placeholder="e.g. 2022, chapter 4…">
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
          <input data-field="dynamic" type="text" placeholder="rivals-to-lovers…">
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

    default: return `<p style="color:#888;font-size:.85rem;">Unknown block: ${escHTML(type)}</p>`;
  }
}

// ─────────────────────────────────────────────
//  Block behavior wiring
// ─────────────────────────────────────────────

function wireBlockBehavior(block) {
  const type = block.dataset.type;

  // Tag areas
  block.querySelectorAll('[data-tag-field]').forEach(wireTagArea);

  // Dynamic axis — sync sliders to dot positions
  if (type === 'dynamic-axis') wireAxis(block);

  // Height diff — sync sliders to bar heights
  if (type === 'height-diff') wireHeightAge(block);
}

function wireAxis(block) {
  const track = block.querySelector('.axis-track');
  const dotA  = block.querySelector('.axis-dot--a');
  const dotB  = block.querySelector('.axis-dot--b');
  const sliderA = block.querySelector('[data-field="pos_a"]');
  const sliderB = block.querySelector('[data-field="pos_b"]');

  function update() {
    dotA.style.left = sliderA.value + '%';
    dotB.style.left = sliderB.value + '%';
  }

  sliderA.addEventListener('input', update);
  sliderB.addEventListener('input', update);
  update();
}

function wireHeightAge(block) {
  const svg    = block.querySelector('.ha-svg');
  const inputA = block.querySelector('[data-field="height_a"]');
  const inputB = block.querySelector('[data-field="height_b"]');
  const colorA = block.querySelector('[data-field="color_a"]');
  const colorB = block.querySelector('[data-field="color_b"]');

  function update() {
    const a   = parseFloat(inputA.value) || 0;
    const b   = parseFloat(inputB.value) || 0;
    const max = Math.max(a, b, 1);
    const baseline = 104;
    const maxH     = 90;

    svg.innerHTML =
      `<line x1="10" y1="${baseline}" x2="110" y2="${baseline}" stroke="#e0e0e0" stroke-width="1"/>` +
      stickmanSVG(35, baseline, maxH * (a / max), colorA.value) +
      stickmanSVG(85, baseline, maxH * (b / max), colorB.value);
  }

  inputA.addEventListener('input', update);
  inputB.addEventListener('input', update);
  colorA.addEventListener('input', update);
  colorB.addEventListener('input', update);
  update();
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
         data-placeholder="${side === 'me' ? 'A: …' : 'B: …'}">${text || ''}</div>
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
           placeholder="first to say I love you…" value="${escAttr(item?.trait)}">
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

function promptGalleryImg(grid, src) {
  const url = src || prompt('Image URL:');
  if (!url) return;
  const cell = document.createElement('div');
  cell.className = 'gallery-cell';
  cell.innerHTML = `
    <img class="gallery-img" src="${escAttr(url)}" alt="">
    <button class="gallery-del" onclick="this.closest('.gallery-cell').remove();scheduleSave();">✕</button>
  `;
  grid.appendChild(cell);
  scheduleSave();
}

function addFicRow(list, item) {
  const li = document.createElement('li');
  li.className = 'fic-row';
  li.innerHTML = `
    <div class="fic-row__meta">
      <input data-field="title"  type="text" placeholder="Fic title"    value="${escAttr(item?.title)}">
      <input data-field="author" type="text" placeholder="Author"       value="${escAttr(item?.author)}">
      <input data-field="url"    type="text" placeholder="Link (AO3…)"  value="${escAttr(item?.url)}">
    </div>
    <input data-field="note" type="text" placeholder="Why you love it…" value="${escAttr(item?.note)}">
    <button class="row-del" onclick="this.closest('li').remove();scheduleSave();">✕</button>
  `;
  list.appendChild(li);
  scheduleSave();
}

function pickPortraitImg(wrap) {
  const url = prompt('Image URL:');
  if (!url) return;
  wrap.innerHTML = `<img src="${escAttr(url)}" alt="" class="portrait-img">`;
  scheduleSave();
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
    data.items.forEach(src => promptGalleryImg(block.querySelector('.gallery-grid'), src));

  if (type === 'links' && data.items)
    data.items.forEach(item => addLinkRow(block.querySelector('.links-list'), item));

  if (type === 'fic-recs' && data.items)
    data.items.forEach(item => addFicRow(block.querySelector('.fic-list'), item));

  if (type === 'character-portrait' && data.img) {
    const wrap = block.querySelector('.portrait-img-wrap');
    if (wrap) wrap.innerHTML = `<img src="${escAttr(data.img)}" alt="" class="portrait-img">`;
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
  }
};

window.publishArchive = async function(password) {
  const slug = window.__ys_slug;
  if (!slug) return { ok: false, error: 'No slug set' };

  const containers = readPageState();
  const res = await fetch(`/api/archive/${slug}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password, data: { containers } }),
  });
  const json = await res.json();
  return { ok: res.ok, error: json.error };
};

// commitSave override — uses slug-specific localStorage key
function commitSave() {
  const slug = window.__ys_slug;
  const key  = slug ? `yumearchive_draft_${slug}` : 'yumearchive_v1';
  const containers = readPageState();
  localStorage.setItem(key, JSON.stringify({ containers }));
  if (saveIndicator) {
    saveIndicator.textContent = 'draft saved';
    setTimeout(() => { saveIndicator.textContent = ''; }, 2000);
  }
}

// Override loadSave to use slug-specific key
window.loadDraft = function(slug) {
  initBuilderDOM();
  window.__ys_slug = slug;
  const key = `yumearchive_draft_${slug}`;
  const raw = localStorage.getItem(key);
  if (!raw) return false;
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
    return true;
  } catch(e) { return false; }
};
