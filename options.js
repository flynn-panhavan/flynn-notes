'use strict';
/* Flynn Notes – settings page */

const $ = (s, r = document) => r.querySelector(s);
let prefs = { ...DEFAULT_PREFS }, notes = {}, recording = null, commands = [];
let toastTimer;
function toast(msg) {
  const t = $('#toast'); t.textContent = msg; t.hidden = false;
  clearTimeout(toastTimer); toastTimer = setTimeout(() => (t.hidden = true), 2600);
}
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
async function update(changes) {
  prefs = { ...prefs, ...changes };
  await savePrefs(prefs); applyPrefsToRoot(prefs);
}
const SAMPLE = 'សួស្តី — Hello! <b>Write</b> something warm, 1234567890.';
const PAGE_COLORS = [['', 'Theme default'], ['#ffffff', 'White'], ['#fffbe6', 'Warm paper'], ['#eefaf3', 'Mint'], ['#eaf4ff', 'Sky'], ['#fff0f3', 'Blush'], ['#f3efff', 'Lavender'], ['#1e1f26', 'Graphite']];

/* ---------- sections ---------- */
const head = (title, sub, extra = '') => `<header class="ph row"><div class="grow"><h1>${title}</h1><p>${sub}</p></div>${extra}</header>`;
const livePreview = () => `
  <div class="card live"><div class="card-h"><h3>Live preview</h3><span class="muted">Updates as you change things</span></div>
    <div class="mini"><div class="mini-bar"><i></i><i></i><i></i><span>Weekend in Siem Reap</span></div>
      <div class="mini-page"><h4>Weekend in Siem Reap <i class="fa-solid fa-star star"></i></h4>
        <p>${SAMPLE}</p>
        <ul><li>Book the sunrise tour</li><li>Charge the camera</li></ul>
        <ul class="check"><li class="done">Pack the camera</li><li>Buy temple tickets</li></ul>
        <blockquote>The quick brown fox jumps over the lazy dog.</blockquote>
        <pre>const trip = plan('Angkor');</pre>
        <p>More ideas on <span class="lnk">this link</span>.</p></div></div></div>`;

const THEMES = [['light', 'Light', 'Clean and bright'], ['dark', 'Dark', 'Easy on the eyes'], ['anime', 'Anime Night', 'Deep violet under the stars']];
const mock = k => `<span class="mock ${k}"><span class="mk-s"><i></i><i></i><i></i><i></i></span><span class="mk-m"><b></b><i></i><i class="s"></i><i></i></span></span>`;

function renderAppearance() {
  $('#appearance').innerHTML = head('Appearance', 'Pick the look of the side panel and the page you write on.') + `
    <div class="cols"><div class="stack">
      <div class="card"><div class="card-h"><h3>Theme</h3></div>
        <div class="picks">${THEMES.map(([k, l, d]) => `<button class="pick ${prefs.theme === k ? 'on' : ''}" data-theme-pick="${k}">${mock(k)}<b>${l}</b><small>${d}</small><span class="ck"><i class="fa-solid fa-check"></i></span></button>`).join('')}</div></div>
      <div class="card"><div class="card-h"><h3>Writing page color</h3></div>
        <div class="colors">${PAGE_COLORS.map(([c, l]) => `<button class="dotc ${prefs.pageColor === c ? 'on' : ''}" data-page="${c}" title="${l}" style="${c ? 'background:' + c : ''}">${c ? '' : '<i class="fa-solid fa-ban"></i>'}</button>`).join('')}
          <label class="row" style="gap:10px"><input type="color" id="pageCustom" value="${prefs.pageColor || '#ffffff'}" title="Custom color"><span class="muted">Custom</span></label></div>
        <p class="muted" style="margin-top:16px">Changes the background behind your text. The default Light theme is pure white.</p></div>
      <div class="card"><div class="card-h"><h3>Animation</h3><span class="muted">Panel and settings</span></div>
        <div class="seg" id="motionSeg">${[['full', 'Lively'], ['subtle', 'Subtle'], ['off', 'Off']].map(([k, l]) => `<button data-motion-pick="${k}" class="${prefs.motion === k ? 'on' : ''}">${l}</button>`).join('')}</div>
        <p class="muted" style="margin-top:14px"><b>Lively</b> adds cascading lists, bouncy stars and checkboxes, and a smooth toolbar. <b>Subtle</b> keeps only quick fades. <b>Off</b> turns every animation off. Your system’s “reduce motion” setting is always respected.</p></div>
    </div><div class="stack sticky">${livePreview()}</div></div>`;
  $('#appearance').onclick = e => {
    const t = e.target.closest('[data-theme-pick]'), p = e.target.closest('[data-page]'), mo = e.target.closest('[data-motion-pick]');
    if (mo) update({ motion: mo.dataset.motionPick }).then(() => { renderAppearance(); toast(`Animation: ${mo.textContent}`); });
    if (t) update({ theme: t.dataset.themePick }).then(renderAppearance);
    if (p) update({ pageColor: p.dataset.page }).then(renderAppearance);
  };
  $('#pageCustom').oninput = e => update({ pageColor: e.target.value });
  $('#pageCustom').onchange = renderAppearance;
}

function renderTypography() {
  $('#typography').innerHTML = head('Typography', 'Defaults for every note. You can still change the font or size of any selection from the editor toolbar.') + `
    <div class="cols"><div class="card"><div class="card-h"><h3>Font</h3></div>
      <div class="fonts">${Object.entries(FONTS).map(([k, f]) => `
        <button class="font ${prefs.fontFamily === k ? 'on' : ''}" data-font="${k}">
          <span class="nm">${f.label}<small>${f.hint}</small></span>
          <span class="pv" style="font-family:${esc(f.stack)}">${SAMPLE.replace(/<\/?b>/g, '')}</span><span class="ck"><i class="fa-solid fa-check"></i></span></button>`).join('')}</div></div>
    <div class="stack sticky">
      <div class="card"><div class="card-h"><h3>Size and spacing</h3></div>
        <div class="slider"><span>Font size</span><input type="range" id="fs" min="12" max="32" step="1" value="${prefs.fontSize}"><output id="fsv">${prefs.fontSize}px</output></div>
        <div class="slider"><span>Line height</span><input type="range" id="lh" min="1.3" max="2.2" step="0.05" value="${prefs.lineHeight}"><output id="lhv">${(+prefs.lineHeight).toFixed(2)}</output></div>
        <div class="row" style="margin-top:18px"><span style="width:96px">Font style</span>
          <div class="seg" id="styleSeg">${[['regular', 'Regular'], ['italic', 'Italic'], ['bold', 'Bold']].map(([k, l]) => `<button data-style="${k}" class="${prefs.fontStyle === k ? 'on' : ''}">${l}</button>`).join('')}</div></div>
        <p class="warn" id="fsWarn" ${prefs.fontSize < 16 && /battambang/.test(prefs.fontFamily) ? '' : 'hidden'}><i class="fa-solid fa-triangle-exclamation"></i> Battambang loses clarity below 16px. Try 16px or larger.</p></div>
      ${livePreview()}</div></div>`;
  const t = $('#typography');
  t.onclick = e => {
    const f = e.target.closest('[data-font]'), s = e.target.closest('[data-style]');
    if (f) update({ fontFamily: f.dataset.font }).then(renderTypography);
    if (s) update({ fontStyle: s.dataset.style }).then(renderTypography);
  };
  const warn = () => { $('#fsWarn').hidden = !(prefs.fontSize < 16 && /battambang/.test(prefs.fontFamily)); };
  $('#fs').oninput = e => { $('#fsv').textContent = e.target.value + 'px'; update({ fontSize: +e.target.value }).then(warn); };
  $('#lh').oninput = e => { $('#lhv').textContent = (+e.target.value).toFixed(2); update({ lineHeight: +e.target.value }); };
}

/* colors */
const SW = ['#e03131', '#f08c00', '#2f9e44', '#1c7ed6', '#7048e8', '#d6336c', '#0b7285', '#495057', '#1c2233', '#ffffff'];
const COLOR_GROUPS = [
  ['Writing box', 'The page you type on.', [
    ['page', 'Background', 'Behind your text', PAGE_COLORS.filter(c => c[0]).map(c => c[0])],
    ['text', 'Text', 'Default text color', ['#1c2233', '#2b3250', '#495057', '#0b7285', '#a61e4d', '#eef0f7', '#ffffff']]]],
  ['Lists and marks', 'Small details that make a page yours.', [
    ['bullet', 'Bullets and numbers', 'List markers', SW],
    ['check', 'Checkboxes', 'Ticked boxes in checklists', SW],
    ['quote', 'Quote bar', 'The line beside quotes', SW],
    ['link', 'Links', 'Clickable links', ['#1c7ed6', '#4c5cff', '#0b7285', '#2f9e44', '#d6336c', '#e03131', '#7048e8']],
    ['star', 'Favorite star', 'Starred notes', ['#f59f00', '#f08c00', '#e03131', '#d6336c', '#7048e8', '#1c7ed6', '#2f9e44']]]],
  ['Code', 'Code blocks and inline code.', [
    ['codeBg', 'Code background', 'Behind code', ['#f6f7fb', '#fff3a3', '#d0ebff', '#c3fae8', '#ffdeeb', '#e5dbff', '#1e1f26', '#0f172a']],
    ['codeInk', 'Code text', 'Color of code', ['#1c2233', '#c92a2a', '#2b8a3e', '#1864ab', '#6741d9', '#a61e4d', '#f8f9fa', '#ffd43b']]]],
];
const colorOf = k => k === 'page' ? prefs.pageColor : (prefs.colors[k] || '');
function renderColors() {
  const row = ([k, name, hint, list]) => {
    const cur = colorOf(k).toLowerCase();
    return `<div class="crow" data-ckey="${k}"><div class="ct"><b>${name}</b><small>${hint}</small></div>
      <div class="swatches"><button class="dotc sm ${cur ? '' : 'on'}" data-cval="" title="Theme default"><i class="fa-solid fa-ban"></i></button>
        ${list.map(c => `<button class="dotc sm ${cur === c.toLowerCase() ? 'on' : ''}" data-cval="${c}" title="${c}" style="background:${c}"></button>`).join('')}
        <input type="color" class="cpick" value="${/^#[0-9a-f]{6}$/i.test(cur) ? cur : (list[0] || '#4c5cff')}" title="Custom color"></div></div>`;
  };
  $('#colors').innerHTML = head('Colors', 'Choose the colors used inside your notes. Pick “none” to go back to the theme color.',
      '<button class="outline" id="colorsReset"><i class="fa-solid fa-rotate-left"></i>Reset colors</button>') + `
    <div class="cols"><div class="stack">${COLOR_GROUPS.map(([t, sub, rows]) => `<div class="card"><div class="card-h"><h3>${t}</h3><span class="muted">${sub}</span></div>${rows.map(row).join('')}</div>`).join('')}</div>
    <div class="stack sticky">${livePreview()}</div></div>`;
  const setColor = k => v => k === 'page' ? update({ pageColor: v }) : update({ colors: { ...prefs.colors, [k]: v } });
  const root = $('#colors');
  root.onclick = async e => {
    const b = e.target.closest('[data-cval]'); if (!b) return;
    await setColor(b.closest('[data-ckey]').dataset.ckey)(b.dataset.cval);
    renderColors(); renderAppearance();
  };
  root.querySelectorAll('.cpick').forEach(inp => {
    inp.oninput = () => setColor(inp.closest('[data-ckey]').dataset.ckey)(inp.value);
    inp.onchange = () => { renderColors(); renderAppearance(); };
  });
  $('#colorsReset').onclick = async () => { await update({ colors: {}, pageColor: '' }); renderColors(); renderAppearance(); toast('Colors reset'); };
}

function renderEditor() {
  $('#editor').innerHTML = head('Editor', 'How writing feels.') + `
    <div class="cols"><div class="card">
      <label class="sw-row"><span class="tx">Spell check<small>Underlines misspelled words. Right-click a word for suggestions.</small></span>
        <span class="switch"><input type="checkbox" id="spell" ${prefs.spellcheck ? 'checked' : ''}><i></i></span></label>
      <label class="sw-row"><span class="tx">Show toolbar<small>The formatting toolbar above your text. Press <kbd>Alt</kbd> + <kbd>T</kbd> to hide or show it while writing.</small></span>
        <span class="switch"><input type="checkbox" id="tbShow" ${prefs.toolbarHidden ? '' : 'checked'}><i></i></span></label>
      <label class="sw-row"><span class="tx">Pin toolbar<small>Pinned keeps the toolbar always visible. Unpinned slides it away while you type and brings it back when you move the pointer to the top. Shortcut: <kbd>Alt</kbd> + <kbd>P</kbd>.</small></span>
        <span class="switch"><input type="checkbox" id="tbPin" ${prefs.toolbarPinned !== false ? 'checked' : ''}><i></i></span></label>
      <label class="sw-row"><span class="tx">Auto-format while typing<small>Turns shortcuts like <kbd>-</kbd> + Space into lists and headings as you write. Enter continues a list; Enter on an empty item ends it.</small></span>
        <span class="switch"><input type="checkbox" id="auto" ${prefs.autoFormat ? 'checked' : ''}><i></i></span></label>
      <div class="sw-row"><span class="tx">Spell check languages<small>Chrome checks against the languages you enable in its own settings.</small></span>
        <button class="outline" id="langs"><i class="fa-solid fa-arrow-up-right-from-square"></i>Chrome language settings</button></div>
    </div>
    <div class="card"><div class="card-h"><h3>Auto-format cheat sheet</h3><span class="muted">Type, then press Space</span></div>
      <div class="cheat">
        <div><em><kbd>-</kbd><kbd>*</kbd></em><span>Bullet list</span></div>
        <div><em><kbd>1.</kbd></em><span>Numbered list</span></div>
        <div><em><kbd>[]</kbd></em><span>Checklist</span></div>
        <div><em><kbd>#</kbd></em><span>Heading 1</span></div>
        <div><em><kbd>##</kbd></em><span>Heading 2</span></div>
        <div><em><kbd>&gt;</kbd></em><span>Quote</span></div>
      </div></div></div>`;
  $('#spell').onchange = e => update({ spellcheck: e.target.checked });
  $('#auto').onchange = e => update({ autoFormat: e.target.checked });
  $('#tbShow').onchange = e => update({ toolbarHidden: !e.target.checked });
  $('#tbPin').onchange = e => update({ toolbarPinned: e.target.checked });
  $('#langs').onclick = () => chrome.tabs.create({ url: 'chrome://settings/languages' });
}

/* shortcuts */
function chipHtml(id, k) { return `<span class="chip">${esc(k)}<button data-del="${id}" data-key="${esc(k)}" title="Remove"><i class="fa-solid fa-xmark"></i></button></span>`; }
function renderShortcuts() {
  const groups = [...new Set(ACTIONS.map(a => a.group))];
  const globals = commands.filter(c => c.name !== '_execute_action').map(c => `<div class="sc"><span class="nm" style="width:auto;flex:1">${esc(c.description)}</span><div class="chips" style="flex:none">${c.shortcut ? `<kbd>${esc(c.shortcut)}</kbd>` : '<span class="none">Not set</span>'}</div></div>`).join('');
  $('#shortcuts').innerHTML = head('Shortcuts', 'Every tool can have its own keys. Click “Add” and press the new combination. Use Ctrl or Alt, plus a key.',
      '<button class="outline" id="resetAll"><i class="fa-solid fa-rotate-left"></i>Reset all</button>') + `
    <div class="grid">
      <div class="card"><div class="card-h"><h3>Browser-wide</h3><span class="muted">Work on any page</span></div>${globals}
        <div class="row" style="margin-top:14px"><button class="tiny" id="gsc"><i class="fa-solid fa-arrow-up-right-from-square"></i>Change at chrome://extensions/shortcuts</button></div></div>
      ${groups.map(g => `<div class="card"><div class="card-h"><h3 class="grp-t" style="margin:0">${g}</h3></div>` + ACTIONS.filter(a => a.group === g).map(a => {
        const ks = keysFor(prefs, a.id), custom = Array.isArray(prefs.shortcuts[a.id]);
        const body = ks.map(k => chipHtml(a.id, k)).join('') || '<span class="none">None</span>';
        return `<div class="sc" data-row="${a.id}"><span class="nm">${a.label}</span>
          <div class="chips">${body}${recording === a.id ? '<span class="rec">Press keys… (Esc to cancel)</span>' : ''}</div>
          <button class="tiny" data-add="${a.id}"><i class="fa-solid fa-plus"></i>Add</button>
          ${custom ? `<button class="tiny" data-reset="${a.id}" title="Back to default"><i class="fa-solid fa-rotate-left"></i></button>` : ''}</div>`;
      }).join('') + (g === 'Lists' ? '<p class="muted" style="margin-top:12px"><kbd>Ctrl</kbd> + <kbd>-</kbd> and <kbd>Ctrl</kbd> + <kbd>.</kbd> both start a bullet list by default.</p>' : '') + '</div>').join('')}
    </div>`;
  $('#gsc').onclick = () => chrome.tabs.create({ url: 'chrome://extensions/shortcuts' });
  $('#resetAll').onclick = async () => { await update({ shortcuts: {} }); recording = null; renderShortcuts(); toast('Shortcuts reset'); };
  $('#shortcuts').onclick = async e => {
    const add = e.target.closest('[data-add]'), del = e.target.closest('[data-del]'), rst = e.target.closest('[data-reset]');
    if (add) { recording = add.dataset.add; renderShortcuts(); }
    if (del) { const id = del.dataset.del; await update({ shortcuts: { ...prefs.shortcuts, [id]: keysFor(prefs, id).filter(k => k !== del.dataset.key) } }); renderShortcuts(); }
    if (rst) { const s = { ...prefs.shortcuts }; delete s[rst.dataset.reset]; await update({ shortcuts: s }); renderShortcuts(); }
  };
}
document.addEventListener('keydown', async e => {
  if (!recording) return;
  e.preventDefault(); e.stopPropagation();
  if (e.key === 'Escape') { recording = null; return renderShortcuts(); }
  const combo = comboFromEvent(e); if (!combo) return; // waiting for a real key
  const owner = buildKeymap(prefs).get(combo);
  if (owner && owner !== recording) return toast(`${combo} is already used by “${ACTION_MAP[owner].label}”`);
  const id = recording; recording = null;
  if (!keysFor(prefs, id).includes(combo)) await update({ shortcuts: { ...prefs.shortcuts, [id]: [...keysFor(prefs, id), combo] } });
  renderShortcuts(); toast(`${ACTION_MAP[id].label}: ${combo}`);
}, true);

/* storage */
function renderStorage() {
  const n = Object.keys(notes).length, st = FS.state;
  const pill = st === 'ready' ? `<span class="status-pill ok"><i class="fa-solid fa-circle-check"></i> Saving to “${esc(FS.dir.name)}”</span>`
    : st === 'needs' ? `<span class="status-pill warn"><i class="fa-solid fa-circle-pause"></i> Paused: “${esc(FS.dir.name)}” needs permission</span>`
    : st === 'unsupported' ? '<span class="status-pill warn">Not supported in this browser</span>' : '<span class="status-pill">No folder chosen</span>';
  const btn = (id, ic, label, cls = 'primary') => `<button class="${cls}" id="${id}"><i class="fa-solid ${ic}"></i>${label}</button>`;
  $('#storage').innerHTML = head('Storage', 'Notes are always kept inside Chrome. Pick a folder to also keep a Markdown copy of every note on your computer.') + `
    <div class="cols even">
    <div class="card"><div class="card-h"><h3>Save folder</h3></div><div class="row" style="margin-bottom:16px">${pill}</div>
      <p class="muted" style="margin-bottom:20px">Each note becomes <kbd>Title [id].md</kbd>, updated as you type. Chrome shows only the folder’s name, never its full path, and may ask you to re-approve access after a restart.</p>
      <div class="row">
        ${st === 'ready' ? btn('fsSync', 'fa-arrows-rotate', 'Write all notes now') + btn('fsChange', 'fa-folder-open', 'Change folder', 'outline') : ''}
        ${st === 'needs' ? btn('fsRe', 'fa-unlock', 'Reconnect') + btn('fsChange', 'fa-folder-open', 'Change folder', 'outline') : ''}
        ${st === 'none' ? btn('fsChange', 'fa-folder-open', 'Choose folder') : ''}
        ${st === 'ready' || st === 'needs' ? btn('fsOff', 'fa-link-slash', 'Disconnect', 'outline danger') : ''}
      </div></div>
    <div class="card"><div class="card-h"><h3>Backup</h3></div><p class="muted" style="margin-bottom:20px"><span class="stat">${n}</span> ${n === 1 ? 'note' : 'notes'} stored in this browser. Import Markdown or text files as notes, export everything to one file, or import a previous export.</p>
      <div class="row"><button class="outline" id="impMd"><i class="fa-solid fa-file-lines"></i>Import notes (.md, .txt)</button>
        <input type="file" id="impMdFile" accept=".md,.markdown,.txt,text/markdown,text/plain" multiple hidden>
        <button class="outline" id="exp"><i class="fa-solid fa-file-export"></i>Export all (.json)</button>
        <button class="outline" id="imp"><i class="fa-solid fa-file-import"></i>Import (.json)</button>
        <input type="file" id="impFile" accept="application/json,.json" hidden></div></div></div>`;
  const on = (id, fn) => { const el = $('#' + id); if (el) el.onclick = fn; };
  on('fsChange', async () => { try { await FS.choose(); await syncAll(); } catch (e) { if (e.name !== 'AbortError') toast('Could not open that folder'); } renderStorage(); });
  on('fsRe', async () => { await FS.reconnect(); if (FS.state === 'ready') await syncAll(); renderStorage(); });
  on('fsSync', syncAll);
  on('fsOff', async () => { await FS.disconnect(); renderStorage(); toast('Folder disconnected'); });
  on('exp', () => {
    const blob = new Blob([JSON.stringify(Object.values(notes), null, 2)], { type: 'application/json' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `flynn-notes-${new Date().toISOString().slice(0, 10)}.json`; a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  });
  on('imp', () => $('#impFile').click());
  on('impMd', () => $('#impMdFile').click());
  $('#impMdFile').onchange = async e => {
    const res = await importTextFiles([...e.target.files]); e.target.value = '';
    for (const n of res.added) notes[n.id] = n;
    toast(importMessage(res)); renderStorage();
  };
  const file = $('#impFile');
  file.onchange = async () => {
    try {
      const arr = JSON.parse(await file.files[0].text()); let added = 0;
      for (const n of Array.isArray(arr) ? arr : []) {
        if (!n || typeof n.id !== 'string' || typeof n.html !== 'string') continue;
        if (notes[n.id] && notes[n.id].modified >= (n.modified || 0)) continue;
        notes[n.id] = await saveNote({ title: '', tags: [], created: Date.now(), modified: Date.now(), ...n }); added++;
      }
      toast(`Imported ${added} ${added === 1 ? 'note' : 'notes'}`); renderStorage();
    } catch { toast('That file is not a Flynn Notes export'); }
  };
}
async function syncAll() {
  notes = await loadNotes();
  for (const n of Object.values(notes)) { const f = await FS.write(n); if (f && f !== n.file) { n.file = f; await chrome.storage.local.set({ ['note:' + n.id]: n }); } }
  toast(FS.state === 'ready' ? 'All notes saved to the folder' : 'Folder access is paused');
}

function renderAbout() {
  const v = chrome.runtime.getManifest().version;
  $('#about').innerHTML = head('About', 'A modern notepad that lives in your browser’s side panel.') + `
    <div class="cols even">
    <div class="card"><div class="about"><span class="logo"><i class="fa-solid fa-feather-pointed"></i></span>
      <div><h3>Flynn Notes <span>v${esc(v)}</span></h3><p class="muted" style="margin-top:6px">Fast writing, folder saving, your fonts, your shortcuts.</p></div></div></div>
    <div class="card"><div class="card-h"><h3>Good to know</h3></div><div class="feat">
      <div><i class="fa-solid fa-window-maximize"></i><span><b>Open it anywhere</b><small>Click the toolbar icon or use the browser-wide shortcut.</small></span></div>
      <div><i class="fa-solid fa-file-import"></i><span><b>Import and print</b><small>Import .md or .txt files as notes, or drop them on the panel. Print any note to A4 paper or save it as a PDF from its ⋯ menu.</small></span></div>
      <div><i class="fa-solid fa-highlighter"></i><span><b>Web clipper</b><small>Select text on any page, right-click, and choose “Save selection to Flynn Notes” to clip it with its source link.</small></span></div>
    </div></div></div>`;
}

/* ---------- start ---------- */
const NAV = [...document.querySelectorAll('#nav a')], PAGE_IDS = NAV.map(a => a.getAttribute('href').slice(1));
function showPage() {
  const h = (location.hash || '#appearance').slice(1), id = PAGE_IDS.includes(h) ? h : 'appearance';
  document.querySelectorAll('#content > section').forEach(sec => { sec.classList.toggle('on', sec.id === id); sec.classList.remove('enter'); });
  const cur = document.getElementById(id); void cur.offsetWidth; cur.classList.add('enter'); setTimeout(() => cur.classList.remove('enter'), 1200);
  NAV.forEach(a => a.classList.toggle('on', a.getAttribute('href') === '#' + id));
  scrollTo(0, 0);
}
addEventListener('hashchange', showPage);
(async function init() {
  prefs = await getPrefs(); applyPrefsToRoot(prefs);
  notes = await loadNotes(); await FS.init();
  try { commands = await chrome.commands.getAll(); } catch { commands = []; }
  renderAppearance(); renderTypography(); renderColors(); renderEditor(); renderShortcuts(); renderStorage(); renderAbout(); showPage();
  chrome.storage.onChanged.addListener((ch, area) => {
    if (area === 'local' && ch.prefs?.newValue) { prefs = { ...DEFAULT_PREFS, ...ch.prefs.newValue }; applyPrefsToRoot(prefs); }
  });
})();
