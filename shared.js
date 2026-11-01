'use strict';
/* Flynn Notes – code shared by the side panel and the settings page */

/* ---------- fonts ---------- */
const FONTS = {
  'battambang-roboto':   { label: 'Battambang + Roboto',   hint: 'Warm & friendly (default)', stack: '"Roboto","Battambang",system-ui,sans-serif' },
  'battambang-opensans': { label: 'Battambang + Open Sans', hint: 'Soft and rounded',          stack: '"Open Sans","Battambang",system-ui,sans-serif' },
  'battambang':          { label: 'Battambang',             hint: 'Khmer-first, hand-written feel', stack: '"Battambang","Roboto",system-ui,sans-serif' },
  'roboto':              { label: 'Roboto',                 hint: 'Clean and neutral',         stack: '"Roboto","Battambang",system-ui,sans-serif' },
  'opensans':            { label: 'Open Sans',              hint: 'Open and readable',         stack: '"Open Sans","Battambang",system-ui,sans-serif' },
  'serif':               { label: 'Serif',                  hint: 'Book-like',                 stack: '"Iowan Old Style",Georgia,"Battambang",serif' },
  'mono':                { label: 'Mono',                   hint: 'Code and logs',             stack: 'ui-monospace,"SF Mono",Menlo,Consolas,"Battambang",monospace' },
};
const firstFont = stack => stack.split(',')[0].replace(/["']/g, '').trim();

/* ---------- preferences ---------- */
const DEFAULT_PREFS = {
  theme: 'light',            // light | dark | anime
  pageColor: '',             // '' = theme default
  fontFamily: 'battambang-roboto',
  fontSize: 16,              // Battambang is clearest at 16px or larger
  lineHeight: 1.75,
  fontStyle: 'regular',      // regular | italic | bold
  spellcheck: true,
  autoFormat: true,          // "- " → bullet, "1. " → numbers, "[] " → checklist, "# " → heading
  shortcuts: {},             // overrides: { actionId: ['Ctrl+B', ...] }
  colors: {},                // custom colors: { text, bullet, link, check, quote, codeBg, codeInk, star } ('' = theme default)
  toolbarPinned: true,       // true: toolbar always visible · false: it slides away while you type
  toolbarHidden: false,      // hide the formatting toolbar completely
  motion: 'full',            // full | subtle | off
};
async function getPrefs() {
  const { prefs } = await chrome.storage.local.get('prefs');
  return { ...DEFAULT_PREFS, ...(prefs || {}), shortcuts: { ...(prefs?.shortcuts || {}) }, colors: { ...(prefs?.colors || {}) } };
}
const savePrefs = prefs => chrome.storage.local.set({ prefs });

function luminance(hex) {
  const m = /^#?([\da-f]{2})([\da-f]{2})([\da-f]{2})$/i.exec(hex || ''); if (!m) return 1;
  const [r, g, b] = [1, 2, 3].map(i => parseInt(m[i], 16) / 255);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
const COLOR_VARS = { bullet: '--c-bullet', link: '--c-link', check: '--c-check', quote: '--c-quote', codeBg: '--c-code-bg', codeInk: '--c-code-ink', star: '--c-star' };
function applyPrefsToRoot(prefs) {
  const r = document.documentElement, f = FONTS[prefs.fontFamily] || FONTS['battambang-roboto'], c = prefs.colors || {};
  r.dataset.theme = prefs.theme;
  r.dataset.motion = ['full', 'subtle', 'off'].includes(prefs.motion) ? prefs.motion : 'full';
  r.style.setProperty('--f-family', f.stack);
  r.style.setProperty('--f-size', prefs.fontSize + 'px');
  r.style.setProperty('--f-lh', prefs.lineHeight);
  r.style.setProperty('--f-style', prefs.fontStyle === 'italic' ? 'italic' : 'normal');
  r.style.setProperty('--f-weight', prefs.fontStyle === 'bold' ? '700' : '400');
  if (prefs.pageColor) r.style.setProperty('--page', prefs.pageColor); else r.style.removeProperty('--page');
  // text color: your choice wins, otherwise readable ink for the page color
  const ink = c.text || (prefs.pageColor ? (luminance(prefs.pageColor) > 0.5 ? '#1c2233' : '#eef0f7') : '');
  if (ink) r.style.setProperty('--page-ink', ink); else r.style.removeProperty('--page-ink');
  for (const [k, v] of Object.entries(COLOR_VARS)) { if (c[k]) r.style.setProperty(v, c[k]); else r.style.removeProperty(v); }
}

/* ---------- shortcuts (every tool can be re-bound in Settings) ---------- */
const ACTIONS = [
  { id: 'bold', label: 'Bold', group: 'Text', keys: ['Ctrl+B'] },
  { id: 'italic', label: 'Italic', group: 'Text', keys: ['Ctrl+I'] },
  { id: 'underline', label: 'Underline', group: 'Text', keys: ['Ctrl+U'] },
  { id: 'strike', label: 'Strikethrough', group: 'Text', keys: ['Ctrl+Shift+X'] },
  { id: 'textColor', label: 'Text color', group: 'Text', keys: [] },
  { id: 'highlight', label: 'Highlight', group: 'Text', keys: [] },
  { id: 'clear', label: 'Clear formatting', group: 'Text', keys: ['Ctrl+\\'] },
  { id: 'sizeDown', label: 'Smaller text (A−)', group: 'Text', keys: ['Ctrl+Shift+,'] },
  { id: 'sizeUp', label: 'Larger text (A+)', group: 'Text', keys: ['Ctrl+Shift+.'] },
  { id: 'h1', label: 'Heading 1', group: 'Blocks', keys: ['Ctrl+Alt+1'] },
  { id: 'h2', label: 'Heading 2', group: 'Blocks', keys: ['Ctrl+Alt+2'] },
  { id: 'p', label: 'Paragraph', group: 'Blocks', keys: ['Ctrl+Alt+0'] },
  { id: 'quote', label: 'Quote', group: 'Blocks', keys: ['Ctrl+Shift+Q'] },
  { id: 'code', label: 'Code block', group: 'Blocks', keys: ['Ctrl+Alt+C'] },
  { id: 'ul', label: 'Bullet list', group: 'Lists', keys: ['Ctrl+.', 'Ctrl+-', 'Ctrl+Shift+8'] },
  { id: 'ol', label: 'Numbered list', group: 'Lists', keys: ['Ctrl+Shift+7'] },
  { id: 'check', label: 'Checklist', group: 'Lists', keys: ['Ctrl+Shift+9'] },
  { id: 'link', label: 'Insert link', group: 'Insert', keys: ['Ctrl+K'] },
  { id: 'hr', label: 'Horizontal line', group: 'Insert', keys: ['Ctrl+Alt+-'] },
  { id: 'undo', label: 'Undo', group: 'Edit', keys: ['Ctrl+Z'] },
  { id: 'redo', label: 'Redo', group: 'Edit', keys: ['Ctrl+Shift+Z', 'Ctrl+Y'] },
  { id: 'spell', label: 'Toggle spell check', group: 'Edit', keys: [] },
  { id: 'newNote', label: 'New note', group: 'Notes', keys: ['Alt+N', 'Ctrl+Shift+N'], global: true },
  { id: 'search', label: 'Search notes', group: 'Notes', keys: ['Ctrl+Alt+F'], global: true },
  { id: 'list', label: 'Show / hide notes list', group: 'Notes', keys: ['Ctrl+Alt+L'], global: true },
  { id: 'pin', label: 'Pin / unpin note', group: 'Notes', keys: [], global: true },
  { id: 'fav', label: 'Favorite note', group: 'Notes', keys: [], global: true },
  { id: 'settings', label: 'Open settings', group: 'Notes', keys: ['Ctrl+,'], global: true },
  { id: 'importNotes', label: 'Import .md / .txt files', group: 'Notes', keys: [], global: true },
  { id: 'pdf', label: 'Print / export as PDF (A4)', group: 'Notes', keys: [], global: true },
  { id: 'toggleTools', label: 'Hide / show toolbar', group: 'View', keys: ['Alt+T'], global: true },
  { id: 'pinTools', label: 'Pin / unpin toolbar', group: 'View', keys: ['Alt+P'], global: true },
];
const ACTION_MAP = Object.fromEntries(ACTIONS.map(a => [a.id, a]));
const keysFor = (prefs, id) => (Array.isArray(prefs.shortcuts?.[id]) ? prefs.shortcuts[id] : ACTION_MAP[id].keys);
function buildKeymap(prefs) {
  const m = new Map();
  for (const a of ACTIONS) for (const k of keysFor(prefs, a.id)) m.set(k, a.id);
  return m;
}
const CODE_KEYS = { Minus: '-', Equal: '=', Period: '.', Comma: ',', Slash: '/', Backslash: '\\', BracketLeft: '[', BracketRight: ']',
  Semicolon: ';', Quote: "'", Backquote: '`', Space: 'Space', Enter: 'Enter', Tab: 'Tab', NumpadSubtract: '-', NumpadAdd: '=', NumpadDecimal: '.' };
function comboFromEvent(e) {
  const c = e.code || ''; let k;
  if (/^Key[A-Z]$/.test(c)) k = c[3];
  else if (/^Digit\d$/.test(c)) k = c[5];
  else if (/^F\d{1,2}$/.test(c)) k = c;
  else if (CODE_KEYS[c]) k = CODE_KEYS[c];
  else return null;
  const ctrl = e.ctrlKey || e.metaKey;
  if (!ctrl && !e.altKey && !/^F\d/.test(k)) return null;
  return [ctrl && 'Ctrl', e.altKey && 'Alt', e.shiftKey && 'Shift', k].filter(Boolean).join('+');
}

/* ---------- notes helpers ---------- */
const plain = html => (html || '').replace(/<(br|\/p|\/div|\/li|\/h\d|\/blockquote)[^>]*>/gi, ' ').replace(/<[^>]+>/g, '')
  .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/\s+/g, ' ').trim();
const titleOf = n => n.title || plain(n.html).slice(0, 48) || 'Untitled note';
async function loadNotes() {
  const all = await chrome.storage.local.get(null), notes = {};
  for (const [k, v] of Object.entries(all)) if (k.startsWith('note:')) notes[v.id] = v;
  return notes;
}

/* ---------- save to a folder (File System Access API) ---------- */
// Chrome lets an extension write to a folder only after you pick it. The pick is remembered in IndexedDB.
const idb = () => new Promise((res, rej) => {
  const r = indexedDB.open('flynn-fs', 1);
  r.onupgradeneeded = () => r.result.createObjectStore('kv');
  r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error);
});
const kv = async (mode, fn) => { const db = await idb(); return new Promise((res, rej) => { const q = fn(db.transaction('kv', mode).objectStore('kv')); q.onsuccess = () => res(q.result); q.onerror = () => rej(q.error); }); };

const FS = {
  dir: null, state: 'none', // none | ready | needs | unsupported
  async init() {
    if (!('showDirectoryPicker' in self)) { this.state = 'unsupported'; return; }
    try { this.dir = await kv('readonly', s => s.get('dir')); } catch { this.dir = null; }
    this.state = !this.dir ? 'none' : (await this.dir.queryPermission({ mode: 'readwrite' })) === 'granted' ? 'ready' : 'needs';
  },
  async choose() {
    const h = await showDirectoryPicker({ id: 'flynn-notes', mode: 'readwrite' });
    this.dir = h; this.state = 'ready'; await kv('readwrite', s => s.put(h, 'dir'));
  },
  async reconnect() {
    this.state = (await this.dir.requestPermission({ mode: 'readwrite' })) === 'granted' ? 'ready' : 'needs';
  },
  async disconnect() { this.dir = null; this.state = 'none'; await kv('readwrite', s => s.delete('dir')); },
  fileName: n => (titleOf(n).replace(/[\\/:*?"<>|\u0000-\u001f]+/g, '').trim().slice(0, 60) || 'Untitled') + ` [${n.id.slice(-4)}].md`,
  async remove(n) { if (this.state === 'ready' && n.file) { try { await this.dir.removeEntry(n.file); } catch { /* already gone */ } } },
  // returns the file name written, or undefined when nothing was written
  async write(n) {
    if (this.state !== 'ready') return undefined;
    try {
      if (n.trashed) { await this.remove(n); return undefined; }
      const name = this.fileName(n);
      const fh = await this.dir.getFileHandle(name, { create: true });
      const w = await fh.createWritable(); await w.write(toMarkdown(n)); await w.close();
      if (n.file && n.file !== name) await this.remove(n);
      return name;
    } catch { this.state = 'needs'; return undefined; }
  },
};
// Save to extension storage and mirror to the chosen folder.
async function saveNote(n) {
  await chrome.storage.local.set({ ['note:' + n.id]: n });
  const f = await FS.write(n);
  if (f && f !== n.file) { n.file = f; await chrome.storage.local.set({ ['note:' + n.id]: n }); }
  return n;
}

/* ---------- Markdown export ---------- */
function toMarkdown(n) {
  const iso = t => new Date(t).toISOString();
  const head = ['---', `title: ${JSON.stringify(titleOf(n))}`, `created: ${iso(n.created)}`, `modified: ${iso(n.modified)}`];
  if (n.pinned) head.push('pinned: true');
  head.push('---', '');
  const d = document.createElement('div'); d.innerHTML = n.html || '';
  return head.join('\n') + md(d).replace(/\n{3,}/g, '\n\n').trim() + '\n';
}
function md(node) {
  let out = '';
  node.childNodes.forEach(c => {
    if (c.nodeType === 3) { out += c.textContent; return; }
    if (c.nodeType !== 1) return;
    const t = c.tagName, inner = () => md(c);
    switch (t) {
      case 'B': case 'STRONG': out += `**${inner()}**`; break;
      case 'I': case 'EM': out += `*${inner()}*`; break;
      case 'U': out += `<u>${inner()}</u>`; break;
      case 'S': case 'STRIKE': case 'DEL': out += `~~${inner()}~~`; break;
      case 'A': out += `[${inner()}](${c.getAttribute('href')})`; break;
      case 'H1': out += `\n\n# ${inner()}\n\n`; break;
      case 'H2': out += `\n\n## ${inner()}\n\n`; break;
      case 'HR': out += '\n\n---\n\n'; break;
      case 'BR': out += '\n'; break;
      case 'CODE': out += '`' + c.textContent + '`'; break;
      case 'PRE': out += '\n\n```\n' + c.textContent + '\n```\n\n'; break;
      case 'BLOCKQUOTE': out += '\n\n' + inner().trim().split('\n').map(l => '> ' + l).join('\n') + '\n\n'; break;
      case 'UL': case 'OL': {
        let i = 0; out += '\n';
        c.childNodes.forEach(li => {
          if (li.tagName !== 'LI') return; i++;
          const mark = c.classList.contains('check') ? (li.classList.contains('done') ? '- [x] ' : '- [ ] ') : t === 'OL' ? `${i}. ` : '- ';
          out += mark + md(li).trim().replace(/\n/g, '\n  ') + '\n';
        });
        out += '\n'; break;
      }
      case 'P': case 'DIV': out += `\n\n${inner()}\n\n`; break;
      default: out += inner();
    }
  });
  return out;
}

/* ---------- Markdown / text import ---------- */
const newId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
const mdEsc = (s = '') => s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
function mdInline(src) {
  const codes = [];
  let s = src.replace(/`([^`]+)`/g, (_, c) => { codes.push(c); return '\u0000' + (codes.length - 1) + '\u0000'; });
  s = mdEsc(s);
  s = s.replace(/\[([^\]]+)\]\(([^)\s]+)(?:\s+&quot;[^)]*&quot;)?\)/g, (m, t, u) => /^(https?:|mailto:)/i.test(u) ? `<a href="${u}">${t}</a>` : t);
  s = s.replace(/\*\*([^*]+?)\*\*|__([^_]+?)__/g, (m, a, b) => `<b>${a ?? b}</b>`);
  s = s.replace(/\*([^*\n]+?)\*|(?<![\w])_([^_\n]+?)_(?![\w])/g, (m, a, b) => `<i>${a ?? b}</i>`);
  s = s.replace(/~~([^~]+?)~~/g, '<s>$1</s>');
  s = s.replace(/&lt;u&gt;(.+?)&lt;\/u&gt;/g, '<u>$1</u>');
  return s.replace(/\u0000(\d+)\u0000/g, (_, i) => `<code>${mdEsc(codes[+i])}</code>`);
}
// Turns Markdown into the small set of HTML the editor understands (h1, h2, p, lists, checklists, quote, pre, hr).
function mdToHtml(src) {
  const lines = src.replace(/\r\n?/g, '\n').split('\n'), out = [];
  const LI = /^\s*(?:[-*+]|\d+[.)])\s+(.*)$/, HR = /^\s*([-*_])(\s*\1){2,}\s*$/;
  const startsBlock = l => /^#{1,6}\s/.test(l) || /^```/.test(l) || /^\s*>/.test(l) || LI.test(l) || HR.test(l);
  for (let i = 0; i < lines.length;) {
    const l = lines[i]; let m;
    if (!l.trim()) { i++; continue; }
    if (/^```/.test(l)) {
      const buf = []; i++;
      while (i < lines.length && !/^```/.test(lines[i])) buf.push(lines[i++]);
      i++; out.push(`<pre>${mdEsc(buf.join('\n'))}</pre>`); continue;
    }
    if ((m = /^(#{1,6})\s+(.*?)\s*#*\s*$/.exec(l))) { const h = m[1].length === 1 ? 'h1' : 'h2'; out.push(`<${h}>${mdInline(m[2])}</${h}>`); i++; continue; }
    if (HR.test(l)) { out.push('<hr>'); i++; continue; }
    if (/^\s*>/.test(l)) {
      const buf = [];
      while (i < lines.length && /^\s*>/.test(lines[i])) buf.push(lines[i++].replace(/^\s*>\s?/, ''));
      out.push(`<blockquote>${buf.map(mdInline).join('<br>')}</blockquote>`); continue;
    }
    if (LI.test(l)) {
      const ordered = /^\s*\d/.test(l), check = /^\s*(?:[-*+]|\d+[.)])\s+\[[ xX]\]\s/.test(l), items = [];
      while (i < lines.length && LI.test(lines[i]) && /^\s*\d/.test(lines[i]) === ordered) {
        let t = LI.exec(lines[i])[1], done = false;
        const cm = /^\[([ xX])\]\s+(.*)$/.exec(t); if (cm) { done = cm[1] !== ' '; t = cm[2]; }
        items.push(`<li${check && done ? ' class="done"' : ''}>${mdInline(t)}</li>`); i++;
      }
      out.push(ordered ? `<ol>${items.join('')}</ol>` : `<ul${check ? ' class="check"' : ''}>${items.join('')}</ul>`); continue;
    }
    const buf = [];
    while (i < lines.length && lines[i].trim() && !startsBlock(lines[i])) buf.push(lines[i++].trim());
    if (!buf.length) { buf.push(lines[i++].trim()); }
    out.push(`<p>${buf.map(mdInline).join('<br>')}</p>`);
  }
  return out.join('');
}
const textToHtml = src => src.replace(/\r\n?/g, '\n').split(/\n{2,}/).map(p => p.trim() ? `<p>${p.split('\n').map(mdEsc).join('<br>')}</p>` : '').join('');

// Builds a note from the text of an imported file.
function noteFromText(fileName, text, isMd) {
  const now = Date.now(); let title = '', pinned = false, created = now, body = text.replace(/^\uFEFF/, '');
  const fm = /^---\s*\n([\s\S]*?)\n---\s*(?:\n|$)/.exec(body);
  if (isMd && fm) {
    body = body.slice(fm[0].length);
    for (const line of fm[1].split('\n')) {
      const kv = /^(\w+):\s*(.*)$/.exec(line.trim()); if (!kv) continue;
      if (kv[1] === 'title') { try { title = JSON.parse(kv[2]); } catch { title = kv[2].replace(/^["']|["']$/g, ''); } }
      else if (kv[1] === 'pinned') pinned = kv[2].trim() === 'true';
      else if (kv[1] === 'created' && !isNaN(Date.parse(kv[2]))) created = Date.parse(kv[2]);
    }
  }
  if (isMd && !title) { // a leading "# Heading" becomes the title
    const h = /^\s*#\s+(.+?)\s*#*\s*(?:\n|$)/.exec(body);
    if (h) { title = h[1].replace(/[*_`]/g, ''); body = body.slice(h[0].length); }
  }
  if (!title) title = fileName.replace(/\.[^.]+$/, '').replace(/\s*\[[a-z0-9]{4}\]$/i, '').trim();
  const html = isMd ? mdToHtml(body) : textToHtml(body);
  return { id: newId(), title: String(title).slice(0, 200), html, created, modified: now, pinned, favorite: false, archived: false, trashed: false };
}
// Imports a list of File objects (.md, .markdown, .txt). Returns the notes that were added.
async function importTextFiles(files) {
  const added = []; let skipped = 0;
  for (const f of files) {
    const isMd = /\.(md|markdown)$/i.test(f.name);
    if (!isMd && !/\.(txt|text)$/i.test(f.name)) { skipped++; continue; }
    if (f.size > 5e6) { skipped++; continue; }
    try { added.push(await saveNote(noteFromText(f.name, await f.text(), isMd))); } catch { skipped++; }
  }
  return { added, skipped };
}
const importMessage = ({ added, skipped }) => added.length
  ? `Imported ${added.length} ${added.length === 1 ? 'note' : 'notes'}` + (skipped ? ` · ${skipped} skipped` : '')
  : 'Only .md and .txt files can be imported';
