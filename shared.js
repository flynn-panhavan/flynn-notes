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
  colors: {},                // editor colors: { text, bullet, check, quote, link, star, codeBg, codeInk, selection }
  motion: 'full',            // full | subtle | off
  autoSave: 'instant',       // instant | interval | manual
  autoSaveMin: 2,            // minutes, for interval saving
  toolbarHidden: false,
  toolbarPinned: true,
};
async function getPrefs() {
  const { prefs } = await chrome.storage.local.get('prefs');
  return { ...DEFAULT_PREFS, ...(prefs || {}), shortcuts: { ...(prefs?.shortcuts || {}) } };
}
const savePrefs = prefs => chrome.storage.local.set({ prefs });

function luminance(hex) {
  const m = /^#?([\da-f]{2})([\da-f]{2})([\da-f]{2})$/i.exec(hex || ''); if (!m) return 1;
  const [r, g, b] = [1, 2, 3].map(i => parseInt(m[i], 16) / 255);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
function applyPrefsToRoot(prefs) {
  const r = document.documentElement, f = FONTS[prefs.fontFamily] || FONTS['battambang-roboto'];
  r.dataset.theme = prefs.theme;
  r.dataset.motion = prefs.motion || 'full';
  for (const k of ['text', 'bullet', 'check', 'quote', 'link', 'star', 'codeBg', 'codeInk', 'selection']) {
    const v = prefs.colors?.[k];
    if (v) r.style.setProperty('--c-' + k, v); else r.style.removeProperty('--c-' + k);
  }
  r.style.setProperty('--f-family', f.stack);
  r.style.setProperty('--f-size', prefs.fontSize + 'px');
  r.style.setProperty('--f-lh', prefs.lineHeight);
  r.style.setProperty('--f-style', prefs.fontStyle === 'italic' ? 'italic' : 'normal');
  r.style.setProperty('--f-weight', prefs.fontStyle === 'bold' ? '700' : '400');
  if (prefs.pageColor) {
    r.style.setProperty('--page', prefs.pageColor);
    r.style.setProperty('--page-ink', luminance(prefs.pageColor) > 0.5 ? '#1c2233' : '#eef0f7');
  } else { r.style.removeProperty('--page'); r.style.removeProperty('--page-ink'); }
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
  { id: 'save', label: 'Save now', group: 'Notes', keys: ['Ctrl+S'], global: true },
  { id: 'sizeUp', label: 'Increase font size', group: 'Text', keys: ['Ctrl+Shift+.'] },
  { id: 'sizeDown', label: 'Decrease font size', group: 'Text', keys: ['Ctrl+Shift+,'] },
  { id: 'toggleTools', label: 'Hide / show toolbar', group: 'Notes', keys: ['Alt+T'], global: true },
  { id: 'pinTools', label: 'Pin / unpin toolbar', group: 'Notes', keys: ['Alt+P'], global: true },
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
const newId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
const mdEsc = s => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/* ---------- notebooks ---------- */
const NOTEBOOKS = {};   // id -> { id, name, created }, stored as 'nb:<id>'
async function loadNotebooks() {
  const all = await chrome.storage.local.get(null);
  for (const k of Object.keys(NOTEBOOKS)) delete NOTEBOOKS[k];
  for (const [k, v] of Object.entries(all)) if (k.startsWith('nb:') && v?.id) NOTEBOOKS[v.id] = v;
  return NOTEBOOKS;
}

/* ---------- import .md / .markdown / .txt ---------- */
function mdInline(src) {
  const held = [], hold = h => `\u0000${held.push(h) - 1}\u0000`;
  let s = src.replace(/`([^`]+)`/g, (_, c) => hold(`<code>${mdEsc(c)}</code>`));
  s = s.replace(/\[([^\]]*)\]\(([^)]*)\)/g, (m, t, u) => {
    u = u.trim();
    if (/^\s*(javascript|data|vbscript):/i.test(u)) return t;
    return hold(`<a href="${mdEsc(u)}">${mdFmt(t)}</a>`);
  });
  s = mdFmt(s);
  return s.replace(/\u0000(\d+)\u0000/g, (_, i) => held[i]);
}
// underscores are left alone on purpose, so snake_case words and URLs with _ are not mangled
const mdFmt = t => mdEsc(t)
  .replace(/\*\*(.+?)\*\*/g, '<b>$1</b>')
  .replace(/~~(.+?)~~/g, '<s>$1</s>')
  .replace(/(^|[^*])\*([^*\n]+)\*(?!\*)/g, '$1<i>$2</i>')
  .replace(/&lt;u&gt;(.+?)&lt;\/u&gt;/g, '<u>$1</u>');

function mdToHtml(src) {
  const lines = src.replace(/\r\n?/g, '\n').split('\n'), out = [];
  const LIST = /^\s*([-*+]|\d+[.)])\s+(.*)$/, HR = /^\s*([-*_])(\s*\1){2,}\s*$/;
  const startsBlock = l => /^(#{1,6}\s|```|>)/.test(l) || HR.test(l) || LIST.test(l);
  let i = 0;
  while (i < lines.length) {
    const l = lines[i]; let m;
    if (!l.trim()) { i++; continue; }
    if (/^```/.test(l)) {
      const buf = []; i++;
      while (i < lines.length && !/^```/.test(lines[i])) buf.push(lines[i++]);
      i++; out.push(`<pre>${mdEsc(buf.join('\n'))}</pre>`); continue;
    }
    if ((m = /^(#{1,6})\s+(.*)$/.exec(l))) { const h = m[1].length === 1 ? 1 : 2; out.push(`<h${h}>${mdInline(m[2])}</h${h}>`); i++; continue; }
    if (HR.test(l)) { out.push('<hr>'); i++; continue; }
    if (/^>/.test(l)) {
      const buf = [];
      while (i < lines.length && /^>/.test(lines[i])) buf.push(lines[i++].replace(/^>\s?/, ''));
      out.push(`<blockquote>${buf.map(mdInline).join('<br>')}</blockquote>`); continue;
    }
    if ((m = LIST.exec(l))) {
      const ordered = /\d/.test(m[1]), start = ordered ? parseInt(m[1], 10) : 1, items = [];
      while (i < lines.length && (m = LIST.exec(lines[i])) && /\d/.test(m[1]) === ordered) { items.push(m[2]); i++; }
      const task = items.every(t => /^\[[ xX]\]\s/.test(t));
      if (task && !ordered) out.push('<ul class="check">' + items.map(t => `<li${/^\[[xX]\]/.test(t) ? ' class="done"' : ''}>${mdInline(t.slice(4))}</li>`).join('') + '</ul>');
      else out.push((ordered ? `<ol${start > 1 ? ` start="${start}"` : ''}>` : '<ul>') + items.map(t => `<li>${mdInline(t)}</li>`).join('') + (ordered ? '</ol>' : '</ul>'));
      continue;
    }
    const buf = [];
    while (i < lines.length && lines[i].trim() && (buf.length === 0 || !startsBlock(lines[i]))) buf.push(lines[i++]);
    out.push(`<p>${buf.map(mdInline).join('<br>')}</p>`);
  }
  return out.join('');
}
const textToHtml = src => src.replace(/\r\n?/g, '\n').split(/\n{2,}/).filter(p => p.trim()).map(p => `<p>${mdEsc(p).replace(/\n/g, '<br>')}</p>`).join('');

async function importTextFiles(files) {
  const added = [], skipped = [];
  for (const f of files) {
    const ext = (f.name.match(/\.([^.]+)$/) || [, ''])[1].toLowerCase();
    if (!['md', 'markdown', 'txt'].includes(ext)) { skipped.push(f.name); continue; }
    if (f.size > 5 * 1024 * 1024) { skipped.push(f.name); continue; }
    try {
      let text = await f.text(), title = '', created, modified, pinned = false;
      text = text.replace(/^\uFEFF/, '');
      const fm = ext !== 'txt' && /^---\r?\n([\s\S]*?)\r?\n---[ \t]*(\r?\n|$)/.exec(text);
      if (fm) {
        text = text.slice(fm[0].length);
        for (const line of fm[1].split(/\r?\n/)) {
          const kv = /^(\w+):\s*(.*)$/.exec(line); if (!kv) continue;
          const [, k, v] = kv;
          if (k === 'title') { try { title = JSON.parse(v); } catch { title = v.replace(/^["']|["']$/g, ''); } }
          else if (k === 'created' && !isNaN(Date.parse(v))) created = Date.parse(v);
          else if (k === 'modified' && !isNaN(Date.parse(v))) modified = Date.parse(v);
          else if (k === 'pinned') pinned = v.trim() === 'true';
        }
      }
      const base = f.name.replace(/\.[^.]+$/, '').replace(/\s*\[[0-9a-z]{4}\]$/i, '');
      if (ext !== 'txt' && !title) { const h = /^\s*#\s+(.+)$/m.exec(text); if (h) { title = h[1].trim(); text = text.replace(h[0], ''); } }
      const now = Date.now();
      const n = {
        id: newId(), title: (title || base).slice(0, 200),
        html: ext === 'txt' ? textToHtml(text) : mdToHtml(text),
        created: created || now, modified: modified || now,
        pinned, favorite: false, archived: false, trashed: false,
      };
      await saveNote(n);
      added.push(n);
    } catch { skipped.push(f.name); }
  }
  return { added, skipped };
}
function importMessage(res) {
  const a = res.added.length, s = res.skipped.length;
  if (!a && !s) return 'No files selected';
  if (!a) return 'Nothing imported — only .md, .markdown and .txt files can be imported';
  return `Imported ${a} ${a === 1 ? 'note' : 'notes'}` + (s ? ` · skipped ${s} unsupported or unreadable ${s === 1 ? 'file' : 'files'}` : '');
}
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
  // File name = the note's own title (e.g. "Shopping list.md"). `copy` > 1 adds " (2)", " (3)" only when two notes share a title.
  fileName: (n, copy = 1) => (titleOf(n).replace(/[\\/:*?"<>|\u0000-\u001f]+/g, '').replace(/[. ]+$/, '').trim().slice(0, 60) || 'Untitled') + (copy > 1 ? ` (${copy})` : '') + '.md',
  // pick a free name in this folder: keep our own file, otherwise skip names used by another note or an existing file
  async uniqueName(n, h, dname) {
    const others = Object.values(await loadNotes()).filter(m => m.id !== n.id && !m.trashed);
    for (let c = 1; c < 500; c++) {
      const name = this.fileName(n, c);
      if (n.file === name && (n.fdir || '') === dname) return name;
      // case-insensitive disks (Windows, macOS): "note.md" and "Note.md" are the same file, so keep our own file instead of making "Note (2).md"
      if (n.file && (n.fdir || '') === dname && n.file.toLowerCase() === name.toLowerCase()) return n.file;
      if (others.some(m => m.file === name && (m.fdir || '') === dname)) continue;
      try { await h.getFileHandle(name); } catch { return name; } // not found = free
    }
    return this.fileName(n, 1);
  },
  // Each notebook is a subfolder of the chosen folder; notes with no notebook live in the root.
  dirName: b => (String(b.name || '').replace(/[\\/:*?"<>|\u0000-\u001f]+/g, '').trim().replace(/[. ]+$/, '').slice(0, 60) || 'Notebook'),
  async dirFor(n) {
    const b = n.nb && NOTEBOOKS[n.nb];
    if (!b) return { h: this.dir, name: '' };
    const name = this.dirName(b);
    return { h: await this.dir.getDirectoryHandle(name, { create: true }), name };
  },
  // create the notebook's folder right away (also for empty notebooks)
  async ensureNotebook(b) {
    if (this.state !== 'ready' || !b) return;
    try { await this.dir.getDirectoryHandle(this.dirName(b), { create: true }); } catch { this.state = 'needs'; }
  },
  // remove a notebook folder, only if it is empty (never deletes anything else)
  async removeNotebookDir(name) {
    if (this.state !== 'ready' || !name) return;
    try { await this.dir.removeEntry(name); } catch { /* not empty or already gone */ }
  },
  async remove(n) {
    if (this.state === 'ready' && n.file) {
      try { const d = n.fdir ? await this.dir.getDirectoryHandle(n.fdir) : this.dir; await d.removeEntry(n.file); } catch { /* already gone */ }
    }
  },
  // returns the file name written, or undefined when nothing was written; also sets n.fdir (folder name)
  async write(n) {
    if (this.state !== 'ready') return undefined;
    try {
      if (n.trashed) { await this.remove(n); return undefined; }
      const { h, name: dname } = await this.dirFor(n);
      const name = await this.uniqueName(n, h, dname);
      const fh = await h.getFileHandle(name, { create: true });
      const w = await fh.createWritable(); await w.write(toMarkdown(n)); await w.close();
      if (n.file && (n.file !== name || (n.fdir || '') !== dname)) await this.remove(n); // moved or renamed: drop the old copy
      n.fdir = dname;
      return name;
    } catch { this.state = 'needs'; return undefined; }
  },
};
// Save to extension storage and mirror to the chosen folder.
async function saveNote(n) {
  await chrome.storage.local.set({ ['note:' + n.id]: n });
  const before = (n.fdir || '') + '/' + (n.file || '');
  const f = await FS.write(n);
  if (f && (n.fdir || '') + '/' + f !== before) { n.file = f; await chrome.storage.local.set({ ['note:' + n.id]: n }); }
  return n;
}

/* ---------- Markdown export ---------- */
function toMarkdown(n) {
  const iso = t => new Date(t).toISOString();
  const head = ['---', `title: ${JSON.stringify(titleOf(n))}`, `created: ${iso(n.created)}`, `modified: ${iso(n.modified)}`];
  if (n.tags?.length) head.push(`tags: [${n.tags.join(', ')}]`);
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
