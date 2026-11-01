'use strict';
/* Flynn Notes – side panel (also works as a full-page tab) */

const $ = (s, r = document) => r.querySelector(s);
const editor = $('#editor'), titleEl = $('#title'), listEl = $('#list'), pane = $('#pane');
const drawer = $('#drawer'), scrim = $('#scrim'), searchEl = $('#search');
const fontSel = $('#fontSel'), sizeSel = $('#sizeSel');

let notes = {}, activeId = null, view = 'all', query = '';
let prefs = { ...DEFAULT_PREFS }, keymap = new Map();
let readyResolve; const ready = new Promise(r => (readyResolve = r));

const VIEWS = [['all', 'All notes', 'fa-note-sticky'], ['pinned', 'Pinned', 'fa-thumbtack'], ['fav', 'Favorites', 'fa-star'],
               ['archived', 'Archived', 'fa-box-archive'], ['trash', 'Trash', 'fa-trash-can']];
const uid = newId;
const sameDay = (a, b) => new Date(a).toDateString() === new Date(b).toDateString();
const fmt = ts => sameDay(ts, Date.now())
  ? new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  : new Date(ts).toLocaleDateString([], { month: 'short', day: 'numeric', year: new Date(ts).getFullYear() === new Date().getFullYear() ? undefined : 'numeric' });
let toastTimer;
function toast(msg) {
  const t = $('#toast'); t.textContent = msg; t.hidden = false;
  clearTimeout(toastTimer); toastTimer = setTimeout(() => (t.hidden = true), 2400);
}
const setStatus = (txt, busy) => {
  const s = $('#status'), same = s.classList.contains('busy') === !!busy;
  s.querySelector('span').textContent = txt; s.classList.toggle('busy', !!busy);
  $('footer').classList.toggle('saving', !!busy);
  if (!same) s.querySelector('i').className = 'fa-solid ' + (busy ? 'fa-arrows-rotate fa-spin' : 'fa-circle-check'); // restarts the pop-in
};
// Numbers in the footer tick when they change
function setNum(el, v) {
  v = String(v); if (el.textContent === v) return;
  el.textContent = v; el.classList.remove('bump'); void el.offsetWidth; el.classList.add('bump');
}

/* ---------- preferences ---------- */
function applyPrefs() {
  applyPrefsToRoot(prefs);
  editor.spellcheck = prefs.spellcheck; titleEl.spellcheck = prefs.spellcheck;
  $('[data-cmd="spell"]').classList.toggle('on', prefs.spellcheck);
  $('[data-m="spell"] .tick').style.visibility = prefs.spellcheck ? 'visible' : 'hidden';
  // refresh tooltips with the current shortcuts
  document.querySelectorAll('[data-cmd]').forEach(b => {
    const a = ACTION_MAP[b.dataset.cmd]; if (!a) return;
    const k = keysFor(prefs, a.id)[0];
    b.title = k ? `${a.label} (${k})` : a.label;
  });
  const nk = keysFor(prefs, 'newNote')[0]; $('#newBtn').title = nk ? `New note (${nk})` : 'New note';
  paintToolbar();
  showDefaults();
}
// Toolbar: hidden completely, pinned (always visible) or unpinned (slides away while you type)
function paintToolbar() {
  const hidden = !!prefs.toolbarHidden, pinned = prefs.toolbarPinned !== false;
  pane.classList.toggle('tools-off', hidden);
  pane.classList.toggle('tools-free', !pinned);
  if (pinned || hidden) setAway(false);
  $('#toolsBtn').classList.toggle('on', !hidden);
  const hk = keysFor(prefs, 'toggleTools')[0], pk = keysFor(prefs, 'pinTools')[0];
  $('#toolsBtn').title = (hidden ? 'Show toolbar' : 'Hide toolbar') + (hk ? ` (${hk})` : '');
  $('[data-cmd="pinTools"]').classList.toggle('on', pinned);
  $('[data-cmd="pinTools"]').title = (pinned ? 'Unpin toolbar' : 'Pin toolbar') + (pk ? ` (${pk})` : '');
  $('[data-cmd="toggleTools"]').title = 'Hide toolbar' + (hk ? ` (${hk})` : '');
  $('[data-m="tools"] .tick').style.visibility = hidden ? 'hidden' : 'visible';
  $('[data-m="pintools"] .tick').style.visibility = pinned ? 'visible' : 'hidden';
}
let away = false;
function setAway(v) { if (v === away) return; away = v; pane.classList.toggle('tools-away', v); }
function toggleTools() {
  prefs = { ...prefs, toolbarHidden: !prefs.toolbarHidden }; savePrefs(prefs); applyPrefs();
  toast(prefs.toolbarHidden ? 'Toolbar hidden' : 'Toolbar shown');
}
function pinTools() {
  prefs = { ...prefs, toolbarPinned: !(prefs.toolbarPinned !== false), toolbarHidden: false }; savePrefs(prefs); applyPrefs();
  toast(prefs.toolbarPinned ? 'Toolbar pinned — always visible' : 'Toolbar unpinned — hides while you type');
}
// Unpinned toolbar: slide away on typing, come back when the pointer returns to the top
editor.addEventListener('input', () => { if (!prefs.toolbarPinned && !prefs.toolbarHidden && menu.hidden && colorPop.hidden) setAway(true); });
pane.addEventListener('pointermove', e => { if (away && e.clientY - pane.getBoundingClientRect().top < 110) setAway(false); });
$('#tools').addEventListener('focusin', () => setAway(false));
$('#toolsBtn').onclick = toggleTools;
// Before anything is selected, the dropdowns show the note defaults from Settings.
function showDefaults() {
  if (!sizeSel.options.length) return;
  showOption(sizeSel, prefs.fontSize, prefs.fontSize); showOption(fontSel, prefs.fontFamily, 'Custom font');
}
function toggleSpell() {
  prefs = { ...prefs, spellcheck: !prefs.spellcheck }; savePrefs(prefs); applyPrefs();
  editor.blur(); editor.focus(); // makes Chrome re-check the text
  toast(prefs.spellcheck ? 'Spell check on' : 'Spell check off');
}

/* ---------- notes list ---------- */
function inView(n, v) {
  if (v === 'trash') return !!n.trashed;
  if (n.trashed) return false;
  if (v === 'archived') return !!n.archived;
  if (n.archived) return false;
  if (v === 'pinned') return !!n.pinned;
  if (v === 'fav') return !!n.favorite;
  return true;
}
function visibleNotes() {
  const q = query.trim().toLowerCase();
  let arr = Object.values(notes).filter(n => q ? (view === 'trash' ? n.trashed : !n.trashed) : inView(n, view));
  if (q) arr = arr.filter(n => (titleOf(n) + ' ' + plain(n.html)).toLowerCase().includes(q));
  return arr.sort((a, b) => (!!b.pinned - !!a.pinned) || (b.modified - a.modified));
}
function renderList(anim) {
  $('#cats').innerHTML = VIEWS.map(([k, label, ic]) =>
    `<button data-view="${k}" title="${label}" class="${k === view ? 'on' : ''}"><i class="fa-solid ${ic}"></i><span>${label}</span></button>`).join('');
  const arr = visibleNotes();
  if (!arr.length) {
    const [ic, msg] = query ? ['fa-magnifying-glass', 'No notes match your search.'] : view === 'trash' ? ['fa-trash-can', 'Trash is empty.']
      : view === 'archived' ? ['fa-box-archive', 'No archived notes.'] : view === 'pinned' ? ['fa-thumbtack', 'Pin a note to keep it at the top.']
      : view === 'fav' ? ['fa-star', 'Star a note to find it here.'] : ['fa-feather-pointed', 'Nothing here yet. Press New note to start writing.'];
    listEl.innerHTML = `<li class="empty-list"><i class="fa-solid ${ic}"></i><p>${msg}</p></li>`;
    return;
  }
  listEl.innerHTML = '';
  for (const n of arr) {
    const li = document.createElement('li'); li.dataset.id = n.id; if (n.id === activeId) li.className = 'on';
    if (anim) { li.classList.add('in'); li.style.setProperty('--i', Math.min(listEl.children.length, 12)); }
    const t = document.createElement('div'); t.className = 'li-t';
    const name = document.createElement('span'); name.textContent = titleOf(n); t.append(name);
    if (n.pinned) t.insertAdjacentHTML('beforeend', '<i class="fa-solid fa-thumbtack"></i>');
    if (n.favorite) t.insertAdjacentHTML('beforeend', '<i class="fa-solid fa-star"></i>');
    const s = document.createElement('div'); s.className = 'li-s'; s.textContent = plain(n.html).slice(0, 90) || 'Empty note';
    const d = document.createElement('div'); d.className = 'li-d';
    d.append(fmt(n.modified));
    li.append(t, s, d); listEl.append(li);
  }
}

/* ---------- save pipeline ---------- */
let dirty = false, saveTimer = null;
async function persist(n) { notes[n.id] = n; await saveNote(n); }
function touch() {
  if (!activeId || notes[activeId]?.trashed) return;
  dirty = true; setStatus('Saving…', true);
  clearTimeout(saveTimer); saveTimer = setTimeout(flush, 250);
  updateCounts();
}
async function flush() {
  clearTimeout(saveTimer);
  if (!dirty || !activeId || !notes[activeId]) return;
  dirty = false;
  await persist({ ...notes[activeId], html: editor.innerHTML, title: titleEl.value.trim(), modified: Date.now() });
  setStatus(FS.state === 'needs' ? 'Saved · folder paused' : 'Auto-saved'); updateMeta(); renderList();
}
function updateCounts() {
  const text = editor.innerText.replace(/\u200b/g, '').trim();
  const words = text ? text.split(/\s+/).length : 0;
  setNum($('#wc'), words); setNum($('#cc'), text.length); setNum($('#rt'), words ? Math.max(1, Math.ceil(words / 200)) : 0);
  editor.classList.toggle('is-empty', !text && !editor.querySelector('hr,li,pre'));
}
function updateMeta() {
  const n = notes[activeId]; if (!n) return;
  $('#meta').innerHTML = `<i class="fa-regular fa-clock"></i>Edited ${fmt(n.modified)}`;
  $('#meta').title = `Created ${new Date(n.created).toLocaleString()}\nModified ${new Date(n.modified).toLocaleString()}`;
}
function paintActions() {
  const n = notes[activeId]; if (!n) return;
  const tr = !!n.trashed;
  $('#pinBtn').classList.toggle('on', !!n.pinned); $('#pinBtn').title = n.pinned ? 'Unpin' : 'Pin';
  $('#favBtn').classList.toggle('on', !!n.favorite);
  $('#favBtn i').className = n.favorite ? 'fa-solid fa-star' : 'fa-regular fa-star';
  $('[data-m="archive"] span').textContent = n.archived ? 'Unarchive' : 'Archive';
  $('#pinBtn').hidden = $('#favBtn').hidden = $('#moreBtn').hidden = tr;
  $('#trashBar').hidden = !tr;
  editor.contentEditable = String(!tr); titleEl.readOnly = tr;
  $('#tools').style.opacity = tr ? .4 : 1; $('#tools').style.pointerEvents = tr ? 'none' : '';
}
function loadActive() {
  const n = notes[activeId]; if (!n) return;
  titleEl.value = n.title || ''; editor.innerHTML = n.html || '';
  paintActions(); updateCounts(); updateMeta(); setStatus('Auto-saved'); showDefaults();
}
async function openNote(id, focus) {
  await flush();
  if (!notes[id]) return;
  activeId = id; chrome.storage.local.set({ activeSide: id });
  loadActive(); renderList(); closeDrawer();
  for (const el of [titleEl, editor]) { el.classList.remove('swap'); void el.offsetWidth; el.classList.add('swap'); }
  if (focus) editor.focus();
}
async function newNote() {
  await flush();
  const now = Date.now();
  const n = { id: uid(), title: '', html: '', created: now, modified: now, pinned: false, favorite: false, archived: false, trashed: false };
  await persist(n);
  view = 'all'; query = ''; searchEl.value = '';
  await openNote(n.id); titleEl.focus();
}
function pickNext() {
  const arr = visibleNotes();
  if (arr.length) return openNote(arr[0].id);
  const other = Object.values(notes).filter(n => !n.trashed && !n.archived).sort((a, b) => b.modified - a.modified)[0];
  return other ? openNote(other.id) : newNote();
}
async function patch(changes, msg) {
  await flush();
  await persist({ ...notes[activeId], ...changes, modified: Date.now() });
  paintActions(); renderList(); updateMeta();
  if (msg) toast(msg);
  if (!inView(notes[activeId], view) && !query) pickNext();
}
const togglePin = () => patch({ pinned: !notes[activeId].pinned });
const toggleFav = () => patch({ favorite: !notes[activeId].favorite });
$('#pinBtn').onclick = togglePin;
$('#favBtn').onclick = toggleFav;
$('#restoreBtn').onclick = () => patch({ trashed: false }, 'Restored');
$('#purgeBtn').onclick = async () => {
  if (!confirm('Delete this note forever? This cannot be undone.')) return;
  const n = notes[activeId]; dirty = false;
  await FS.remove(n); delete notes[n.id];
  await chrome.storage.local.remove('note:' + n.id);
  toast('Deleted'); pickNext();
};

/* ---------- drawer, search, folders ---------- */
const openDrawer = () => { drawer.classList.add('open'); scrim.hidden = false; renderList(true); };
function closeDrawer() { drawer.classList.remove('open'); scrim.hidden = true; }
const toggleDrawer = () => (drawer.classList.contains('open') ? closeDrawer() : openDrawer());
$('#menuBtn').onclick = toggleDrawer;
scrim.onclick = closeDrawer;
$('#newBtn').onclick = newNote;
searchEl.oninput = () => { query = searchEl.value; renderList(); };
$('#cats').onclick = e => { const b = e.target.closest('[data-view]'); if (b) { view = b.dataset.view; renderList(true); } };
listEl.onclick = e => { const li = e.target.closest('li[data-id]'); if (li) openNote(li.dataset.id, true); };
const openSettings = () => chrome.runtime.openOptionsPage();
const importInput = $('#importFile');
const pickImport = () => importInput.click();
async function importFiles(files) {
  files = [...files]; if (!files.length) return;
  await flush();
  const res = await importTextFiles(files);
  for (const n of res.added) notes[n.id] = n;
  toast(importMessage(res));
  if (res.added.length) { view = 'all'; query = ''; searchEl.value = ''; await openNote(res.added[0].id, true); renderList(true); }
}
importInput.onchange = () => { importFiles(importInput.files); importInput.value = ''; };
$('#importBtn').onclick = pickImport;
// drag .md / .txt files onto the panel
const dropEl = $('#drop'); let dragDepth = 0;
const hasFiles = e => [...(e.dataTransfer?.types || [])].includes('Files');
document.addEventListener('dragenter', e => { if (hasFiles(e)) { dragDepth++; dropEl.hidden = false; } });
document.addEventListener('dragleave', e => { if (hasFiles(e) && --dragDepth <= 0) { dragDepth = 0; dropEl.hidden = true; } });
document.addEventListener('dragover', e => { if (hasFiles(e)) e.preventDefault(); });
document.addEventListener('drop', e => { if (!hasFiles(e)) return; e.preventDefault(); dragDepth = 0; dropEl.hidden = true; importFiles(e.dataTransfer.files); });
async function printNote() {
  await flush();
  if (!notes[activeId]) return;
  chrome.tabs.create({ url: chrome.runtime.getURL('print.html?id=' + encodeURIComponent(activeId)) });
}
const openTab = () => chrome.tabs.create({ url: chrome.runtime.getURL('sidepanel.html') });
$('#settingsBtn').onclick = openSettings;
$('#tabBtn').onclick = openTab;

titleEl.addEventListener('input', touch);
titleEl.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); editor.focus(); } });

/* ---------- more menu ---------- */
const menu = $('#menu'), colorPop = $('#colorPop');
function placePop(pop, anchor) {
  pop.hidden = false;
  const a = anchor.getBoundingClientRect(), w = pop.offsetWidth;
  pop.style.top = (a.bottom + 6) + 'px';
  pop.style.left = Math.max(8, Math.min(innerWidth - w - 8, a.right - w)) + 'px';
}
$('#moreBtn').onclick = e => { e.stopPropagation(); colorPop.hidden = true; menu.hidden ? placePop(menu, e.currentTarget) : (menu.hidden = true); };
menu.addEventListener('click', async e => {
  const b = e.target.closest('[data-m]'); if (!b) return; menu.hidden = true;
  const n = notes[activeId];
  switch (b.dataset.m) {
    case 'archive': patch({ archived: !n.archived }, n.archived ? 'Unarchived' : 'Archived'); break;
    case 'trash': patch({ trashed: true, pinned: false }, 'Moved to Trash'); break;
    case 'download': {
      await flush();
      const blob = new Blob([toMarkdown(notes[activeId])], { type: 'text/markdown' });
      const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = FS.fileName(notes[activeId]); a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 4000); break;
    }
    case 'pdf': printNote(); break;
    case 'import': pickImport(); break;
    case 'tools': toggleTools(); break;
    case 'pintools': pinTools(); break;
    case 'spell': toggleSpell(); break;
    case 'tab': openTab(); break;
    case 'settings': openSettings(); break;
  }
});
document.addEventListener('click', e => {
  if (!menu.hidden && !menu.contains(e.target)) menu.hidden = true;
  if (!colorPop.hidden && !colorPop.contains(e.target) && !e.target.closest('[data-cmd="textColor"],[data-cmd="highlight"]')) colorPop.hidden = true;
});

/* ---------- editing commands ---------- */
document.execCommand('defaultParagraphSeparator', false, 'p');
let lastRange = null, pendingFont = null, pendingSize = null;
const inEditor = n => n && editor.contains(n);
function restoreRange() {
  editor.focus();
  if (lastRange) { const s = getSelection(); s.removeAllRanges(); s.addRange(lastRange); }
}
const cssWrap = fn => { editor.focus(); document.execCommand('styleWithCSS', false, true); fn(); document.execCommand('styleWithCSS', false, false); };
const closest = tag => {
  const sel = getSelection(); if (!sel.rangeCount) return null;
  let node = sel.anchorNode; if (node && node.nodeType === 3) node = node.parentElement;
  const el = node?.closest?.(tag); return el && editor.contains(el) ? el : null;
};
function ex(cmd, val) { editor.focus(); document.execCommand(cmd, false, val); touch(); refreshTools(); }
function block(tag) {
  editor.focus();
  const cur = (document.queryCommandValue('formatBlock') || '').toLowerCase().replace(/[<>]/g, '');
  document.execCommand('formatBlock', false, cur === tag ? 'p' : tag);
  touch(); refreshTools();
}
function list(cmd) {
  editor.focus();
  const ul = closest('ul');
  if (cmd === 'insertUnorderedList' && ul?.classList.contains('check')) ul.classList.remove('check');
  else document.execCommand(cmd);
  touch(); refreshTools();
}
function checklist() {
  editor.focus();
  const ul = closest('ul');
  if (ul?.classList.contains('check')) document.execCommand('insertUnorderedList');
  else { if (!ul) document.execCommand('insertUnorderedList'); closest('ul')?.classList.add('check'); }
  touch(); refreshTools();
}
function clearFmt() {
  editor.focus();
  document.execCommand('removeFormat'); document.execCommand('unlink'); document.execCommand('formatBlock', false, 'p');
  editor.querySelectorAll('span[style]').forEach(s => s.removeAttribute('style'));
  touch(); refreshTools();
}
// Font / size / color use temporary markers so we can write exact values (full font stacks, px sizes).
function fixTemp() {
  editor.querySelectorAll('span[style*="FlynnTmpFont"]').forEach(s => { s.style.fontFamily = pendingFont || ''; });
  editor.querySelectorAll('span[style*="xxx-large"]').forEach(s => { s.style.fontSize = (pendingSize || prefs.fontSize) + 'px'; });
  // With a bare caret Chrome types into <font size="7"> / <font face="FlynnTmpFont">; restyle in place so the caret stays put
  editor.querySelectorAll('font[size="7"]').forEach(f => { f.removeAttribute('size'); f.style.fontSize = (pendingSize || prefs.fontSize) + 'px'; });
  editor.querySelectorAll('font[face="FlynnTmpFont"]').forEach(f => { f.removeAttribute('face'); if (pendingFont) f.style.fontFamily = pendingFont; });
  editor.querySelectorAll('span[style]').forEach(s => {
    if (s.style.color === 'rgb(1, 2, 3)') s.style.removeProperty('color');
    if (s.style.backgroundColor === 'rgb(1, 2, 4)') s.style.removeProperty('background-color');
    if (!s.getAttribute('style')?.trim()) s.removeAttribute('style');
  });
}
// With no text selected, a chosen font/size applies to what is typed next. Remember it so the dropdowns can show it.
let typing = null;
function rememberTyping(look) {
  const s = getSelection();
  if (!s.rangeCount || !s.isCollapsed) { typing = null; return; }
  const same = typing && typing.node === s.anchorNode && typing.offset === s.anchorOffset;
  typing = { node: s.anchorNode, offset: s.anchorOffset, look: { ...(same ? typing.look : {}), ...look } };
}
function applyFont(key) {
  if (!key || !FONTS[key]) return; pendingFont = FONTS[key].stack; restoreRange();
  cssWrap(() => document.execCommand('fontName', false, 'FlynnTmpFont')); fixTemp();
  rememberTyping({ font: key }); touch(); refreshTools();
}
function applySize(px) {
  if (!+px) return; pendingSize = +px; restoreRange();
  cssWrap(() => document.execCommand('fontSize', false, '7')); fixTemp();
  rememberTyping({ size: +px }); touch(); refreshTools();
}
function applyColor(kind, color) {
  restoreRange();
  const marker = kind === 'fore' ? '#010203' : '#010204';
  cssWrap(() => document.execCommand(kind === 'fore' ? 'foreColor' : 'hiliteColor', false, color || marker));
  fixTemp(); touch(); colorPop.hidden = true;
}
const SWATCH = {
  fore: ['#e03131', '#f08c00', '#2f9e44', '#1c7ed6', '#7048e8', '#d6336c', '#495057', '#868e96', '#0b7285', '#a61e4d', '#5c940d', '#ffffff'],
  back: ['#fff3a3', '#ffd8a8', '#c3fae8', '#d0ebff', '#e5dbff', '#ffdeeb', '#d8f5a2', '#e9ecef', '#ffec99', '#ffc9c9', '#bac8ff', '#99e9f2'],
};
function openColors(kind, anchor) {
  menu.hidden = true;
  colorPop.innerHTML = `<button class="none" data-c="" title="Remove ${kind === 'fore' ? 'text color' : 'highlight'}"><i class="fa-solid fa-ban"></i></button>` +
    SWATCH[kind].map(c => `<button data-c="${c}" style="background:${c}" title="${c}"></button>`).join('');
  colorPop.onclick = e => { const b = e.target.closest('[data-c]'); if (b) applyColor(kind, b.dataset.c || null); };
  placePop(colorPop, anchor);
}

const ACT = {
  sizeUp: () => stepSize(1), sizeDown: () => stepSize(-1),
  toggleTools, pinTools, importNotes: pickImport, pdf: printNote,
  bold: () => ex('bold'), italic: () => ex('italic'), underline: () => ex('underline'), strike: () => ex('strikeThrough'),
  textColor: () => openColors('fore', $('[data-cmd="textColor"]')), highlight: () => openColors('back', $('[data-cmd="highlight"]')),
  h1: () => block('h1'), h2: () => block('h2'), p: () => block('p'), quote: () => block('blockquote'), code: () => block('pre'),
  ul: () => list('insertUnorderedList'), ol: () => list('insertOrderedList'), check: checklist,
  undo: () => ex('undo'), redo: () => ex('redo'), clear: clearFmt, link: openLink, hr: () => ex('insertHorizontalRule'), spell: toggleSpell,
  newNote, search: () => { openDrawer(); searchEl.focus(); }, list: toggleDrawer, pin: togglePin, fav: toggleFav, settings: openSettings,
};
$('#tools').addEventListener('mousedown', e => { if (!e.target.closest('select')) e.preventDefault(); else captureRange(); }); // keep the text selection
$('#tools').addEventListener('focusin', captureRange);
$('#tools').addEventListener('click', e => { const b = e.target.closest('[data-cmd]'); if (b) ACT[b.dataset.cmd]?.(); });
fontSel.innerHTML = Object.entries(FONTS).map(([k, f]) => `<option value="${k}">${f.label}</option>`).join('') + '<option class="dyn" value="" hidden></option>';
const SIZES = [10, 11, 12, 13, 14, 15, 16, 18, 20, 22, 24, 28, 32, 36, 40, 48, 56, 64];
sizeSel.innerHTML = SIZES.map(s => `<option value="${s}">${s}</option>`).join('') + '<option class="dyn" value="" hidden></option>';
// A hidden spare <option> shows values that are not in the list (a pasted 17px) or "—" when the selection mixes several.
function showOption(sel, value, label) {
  const dyn = sel.querySelector('.dyn');
  if (value != null && [...sel.options].some(o => o !== dyn && o.value === String(value))) { sel.value = String(value); return; }
  dyn.value = value == null ? '' : String(value); dyn.textContent = label; sel.value = dyn.value; dyn.selected = true;
}
fontSel.onchange = () => { applyFont(fontSel.value); };
// A− / A+ : move to the next size in the list (works from any current size, including 17px pasted text)
function stepSize(dir) {
  const look = currentLook(), typed = typing?.look?.size;
  const cur = typed ?? (look.size != null ? look.size : prefs.fontSize);
  const next = dir > 0 ? SIZES.find(x => x > cur) : [...SIZES].reverse().find(x => x < cur);
  if (!next) return toast(dir > 0 ? 'Largest size' : 'Smallest size');
  applySize(next);
  for (const b of document.querySelectorAll('.step')) { b.classList.remove('bump'); void b.offsetWidth; }
  $(dir > 0 ? '.step.inc' : '.step.dec').classList.add('bump');
}
sizeSel.onchange = () => { applySize(sizeSel.value); };

const elOf = n => n && (n.nodeType === 3 ? n.parentElement : n);
const normStack = st => st.replace(/["'\s]/g, '').toLowerCase();
// Elements that carry the selected text (or the caret's element), so the whole selection is read, not just where it starts.
function selectedElements() {
  const sel = getSelection(); if (!sel.rangeCount) return [];
  const r = sel.getRangeAt(0);
  if (sel.isCollapsed) return [elOf(sel.anchorNode)];
  const root = r.commonAncestorContainer; if (root.nodeType === 3) return [root.parentElement];
  const out = new Set(), w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  for (let n; (n = w.nextNode()) && out.size < 400;) {
    if (!r.intersectsNode(n)) continue;
    const a = n === r.startContainer ? r.startOffset : 0, z = n === r.endContainer ? r.endOffset : n.length;
    if (z > a && n.data.slice(a, z).replace(/\u200b/g, '').trim()) out.add(n.parentElement);
  }
  return out.size ? [...out] : [elOf(r.startContainer)];
}
// size: number, or null when mixed · font: key, '' when custom, or null when mixed
function currentLook() {
  const els = selectedElements().filter(e => e && editor.contains(e)); if (!els.length) return {};
  const sizes = new Set(), fonts = new Set();
  for (const el of els) { const cs = getComputedStyle(el); sizes.add(Math.round(parseFloat(cs.fontSize))); fonts.add(normStack(cs.fontFamily)); }
  let font = null;
  if (fonts.size === 1) {
    const f = [...fonts][0];
    font = Object.keys(FONTS).find(k => normStack(FONTS[k].stack) === f) || Object.keys(FONTS).find(k => normStack(FONTS[k].stack).split(',')[0] === f.split(',')[0]) || '';
  }
  return { size: sizes.size === 1 ? [...sizes][0] : null, font };
}
function captureRange() {
  const sel = getSelection();
  if (sel.rangeCount && inEditor(sel.anchorNode)) lastRange = sel.getRangeAt(0).cloneRange();
}
function refreshTools() {
  const sel = getSelection();
  captureRange();
  if (document.activeElement !== editor) return;
  const on = (cmd, v) => $(`[data-cmd="${cmd}"]`)?.classList.toggle('on', !!v);
  try {
    on('bold', document.queryCommandState('bold')); on('italic', document.queryCommandState('italic'));
    on('underline', document.queryCommandState('underline')); on('strike', document.queryCommandState('strikeThrough'));
    const b = (document.queryCommandValue('formatBlock') || '').toLowerCase();
    on('h1', b === 'h1'); on('h2', b === 'h2'); on('code', b === 'pre'); on('quote', b === 'blockquote');
    on('ul', document.queryCommandState('insertUnorderedList') && !closest('ul.check'));
    on('ol', document.queryCommandState('insertOrderedList')); on('check', closest('ul.check'));
  } catch { /* some commands throw when the editor is unfocused */ }
  if (typing && !(sel.isCollapsed && sel.anchorNode === typing.node && sel.anchorOffset === typing.offset)) typing = null;
  const look = { ...currentLook(), ...(typing ? typing.look : {}) };
  if ('size' in look) showOption(sizeSel, look.size, look.size == null ? '—' : look.size);
  if ('font' in look) showOption(fontSel, look.font, look.font == null ? 'Mixed fonts' : 'Custom font');
}
document.addEventListener('selectionchange', refreshTools);

/* link bar */
const linkbar = $('#linkbar'), linkUrl = $('#linkUrl');
function openLink() {
  if (!lastRange) editor.focus();
  linkUrl.value = closest('a')?.getAttribute('href') || '';
  linkbar.hidden = false; linkUrl.focus(); linkUrl.select();
}
function closeLink() { linkbar.hidden = true; restoreRange(); }
$('#linkCancel').onclick = closeLink;
linkUrl.addEventListener('keydown', e => { if (e.key === 'Escape') closeLink(); });
linkbar.addEventListener('submit', e => {
  e.preventDefault();
  let url = linkUrl.value.trim();
  restoreRange();
  if (!url) document.execCommand('unlink');
  else {
    if (/^\s*javascript:/i.test(url)) return toast('That link type is not allowed');
    if (!/^[a-z][a-z0-9+.-]*:/i.test(url)) url = 'https://' + url;
    if (getSelection().isCollapsed) document.execCommand('insertHTML', false, `<a href="${url.replace(/"/g, '%22')}">${url.replace(/</g, '&lt;')}</a>&nbsp;`);
    else document.execCommand('createLink', false, url);
  }
  linkbar.hidden = true; touch();
});

/* ---------- typing helpers ---------- */
const blockOf = node => {
  let el = node && (node.nodeType === 3 ? node.parentElement : node);
  while (el && el !== editor) { if (/^(P|DIV|H1|H2|H3|LI|PRE|BLOCKQUOTE)$/.test(el.tagName)) return el; el = el.parentElement; }
  return null;
};
// "- " or "* " → bullets, "1. " → numbered, "[] " → checklist, "# " / "## " → headings, "> " → quote
function tryAutoFormat(e) {
  const sel = getSelection(); if (!sel.rangeCount || !sel.isCollapsed || !inEditor(sel.anchorNode)) return;
  let blk = blockOf(sel.anchorNode);
  if (!blk) { document.execCommand('formatBlock', false, 'p'); blk = blockOf(getSelection().anchorNode); }
  if (!blk || blk.tagName === 'LI' || blk.tagName === 'PRE' || closest('li')) return;
  const r = document.createRange(); r.selectNodeContents(blk); r.setEnd(sel.anchorNode, sel.anchorOffset);
  const before = r.toString();
  const cmd = /^[-*•]$/.test(before) ? 'ul' : /^\d{1,2}[.)]$/.test(before) ? 'ol' : /^(\[\]|\[ \]|\[x\])$/i.test(before) ? 'check'
    : before === '#' ? 'h1' : before === '##' ? 'h2' : before === '>' ? 'quote' : null;
  if (!cmd) return;
  e.preventDefault();
  r.deleteContents();
  if (!blk.textContent && !blk.querySelector('br')) blk.innerHTML = '<br>';
  r.setStart(blk, 0); r.collapse(true); sel.removeAllRanges(); sel.addRange(r);
  ACT[cmd]();
}

editor.addEventListener('input', () => { fixTemp(); touch(); });
editor.addEventListener('blur', () => { captureRange(); flush(); });
editor.addEventListener('paste', e => { e.preventDefault(); document.execCommand('insertText', false, e.clipboardData.getData('text/plain')); });
editor.addEventListener('click', e => {
  const a = e.target.closest('a');
  if (a && (e.ctrlKey || e.metaKey)) { e.preventDefault(); chrome.tabs.create({ url: a.href }); return; }
  const li = e.target.closest('li');
  if (li && li.parentElement.classList.contains('check') && e.target === li && e.offsetX < 28) { li.classList.toggle('done'); touch(); }
});
editor.addEventListener('keydown', e => {
  if (e.key === 'Enter' && !e.shiftKey) { // a new checklist line starts unchecked
    const prev = closest('li');
    setTimeout(() => { const li = closest('li'); if (li && li !== prev) li.classList.remove('done'); }, 0);
  }
  if (e.key === 'Tab' && closest('li')) { e.preventDefault(); document.execCommand(e.shiftKey ? 'outdent' : 'indent'); touch(); }
  if (e.key === ' ' && prefs.autoFormat && !e.ctrlKey && !e.altKey && !e.metaKey && !e.isComposing) tryAutoFormat(e);
});

/* ---------- shortcuts (re-bindable in Settings) ---------- */
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') { menu.hidden = true; colorPop.hidden = true; if (!linkbar.hidden) closeLink(); else closeDrawer(); return; }
  const combo = comboFromEvent(e); if (!combo) return;
  const id = keymap.get(combo); if (!id) return;
  if (!ACTION_MAP[id].global && document.activeElement !== editor) return;
  e.preventDefault(); ACT[id]?.();
});

/* ---------- live sync (settings page, web clipper, shortcuts, other panels) ---------- */
async function handleCmd(cmd) {
  await ready;
  if (cmd?.type === 'new' && Date.now() - cmd.t < 5000) { await chrome.storage.local.remove('cmd'); newNote(); }
}
chrome.storage.onChanged.addListener((ch, area) => {
  if (area !== 'local') return;
  let relist = false;
  for (const [k, { newValue }] of Object.entries(ch)) {
    if (k.startsWith('note:')) {
      const id = k.slice(5);
      if (!newValue) { delete notes[id]; relist = true; if (id === activeId) pickNext(); continue; }
      if (JSON.stringify(notes[id]) !== JSON.stringify(newValue)) {
        notes[id] = newValue; relist = true;
        if (id === activeId && document.activeElement !== editor && document.activeElement !== titleEl) loadActive();
      }
    } else if (k === 'prefs' && newValue) { prefs = { ...DEFAULT_PREFS, ...newValue }; keymap = buildKeymap(prefs); applyPrefs(); }
    else if (k === 'activeSide' && newValue && newValue !== activeId && notes[newValue]) openNote(newValue);
    else if (k === 'cmd' && newValue) handleCmd(newValue);
  }
  if (relist) renderList();
});
window.addEventListener('pagehide', flush);

/* ---------- start ---------- */
(async function init() {
  prefs = await getPrefs(); keymap = buildKeymap(prefs); applyPrefs();
  const all = await chrome.storage.local.get(null);
  for (const [k, v] of Object.entries(all)) if (k.startsWith('note:')) notes[v.id] = v;
  let id = all.activeSide;
  if (!notes[id] || notes[id].trashed || notes[id].archived) {
    id = Object.values(notes).filter(n => !n.trashed && !n.archived).sort((a, b) => b.modified - a.modified)[0]?.id;
  }
  if (!id) {
    const now = Date.now(), n = { id: uid(), title: '', html: '', created: now, modified: now, pinned: false, favorite: false, archived: false, trashed: false };
    notes[n.id] = n; await chrome.storage.local.set({ ['note:' + n.id]: n }); id = n.id;
  }
  activeId = id; loadActive(); renderList(true);
  chrome.storage.local.set({ activeSide: id });
  await FS.init(); readyResolve();
  if (all.cmd) handleCmd(all.cmd);
  else if (!notes[id].html && !notes[id].title) editor.focus();
})();
