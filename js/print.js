'use strict';
/* Flynn Notes – print page: shows one note on an A4 sheet and opens the print dialog (choose "Save as PDF") */
const $ = (s, r = document) => r.querySelector(s);

(async function init() {
  const id = new URLSearchParams(location.search).get('id');
  const got = id ? (await chrome.storage.local.get('note:' + id))['note:' + id] : null;
  const prefs = await getPrefs();
  // paper is always white with dark ink; your fonts and your bullet / link / code colors still apply
  applyPrefsToRoot({ ...prefs, theme: 'light', pageColor: '', colors: { ...prefs.colors, text: '' } });
  if (!got) { $('#docTitle').textContent = 'Note not found'; $('#go').disabled = true; return; }

  document.title = titleOf(got);
  $('#docTitle').textContent = titleOf(got);
  $('#docMeta').textContent = 'Edited ' + new Date(got.modified).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });
  $('#doc').innerHTML = got.html || '';
  // links open in a new tab, safely
  $('#doc').querySelectorAll('a').forEach(a => { a.target = '_blank'; a.rel = 'noopener noreferrer'; });

  const rule = $('#pageRule');
  const setMargin = () => { rule.textContent = `@page { size: A4; margin: ${$('#margin').value}; }`; };
  $('#margin').onchange = setMargin;
  $('#showTitle').onchange = e => { $('#docTitle').hidden = $('#docMeta').hidden = !e.target.checked; };
  $('#go').onclick = () => print();

  await document.fonts.ready;
  setTimeout(() => print(), 350); // opens the print dialog right away; the button above reopens it
})();
