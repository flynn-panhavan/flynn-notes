// Flynn Notes – service worker: open the side panel, global shortcuts, web clipper
const esc = (s = '') => s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

const setup = () => chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch(() => {});
chrome.runtime.onStartup.addListener(setup);
chrome.runtime.onInstalled.addListener(() => {
  setup();
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({ id: 'flynn-clip', title: 'Save selection to Flynn Notes', contexts: ['selection'] });
    chrome.contextMenus.create({ id: 'flynn-open', title: 'Open Flynn Notes', contexts: ['page', 'action'] });
  });
});

chrome.commands.onCommand.addListener((command, tab) => {
  if (!tab) return;
  chrome.sidePanel.open({ windowId: tab.windowId }); // first, while the shortcut still counts as a user gesture
  if (command === 'new-note') chrome.storage.local.set({ cmd: { type: 'new', t: Date.now() } });
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (!tab) return;
  chrome.sidePanel.open({ windowId: tab.windowId });
  if (info.menuItemId !== 'flynn-clip' || !info.selectionText) return;

  const all = await chrome.storage.local.get(null);
  let note = Object.entries(all).find(([k, v]) => k.startsWith('note:') && v.clips && !v.trashed)?.[1];
  const now = Date.now();
  if (!note) {
    note = { id: uid(), title: 'Web clips', html: '', created: now, modified: now, pinned: false,
             favorite: false, archived: false, trashed: false, clips: true };
  }
  const url = info.pageUrl || tab.url || '';
  note.html += `<blockquote>${esc(info.selectionText).replace(/\n+/g, '<br>')}</blockquote>` +
               `<p><a href="${esc(url)}">${esc(tab.title || url)}</a> · ${esc(new Date(now).toLocaleString())}</p><hr><p><br></p>`;
  note.modified = now;
  await chrome.storage.local.set({ ['note:' + note.id]: note, activeSide: note.id });
});
