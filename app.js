"use strict";
/* Flynn Notes – side panel (also works as a full-page tab) */

const $ = (s, r = document) => r.querySelector(s);
const editor = $("#editor"),
  titleEl = $("#title"),
  listEl = $("#list"),
  pane = $("#pane");
const drawer = $("#drawer"),
  scrim = $("#scrim"),
  searchEl = $("#search");
const fontSel = $("#fontSel"),
  sizeSel = $("#sizeSel");

let notes = {},
  activeId = null,
  view = "all",
  query = "";
let prefs = { ...DEFAULT_PREFS },
  keymap = new Map();
let readyResolve;
const ready = new Promise((r) => (readyResolve = r));

const VIEWS = [
  ["all", "All notes", "fa-note-sticky"],
  ["pinned", "Pinned", "fa-thumbtack"],
  ["fav", "Favorites", "fa-star"],
  ["archived", "Archived", "fa-box-archive"],
  ["trash", "Trash", "fa-trash-can"],
];
const uid = newId;
const sameDay = (a, b) =>
  new Date(a).toDateString() === new Date(b).toDateString();
const fmt = (ts) =>
  sameDay(ts, Date.now())
    ? new Date(ts).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      })
    : new Date(ts).toLocaleDateString([], {
        month: "short",
        day: "numeric",
        year:
          new Date(ts).getFullYear() === new Date().getFullYear()
            ? undefined
            : "numeric",
      });
let toastTimer;
function toast(msg) {
  const t = $("#toast");
  t.textContent = msg;
  t.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => (t.hidden = true), 2400);
}
const setStatus = (txt, busy, icon) => {
  const s = $("#status"),
    i = s.querySelector("i");
  s.querySelector("span").textContent = txt;
  s.classList.toggle("busy", !!busy);
  s.classList.toggle("unsaved", icon === "fa-pen");
  $("footer").classList.toggle("saving", !!busy);
  const cls =
    "fa-solid " +
    (busy ? "fa-arrows-rotate fa-spin" : icon || "fa-circle-check");
  if (i.className !== cls) i.className = cls;
};
function setNum(el, v) {
  v = String(v);
  if (el.textContent === v) return;
  el.textContent = v;
  el.classList.remove("bump");
  void el.offsetWidth;
  el.classList.add("bump");
}

/* ---------- preferences ---------- */
function applyPrefs() {
  applyPrefsToRoot(prefs);
  editor.spellcheck = prefs.spellcheck;
  titleEl.spellcheck = prefs.spellcheck;
  $('[data-cmd="spell"]').classList.toggle("on", prefs.spellcheck);
  $('[data-m="spell"] .tick').style.visibility = prefs.spellcheck
    ? "visible"
    : "hidden";
  document.querySelectorAll("[data-cmd]").forEach((b) => {
    const a = ACTION_MAP[b.dataset.cmd];
    if (!a) return;
    const k = keysFor(prefs, a.id)[0];
    b.title = k ? `${a.label} (${k})` : a.label;
  });
  const nk = keysFor(prefs, "newNote")[0];
  $("#newBtn").title = nk ? `New note (${nk})` : "New note";
  for (const [id, btn, label] of [
    ["undo", "#undoBtn", "Back (undo)"],
    ["redo", "#redoBtn", "Next (redo)"],
  ]) {
    const k = keysFor(prefs, id)[0];
    $(btn).title = k ? `${label} (${k})` : label;
  }
  paintToolbar();
  showDefaults();
  if (dirty && activeId) {
    clearTimeout(intervalTimer);
    intervalTimer = null;
    scheduleSave();
  }
  paintSave();
}
function paintToolbar() {
  const hidden = !!prefs.toolbarHidden,
    pinned = prefs.toolbarPinned !== false;
  pane.classList.toggle("tools-off", hidden);
  pane.classList.toggle("tools-free", !pinned);
  if (pinned || hidden) setAway(false);
  $("#toolsBtn").classList.toggle("on", !hidden);
  const hk = keysFor(prefs, "toggleTools")[0],
    pk = keysFor(prefs, "pinTools")[0];
  $("#toolsBtn").title =
    (hidden ? "Show toolbar" : "Hide toolbar") + (hk ? ` (${hk})` : "");
  $('[data-cmd="pinTools"]').classList.toggle("on", pinned);
  $('[data-cmd="pinTools"]').title =
    (pinned ? "Unpin toolbar" : "Pin toolbar") + (pk ? ` (${pk})` : "");
  $('[data-cmd="toggleTools"]').title = "Hide toolbar" + (hk ? ` (${hk})` : "");
  $('[data-m="tools"] .tick').style.visibility = hidden ? "hidden" : "visible";
  $('[data-m="pintools"] .tick').style.visibility = pinned
    ? "visible"
    : "hidden";
}
let away = false;
function setAway(v) {
  if (v === away) return;
  away = v;
  pane.classList.toggle("tools-away", v);
}
function toggleTools() {
  prefs = { ...prefs, toolbarHidden: !prefs.toolbarHidden };
  savePrefs(prefs);
  applyPrefs();
  toast(prefs.toolbarHidden ? "Toolbar hidden" : "Toolbar shown");
}
function pinTools() {
  prefs = {
    ...prefs,
    toolbarPinned: !(prefs.toolbarPinned !== false),
    toolbarHidden: false,
  };
  savePrefs(prefs);
  applyPrefs();
  toast(
    prefs.toolbarPinned
      ? "Toolbar pinned — always visible"
      : "Toolbar unpinned — hides while you type",
  );
}
editor.addEventListener("input", () => {
  if (
    !prefs.toolbarPinned &&
    !prefs.toolbarHidden &&
    menu.hidden &&
    colorPop.hidden
  )
    setAway(true);
});
pane.addEventListener("pointermove", (e) => {
  if (away && e.clientY - pane.getBoundingClientRect().top < 110)
    setAway(false);
});
$("#tools").addEventListener("focusin", () => setAway(false));
$("#toolsBtn").onclick = toggleTools;
function showDefaults() {
  if (!sizeSel.options.length) return;
  showOption(sizeSel, prefs.fontSize, prefs.fontSize);
  showOption(fontSel, prefs.fontFamily, "Custom font");
}
function toggleSpell() {
  prefs = { ...prefs, spellcheck: !prefs.spellcheck };
  savePrefs(prefs);
  applyPrefs();
  editor.blur();
  editor.focus();
  toast(prefs.spellcheck ? "Spell check on" : "Spell check off");
}

/* ---------- notes list ---------- */
function inView(n, v) {
  if (v === "trash") return !!n.trashed;
  if (n.trashed) return false;
  if (v === "archived") return !!n.archived;
  if (n.archived) return false;
  if (v.startsWith("nb:")) return n.nb === v.slice(3);
  if (v === "pinned") return !!n.pinned;
  if (v === "fav") return !!n.favorite;
  return true;
}
function visibleNotes() {
  const q = query.trim().toLowerCase();
  let arr = Object.values(notes).filter((n) =>
    q ? (view === "trash" ? n.trashed : !n.trashed) : inView(n, view),
  );
  if (q)
    arr = arr.filter((n) =>
      (titleOf(n) + " " + plain(n.html)).toLowerCase().includes(q),
    );
  return arr.sort((a, b) => !!b.pinned - !!a.pinned || b.modified - a.modified);
}
function renderList(anim) {
  $("#cats").innerHTML = VIEWS.map(
    ([k, label, ic]) =>
      `<button data-view="${k}" title="${label}" class="${k === view ? "on" : ""}"><i class="fa-solid ${ic}"></i><span>${label}</span></button>`,
  ).join("");
  renderNotebooks();
  const arr = visibleNotes();
  if (!arr.length) {
    const [ic, msg] = query
      ? ["fa-magnifying-glass", "No notes match your search."]
      : curNb()
        ? ["fa-book", "This notebook is empty. Press New note to add one."]
        : view === "trash"
          ? ["fa-trash-can", "Trash is empty."]
          : view === "archived"
            ? ["fa-box-archive", "No archived notes."]
            : view === "pinned"
              ? ["fa-thumbtack", "Pin a note to keep it at the top."]
              : view === "fav"
                ? ["fa-star", "Star a note to find it here."]
                : [
                    "fa-feather-pointed",
                    "Nothing here yet. Press New note to start writing.",
                  ];
    listEl.innerHTML = `<li class="empty-list"><i class="fa-solid ${ic}"></i><p>${msg}</p></li>`;
    return;
  }
  listEl.innerHTML = "";
  for (const n of arr) {
    const li = document.createElement("li");
    li.dataset.id = n.id;
    if (n.id === activeId) li.className = "on";
    if (anim) {
      li.classList.add("in");
      li.style.setProperty("--i", Math.min(listEl.children.length, 12));
    }
    const t = document.createElement("div");
    t.className = "li-t";
    const name = document.createElement("span");
    name.textContent = titleOf(n);
    t.append(name);
    if (n.pinned)
      t.insertAdjacentHTML(
        "beforeend",
        '<i class="fa-solid fa-thumbtack"></i>',
      );
    if (n.favorite)
      t.insertAdjacentHTML("beforeend", '<i class="fa-solid fa-star"></i>');
    const s = document.createElement("div");
    s.className = "li-s";
    s.textContent = plain(n.html).slice(0, 90) || "Empty note";
    const d = document.createElement("div");
    d.className = "li-d";
    d.append(fmt(n.modified));
    if (n.nb && NOTEBOOKS[n.nb] && !curNb()) {
      const c = document.createElement("span");
      c.className = "nbchip";
      c.innerHTML = '<i class="fa-solid fa-book"></i>';
      c.append(NOTEBOOKS[n.nb].name);
      d.append(c);
    }
    li.append(t, s, d);
    listEl.append(li);
  }
}

/* ---------- save pipeline ---------- */
let dirty = false,
  saveTimer = null,
  intervalTimer = null,
  draftTimer = null,
  markRaf = 0,
  drafts = {};
const saveMode = () =>
  ["interval", "manual"].includes(prefs.autoSave) ? prefs.autoSave : "instant";
async function persist(n) {
  notes[n.id] = n;
  await saveNote(n);
}
function paintSave() {
  const b = $("#saveBtn"),
    k = keysFor(prefs, "save")[0];
  b.classList.toggle("dirty", dirty);
  b.querySelector("span").textContent = dirty ? "Save" : "Saved";
  b.title = (dirty ? "Save now" : "All changes saved") + (k ? ` (${k})` : "");
}
function scheduleSave() {
  const mode = saveMode();
  if (mode === "instant") {
    setStatus("Saving…", true);
    clearTimeout(saveTimer);
    saveTimer = setTimeout(flush, 250);
    return;
  }
  if (mode === "interval") {
    const min = Math.min(120, Math.max(1, +prefs.autoSaveMin || 2));
    setStatus(`Unsaved · auto-save in ${min} min`, false, "fa-pen");
    if (!intervalTimer) intervalTimer = setTimeout(flush, min * 60000);
  } else setStatus("Unsaved · press Save", false, "fa-pen");
  clearTimeout(draftTimer);
  draftTimer = setTimeout(writeDraft, 800);
}
function writeDraft() {
  clearTimeout(draftTimer);
  if (!dirty || !activeId || !notes[activeId]) return;
  const d = {
    html: editor.innerHTML,
    title: titleEl.value.trim(),
    t: Date.now(),
  };
  drafts[activeId] = d;
  chrome.storage.local.set({ ["draft:" + activeId]: d });
}
function touch() {
  if (!activeId || notes[activeId]?.trashed) return;
  dirty = true;
  paintSave();
  scheduleSave();
  updateCounts();
  cancelAnimationFrame(markRaf);
  markRaf = requestAnimationFrame(() => syncMarkers());
}
async function flush() {
  clearTimeout(saveTimer);
  clearTimeout(intervalTimer);
  clearTimeout(draftTimer);
  intervalTimer = null;
  if (!dirty || !activeId || !notes[activeId]) return;
  dirty = false;
  paintSave();
  const id = activeId;
  await persist({
    ...notes[id],
    html: editor.innerHTML,
    title: titleEl.value.trim(),
    modified: Date.now(),
  });
  if (drafts[id]) {
    delete drafts[id];
    chrome.storage.local.remove("draft:" + id);
  }
  if (id === activeId && !dirty) {
    setStatus(
      FS.state === "needs"
        ? "Saved · folder paused"
        : saveMode() === "instant"
          ? "Auto-saved"
          : "Saved",
    );
    updateMeta();
    renderList();
  }
}
async function leave() {
  if (!dirty) return;
  if (saveMode() !== "manual") return flush();
  writeDraft();
  dirty = false;
  clearTimeout(intervalTimer);
  intervalTimer = null;
  paintSave();
}
function exitSave() {
  if (saveMode() === "manual") writeDraft();
  else flush();
}
async function saveNow() {
  if (!activeId || notes[activeId]?.trashed) return;
  if (!dirty) return toast("Already saved");
  await flush();
  toast("Saved");
}
function updateCounts() {
  const text = editor.innerText.replace(/\u200b/g, "").trim();
  const words = text ? text.split(/\s+/).length : 0;
  setNum($("#wc"), words);
  setNum($("#cc"), text.length);
  setNum($("#rt"), words ? Math.max(1, Math.ceil(words / 200)) : 0);
  editor.classList.toggle(
    "is-empty",
    !text && !editor.querySelector("hr,li,pre"),
  );
}
function updateMeta() {
  const n = notes[activeId];
  if (!n) return;
  const nb = n.nb && NOTEBOOKS[n.nb];
  $("#meta").innerHTML =
    (nb
      ? `<i class="fa-solid fa-book"></i>${mdEsc(nb.name)}<span>·</span>`
      : "") + `<i class="fa-regular fa-clock"></i>Edited ${fmt(n.modified)}`;
  $("#meta").title =
    `Created ${new Date(n.created).toLocaleString()}\nModified ${new Date(n.modified).toLocaleString()}`;
}
function paintActions() {
  const n = notes[activeId];
  if (!n) return;
  const tr = !!n.trashed;
  $("#pinBtn").classList.toggle("on", !!n.pinned);
  $("#pinBtn").title = n.pinned ? "Unpin" : "Pin";
  $("#favBtn").classList.toggle("on", !!n.favorite);
  $("#favBtn i").className = n.favorite
    ? "fa-solid fa-star"
    : "fa-regular fa-star";
  $('[data-m="archive"] span').textContent = n.archived
    ? "Unarchive"
    : "Archive";
  $("#pinBtn").hidden = $("#favBtn").hidden = $("#moreBtn").hidden = tr;
  $("#trashBar").hidden = !tr;
  editor.contentEditable = String(!tr);
  titleEl.readOnly = tr;
  $("#tools").style.opacity = tr ? 0.4 : 1;
  $("#tools").style.pointerEvents = tr ? "none" : "";
}
function loadActive() {
  const n = notes[activeId];
  if (!n) return;
  let d = drafts[n.id];
  if (d && d.t <= n.modified) {
    delete drafts[n.id];
    chrome.storage.local.remove("draft:" + n.id);
    d = null;
  }
  titleEl.value = d ? d.title : n.title || "";
  editor.innerHTML = d ? d.html : n.html || "";
  cleanColors();
  syncMarkers();
  dirty = !!d && !n.trashed;
  clearTimeout(intervalTimer);
  intervalTimer = null;
  paintActions();
  updateCounts();
  updateMeta();
  showDefaults();
  paintSave();
  if (dirty) {
    scheduleSave();
    if (saveMode() !== "instant")
      setStatus("Draft restored · press Save to keep it", false, "fa-pen");
  } else setStatus(saveMode() === "instant" ? "Auto-saved" : "Saved");
}
async function openNote(id, focus) {
  await leave();
  if (!notes[id]) return;
  activeId = id;
  chrome.storage.local.set({ activeSide: id });
  loadActive();
  renderList();
  closeDrawer();
  for (const el of [titleEl, editor]) {
    el.classList.remove("swap");
    void el.offsetWidth;
    el.classList.add("swap");
  }
  if (focus) editor.focus();
}
async function newNote() {
  await leave();
  const now = Date.now(),
    nb = curNb()?.id;
  const n = {
    id: uid(),
    title: "",
    html: "",
    created: now,
    modified: now,
    pinned: false,
    favorite: false,
    archived: false,
    trashed: false,
  };
  if (nb) n.nb = nb;
  await persist(n);
  if (!nb) view = "all";
  query = "";
  searchEl.value = "";
  await openNote(n.id);
  titleEl.focus();
}
function pickNext() {
  const arr = visibleNotes();
  if (arr.length) return openNote(arr[0].id);
  const other = Object.values(notes)
    .filter((n) => !n.trashed && !n.archived)
    .sort((a, b) => b.modified - a.modified)[0];
  return other ? openNote(other.id) : newNote();
}
async function patch(changes, msg) {
  await flush();
  await persist({ ...notes[activeId], ...changes, modified: Date.now() });
  paintActions();
  renderList();
  updateMeta();
  if (msg) toast(msg);
  if (!inView(notes[activeId], view) && !query) pickNext();
}
const togglePin = () => patch({ pinned: !notes[activeId].pinned });
const toggleFav = () => patch({ favorite: !notes[activeId].favorite });
$("#pinBtn").onclick = togglePin;
$("#favBtn").onclick = toggleFav;
$("#restoreBtn").onclick = () => patch({ trashed: false }, "Restored");
$("#purgeBtn").onclick = async () => {
  if (!confirm("Delete this note forever? This cannot be undone.")) return;
  const n = notes[activeId];
  dirty = false;
  clearTimeout(intervalTimer);
  intervalTimer = null;
  paintSave();
  delete drafts[n.id];
  chrome.storage.local.remove("draft:" + n.id);
  await FS.remove(n);
  delete notes[n.id];
  await chrome.storage.local.remove("note:" + n.id);
  toast("Deleted");
  pickNext();
};

/* ---------- drawer, search, folders ---------- */
const openDrawer = () => {
  drawer.classList.add("open");
  scrim.hidden = false;
  renderList(true);
};
function closeDrawer() {
  drawer.classList.remove("open");
  scrim.hidden = true;
}
const toggleDrawer = () =>
  drawer.classList.contains("open") ? closeDrawer() : openDrawer();
$("#menuBtn").onclick = toggleDrawer;
scrim.onclick = closeDrawer;
$("#newBtn").onclick = newNote;
searchEl.oninput = () => {
  query = searchEl.value;
  renderList();
};
$("#cats").onclick = (e) => {
  const b = e.target.closest("[data-view]");
  if (b) {
    view = b.dataset.view;
    renderList(true);
  }
};

/* ---------- notebooks (spaces for notes) ---------- */
const nbList = () =>
  Object.values(NOTEBOOKS).sort((a, b) => a.name.localeCompare(b.name));
const curNb = () =>
  view.startsWith("nb:") ? NOTEBOOKS[view.slice(3)] || null : null;
function renderNotebooks() {
  const counts = {};
  for (const n of Object.values(notes))
    if (n.nb && !n.trashed && !n.archived)
      counts[n.nb] = (counts[n.nb] || 0) + 1;
  $("#nbs").innerHTML =
    nbList()
      .map((b) => {
        const on = view === "nb:" + b.id;
        return `<button data-nb="${b.id}" class="${on ? "on" : ""}" title="${mdEsc(b.name)}"><i class="fa-solid ${on ? "fa-book-open" : "fa-book"}"></i><span>${mdEsc(b.name)}</span><em>${counts[b.id] || 0}</em></button>`;
      })
      .join("") ||
    '<p class="nb-empty">Notebooks are separate spaces for your notes. Press the folder button to make one.</p>';
  const b = curNb();
  $("#nbBar").hidden = !b;
  if (b) $("#nbName").textContent = b.name;
}
async function createNotebook(name) {
  name = (name || "").trim().slice(0, 60);
  if (!name) return null;
  const dup = nbList().find((b) => b.name.toLowerCase() === name.toLowerCase());
  if (dup) return dup;
  const b = { id: uid(), name, created: Date.now() };
  NOTEBOOKS[b.id] = b;
  await chrome.storage.local.set({ ["nb:" + b.id]: b });
  return b;
}
async function promptNotebook() {
  const b = await createNotebook(prompt("Notebook name", ""));
  if (b) {
    view = "nb:" + b.id;
    query = "";
    searchEl.value = "";
    renderList(true);
    toast(`Notebook “${b.name}” is ready`);
  }
  return b;
}
async function renameNotebook() {
  const b = curNb();
  if (!b) return;
  const name = (prompt("Rename notebook", b.name) || "").trim().slice(0, 60);
  if (!name || name === b.name) return;
  if (
    nbList().some(
      (x) => x.id !== b.id && x.name.toLowerCase() === name.toLowerCase(),
    )
  )
    return toast("A notebook with that name already exists");
  await flush();
  b.name = name;
  await chrome.storage.local.set({ ["nb:" + b.id]: b });
  for (const n of Object.values(notes)) if (n.nb === b.id) await saveNote(n);
  renderList();
  updateMeta();
  toast("Notebook renamed");
}
async function deleteNotebook() {
  const b = curNb();
  if (!b) return;
  const mine = Object.values(notes).filter((n) => n.nb === b.id);
  if (
    !confirm(
      `Delete the notebook “${b.name}”?\n` +
        (mine.length
          ? `Its ${mine.length} ${mine.length === 1 ? "note" : "notes"} will be kept in All notes.`
          : "It is empty."),
    )
  )
    return;
  await flush();
  delete NOTEBOOKS[b.id];
  await chrome.storage.local.remove("nb:" + b.id);
  for (const n of mine) {
    delete n.nb;
    await saveNote(n);
  }
  view = "all";
  renderList(true);
  updateMeta();
  toast("Notebook deleted");
}
$("#nbs").onclick = (e) => {
  const b = e.target.closest("[data-nb]");
  if (b) {
    view = "nb:" + b.dataset.nb;
    renderList(true);
  }
};
$("#nbAdd").onclick = promptNotebook;
$("#nbRename").onclick = renameNotebook;
$("#nbDelete").onclick = deleteNotebook;
const nbPop = $("#nbPop");

/* ---------- "Move to notebook" popover ---------- */
async function openNbPop(x, y, targetNoteId) {
  const targetId = targetNoteId || activeId;
  if (!notes[targetId]) return;
  if (targetId === activeId) await flush();

  const cur = notes[targetId].nb,
    tick = '<i class="fa-solid fa-check tick"></i>';
  nbPop.innerHTML =
    `<button data-id=""><i class="fa-regular fa-file"></i><span>No notebook</span>${!cur || !NOTEBOOKS[cur] ? tick : ""}</button>` +
    nbList()
      .map(
        (b) =>
          `<button data-id="${b.id}"><i class="fa-solid fa-book"></i><span>${mdEsc(b.name)}</span>${cur === b.id ? tick : ""}</button>`,
      )
      .join("") +
    '<hr><button data-new="1"><i class="fa-solid fa-plus"></i><span>New notebook…</span></button>';

  nbPop.hidden = false;
  const w = nbPop.offsetWidth,
    h = nbPop.offsetHeight;

  let left = x;
  let top = y;

  if (top + h > innerHeight - 10) {
    top = Math.max(10, y - h);
  }
  if (left + w > innerWidth - 10) {
    left = Math.max(10, innerWidth - w - 10);
  }

  nbPop.style.left = left + "px";
  nbPop.style.top = top + "px";
  nbPop.dataset.targetNote = targetId;
}

nbPop.addEventListener("click", async (e) => {
  const b = e.target.closest("button");
  if (!b) return;
  nbPop.hidden = true;
  const targetId = nbPop.dataset.targetNote;
  const target = notes[targetId];
  if (!target) return;

  if (b.dataset.new) {
    const nb = await createNotebook(prompt("Notebook name", ""));
    if (nb) {
      target.nb = nb.id;
      target.modified = Date.now();
      await saveNote(target);
      renderList();
      if (targetId === activeId) updateMeta();
      toast(`Moved to “${nb.name}”`);
    }
    return;
  }
  const nbId = b.dataset.id || null;
  if (nbId) target.nb = nbId;
  else delete target.nb;
  target.modified = Date.now();
  await saveNote(target);
  renderList();
  if (targetId === activeId) updateMeta();
  toast(nbId ? `Moved to “${NOTEBOOKS[nbId].name}”` : "Removed from notebook");
});

listEl.onclick = (e) => {
  const li = e.target.closest("li[data-id]");
  if (li) openNote(li.dataset.id, true);
};
const openSettings = () => chrome.runtime.openOptionsPage();
const importInput = $("#importFile");
const pickImport = () => importInput.click();
async function importFiles(files) {
  files = [...files];
  if (!files.length) return;
  await leave();
  const res = await importTextFiles(files);
  for (const n of res.added) notes[n.id] = n;
  toast(importMessage(res));
  if (res.added.length) {
    view = "all";
    query = "";
    searchEl.value = "";
    await openNote(res.added[0].id, true);
    renderList(true);
  }
}
importInput.onchange = () => {
  importFiles(importInput.files);
  importInput.value = "";
};
$("#importBtn").onclick = pickImport;
const dropEl = $("#drop");
let dragDepth = 0;
const hasFiles = (e) => [...(e.dataTransfer?.types || [])].includes("Files");
document.addEventListener("dragenter", (e) => {
  if (hasFiles(e)) {
    dragDepth++;
    dropEl.hidden = false;
  }
});
document.addEventListener("dragleave", (e) => {
  if (hasFiles(e) && --dragDepth <= 0) {
    dragDepth = 0;
    dropEl.hidden = true;
  }
});
document.addEventListener("dragover", (e) => {
  if (hasFiles(e)) e.preventDefault();
});
document.addEventListener("drop", (e) => {
  if (!hasFiles(e)) return;
  e.preventDefault();
  dragDepth = 0;
  dropEl.hidden = true;
  importFiles(e.dataTransfer.files);
});
async function printNote() {
  await flush();
  if (!notes[activeId]) return;
  chrome.tabs.create({
    url: chrome.runtime.getURL("print.html?id=" + encodeURIComponent(activeId)),
  });
}
const openTab = () =>
  chrome.tabs.create({ url: chrome.runtime.getURL("sidepanel.html") });
$("#settingsBtn").onclick = openSettings;
$("#tabBtn").onclick = openTab;

titleEl.addEventListener("input", touch);
titleEl.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    e.preventDefault();
    editor.focus();
  }
});

/* ---------- more menu ---------- */
const menu = $("#menu"),
  colorPop = $("#colorPop");

$("#moreBtn").onclick = (e) => {
  e.stopPropagation();
  colorPop.hidden = true;
  if (menu.hidden) {
    const rect = e.currentTarget.getBoundingClientRect();
    menu.hidden = false;
    const w = menu.offsetWidth;
    menu.style.top = rect.bottom + 6 + "px";
    menu.style.left =
      Math.max(8, Math.min(innerWidth - w - 8, rect.right - w)) + "px";
  } else {
    menu.hidden = true;
  }
};

menu.addEventListener("click", async (e) => {
  const b = e.target.closest("[data-m]");
  if (!b) return;
  const rect = b.getBoundingClientRect();
  menu.hidden = true;
  const n = notes[activeId];
  switch (b.dataset.m) {
    case "move":
      e.stopPropagation();
      openNbPop(rect.left, rect.bottom + 4, activeId);
      break;
    case "archive":
      patch({ archived: !n.archived }, n.archived ? "Unarchived" : "Archived");
      break;
    case "trash":
      patch({ trashed: true, pinned: false }, "Moved to Trash");
      break;
    case "download": {
      await flush();
      const blob = new Blob([toMarkdown(notes[activeId])], {
        type: "text/markdown",
      });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = FS.fileName(notes[activeId]);
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 4000);
      break;
    }
    case "pdf":
      printNote();
      break;
    case "import":
      pickImport();
      break;
    case "tools":
      toggleTools();
      break;
    case "pintools":
      pinTools();
      break;
    case "spell":
      toggleSpell();
      break;
    case "tab":
      openTab();
      break;
    case "settings":
      openSettings();
      break;
  }
});

menu.onclick = (e) => {
  e.stopPropagation();
};

/* ---------- Context Menu ---------- */
const ctxMenu = $("#ctxMenu");

document.addEventListener("click", (e) => {
  if (!menu.hidden && !menu.contains(e.target)) menu.hidden = true;
  if (
    !colorPop.hidden &&
    !colorPop.contains(e.target) &&
    !e.target.closest('[data-cmd="textColor"],[data-cmd="highlight"]')
  )
    colorPop.hidden = true;
  if (!nbPop.hidden && !nbPop.contains(e.target)) nbPop.hidden = true;
  if (
    !ctxMenu.hidden &&
    !ctxMenu.contains(e.target) &&
    !e.target.closest("#ctxMenu")
  )
    ctxMenu.hidden = true;
});

function showCtxMenu(e, items) {
  e.preventDefault();
  e.stopPropagation();
  ctxMenu.innerHTML = items
    .map((it) =>
      it === "hr"
        ? "<hr>"
        : `<button data-act="${it.act}" class="${it.danger ? "danger" : ""}"><i class="fa-solid ${it.icon}"></i>${it.label}</button>`,
    )
    .join("");
  ctxMenu.hidden = false;

  const x = e.clientX,
    y = e.clientY,
    w = ctxMenu.offsetWidth,
    h = ctxMenu.offsetHeight;
  const left = Math.min(x, innerWidth - w - 10);
  const top = Math.min(y, innerHeight - h - 10);

  ctxMenu.style.left = left + "px";
  ctxMenu.style.top = top + "px";
}

// Handle the click (not mousedown): the menu stays under the pointer until the click
// finishes, so the page's outside-click handler can't immediately close the popover
// this action opens (e.g. "Move to notebook…").
ctxMenu.onclick = async (e) => {
  e.stopPropagation();
  const b = e.target.closest("button");
  if (!b) return;
  const act = b.dataset.act;
  const id = ctxMenu.dataset.id,
    isNb = ctxMenu.dataset.nb;

  const ctxRect = ctxMenu.getBoundingClientRect();

  e.preventDefault();
  e.stopPropagation();

  ctxMenu.hidden = true;

  if (act === "move") {
    openNbPop(ctxRect.left, ctxRect.top, id);
    return;
  }
  if (act === "rename") {
    if (isNb) {
      const b = NOTEBOOKS[id];
      const name = (prompt("Rename notebook", b.name) || "")
        .trim()
        .slice(0, 60);
      if (!name || name === b.name) return;
      if (
        nbList().some(
          (x) => x.id !== b.id && x.name.toLowerCase() === name.toLowerCase(),
        )
      )
        return toast("A notebook with that name already exists");
      await flush();
      b.name = name;
      await chrome.storage.local.set({ ["nb:" + b.id]: b });
      for (const n of Object.values(notes))
        if (n.nb === b.id) await saveNote(n);
      renderList();
      updateMeta();
      toast("Notebook renamed");
    } else {
      const n = notes[id];
      const name = (prompt("Rename note", titleOf(n)) || "").trim();
      if (!name || name === titleOf(n)) return;
      n.title = name;
      n.modified = Date.now();
      await saveNote(n);
      if (id === activeId) titleEl.value = name;
      renderList();
      toast("Note renamed");
    }
  }
  if (act === "delete") {
    if (isNb) {
      await flush();
      const b = NOTEBOOKS[id];
      const mine = Object.values(notes).filter((n) => n.nb === b.id);
      if (
        !confirm(
          `Delete the notebook “${b.name}”?\n` +
            (mine.length
              ? `Its ${mine.length} ${mine.length === 1 ? "note" : "notes"} will be kept in All notes.`
              : "It is empty."),
        )
      )
        return;
      delete NOTEBOOKS[b.id];
      await chrome.storage.local.remove("nb:" + b.id);
      for (const n of mine) {
        delete n.nb;
        await saveNote(n);
      }
      if (view === "nb:" + b.id) view = "all";
      renderList(true);
      updateMeta();
      toast("Notebook deleted");
    } else {
      const n = notes[id];
      if (n.trashed) {
        if (!confirm("Delete this note forever? This cannot be undone."))
          return;
        dirty = false;
        clearTimeout(intervalTimer);
        intervalTimer = null;
        paintSave();
        delete drafts[n.id];
        chrome.storage.local.remove("draft:" + n.id);
        await FS.remove(n);
        delete notes[n.id];
        await chrome.storage.local.remove("note:" + n.id);
        toast("Deleted");
        pickNext();
      } else {
        n.trashed = true;
        n.pinned = false;
        n.modified = Date.now();
        await saveNote(n);
        renderList();
        toast("Moved to Trash");
        if (id === activeId) pickNext();
      }
    }
  }
  if (act === "archive") {
    const n = notes[id];
    n.archived = !n.archived;
    n.modified = Date.now();
    await saveNote(n);
    renderList();
    toast(n.archived ? "Archived" : "Unarchived");
    if (id === activeId && !inView(n, view) && !query) pickNext();
  }
  if (act === "restore") {
    const n = notes[id];
    n.trashed = false;
    n.modified = Date.now();
    await saveNote(n);
    renderList();
    toast("Restored");
    if (id === activeId) pickNext();
  }
};

function setupContextMenus() {
  listEl.oncontextmenu = (e) => {
    const li = e.target.closest("li[data-id]");
    if (!li) return;
    const n = notes[li.dataset.id];
    if (!n) return;
    const items = [
      {
        act: "move",
        icon: "fa-book",
        label: "<span>Move to notebook…</span>",
      },
      { act: "rename", icon: "fa-pen", label: "<span>Rename</span>" },
      n.trashed
        ? {
            act: "restore",
            icon: "fa-trash-can-arrow-up",
            label: "<span>Restore</span>",
          }
        : {
            act: "archive",
            icon: "fa-box-archive",
            label: `<span>${n.archived ? "Unarchive" : "Archive"}</span>`,
          },
      "hr",
      {
        act: "delete",
        icon: "fa-trash-can",
        label: `<span>${n.trashed ? "Delete forever" : "Move to Trash"}</span>`,
        danger: true,
      },
    ];
    ctxMenu.dataset.id = n.id;
    ctxMenu.dataset.nb = "";
    showCtxMenu(e, items);
  };
  $("#nbs").oncontextmenu = (e) => {
    const btn = e.target.closest("[data-nb]");
    if (!btn) return;
    const b = NOTEBOOKS[btn.dataset.nb];
    if (!b) return;
    const items = [
      { act: "rename", icon: "fa-pen", label: "<span>Rename notebook</span>" },
      {
        act: "delete",
        icon: "fa-trash-can",
        label: "<span>Delete notebook</span>",
        danger: true,
      },
    ];
    ctxMenu.dataset.id = b.id;
    ctxMenu.dataset.nb = "1";
    showCtxMenu(e, items);
  };
}

/* ---------- editing commands ---------- */
document.execCommand("defaultParagraphSeparator", false, "p");
let lastRange = null,
  pendingFont = null,
  pendingSize = null;
const inEditor = (n) => n && editor.contains(n);
function restoreRange() {
  editor.focus();
  if (lastRange) {
    const s = getSelection();
    s.removeAllRanges();
    s.addRange(lastRange);
  }
}
const cssWrap = (fn) => {
  editor.focus();
  document.execCommand("styleWithCSS", false, true);
  fn();
  document.execCommand("styleWithCSS", false, false);
};
const closest = (tag) => {
  const sel = getSelection();
  if (!sel.rangeCount) return null;
  let node = sel.anchorNode;
  if (node && node.nodeType === 3) node = node.parentElement;
  const el = node?.closest?.(tag);
  return el && editor.contains(el) ? el : null;
};
function ex(cmd, val) {
  editor.focus();
  document.execCommand(cmd, false, val);
  touch();
  refreshTools();
}
function selBlocks() {
  const sel = getSelection();
  if (!sel.rangeCount) return [];
  const r = sel.getRangeAt(0);
  return [
    ...editor.querySelectorAll("p,div,h1,h2,h3,li,blockquote,pre"),
  ].filter((el) => r.intersectsNode(el));
}
function stripBlockSizing(blocks) {
  for (const b of blocks)
    b.querySelectorAll("span,font").forEach((s) => {
      if (s.tagName === "FONT") s.removeAttribute("size");
      s.style.removeProperty("font-size");
      s.style.removeProperty("line-height");
      s.style.removeProperty("font-weight");
      if (!s.getAttribute("style")?.trim()) s.removeAttribute("style");
    });
}
function insertRule() {
  editor.focus();
  const before = new Set(editor.querySelectorAll("hr"));
  document.execCommand("insertHorizontalRule");
  const hr = [...editor.querySelectorAll("hr")].find((h) => !before.has(h));
  if (hr) {
    let next = hr.nextElementSibling;
    if (!next) {
      next = document.createElement("p");
      next.innerHTML = "<br>";
      hr.after(next);
    }
    const range = document.createRange();
    range.selectNodeContents(next);
    range.collapse(true);
    const sel = getSelection();
    sel.removeAllRanges();
    sel.addRange(range);
  }
  touch();
  refreshTools();
}
function block(tag) {
  if (tag === "hr") return insertRule();
  editor.focus();
  const cur = (document.queryCommandValue("formatBlock") || "")
    .toLowerCase()
    .replace(/[<>]/g, "");
  const target = cur === tag ? "p" : tag,
    wasHead = /^h[1-3]$/.test(cur),
    isHead = /^h[1-3]$/.test(target);
  document.execCommand("formatBlock", false, target);
  stripBlockSizing(selBlocks());
  if (wasHead && !isHead && document.queryCommandState("bold"))
    document.execCommand("bold");
  touch();
  refreshTools();
}
function list(cmd) {
  editor.focus();
  const ul = closest("ul");
  if (cmd === "insertUnorderedList" && ul?.classList.contains("check"))
    ul.classList.remove("check");
  else document.execCommand(cmd);
  touch();
  refreshTools();
}
function checklist() {
  editor.focus();
  const ul = closest("ul");
  if (ul?.classList.contains("check"))
    document.execCommand("insertUnorderedList");
  else {
    if (!ul) document.execCommand("insertUnorderedList");
    closest("ul")?.classList.add("check");
  }
  touch();
  refreshTools();
}
function clearFmt() {
  editor.focus();
  document.execCommand("removeFormat");
  document.execCommand("unlink");
  document.execCommand("formatBlock", false, "p");
  editor
    .querySelectorAll("span[style]")
    .forEach((s) => s.removeAttribute("style"));
  touch();
  refreshTools();
}
function fixTemp() {
  editor.querySelectorAll('span[style*="FlynnTmpFont"]').forEach((s) => {
    s.style.fontFamily = pendingFont || "";
  });
  editor.querySelectorAll('span[style*="xxx-large"]').forEach((s) => {
    s.style.fontSize = (pendingSize || prefs.fontSize) + "px";
  });
  editor.querySelectorAll('font[size="7"]').forEach((f) => {
    f.removeAttribute("size");
    f.style.fontSize = (pendingSize || prefs.fontSize) + "px";
  });
  editor.querySelectorAll('font[face="FlynnTmpFont"]').forEach((f) => {
    f.removeAttribute("face");
    if (pendingFont) f.style.fontFamily = pendingFont;
  });
  cleanColors();
}
function cleanColors() {
  editor.querySelectorAll("[style]").forEach((el) => {
    const s = el.style;
    if (s.color === "rgb(1, 2, 3)") s.removeProperty("color");
    if (
      ["rgb(1, 2, 4)", "transparent", "rgba(0, 0, 0, 0)"].includes(
        s.backgroundColor,
      )
    )
      s.removeProperty("background-color");
    if (!el.getAttribute("style")?.trim()) el.removeAttribute("style");
  });
  editor
    .querySelectorAll('font[color="#010203"],font[color="#010204"]')
    .forEach((f) => f.removeAttribute("color"));
}
let typing = null;
function rememberTyping(look) {
  const s = getSelection();
  if (!s.rangeCount || !s.isCollapsed) {
    typing = null;
    return;
  }
  const same =
    typing && typing.node === s.anchorNode && typing.offset === s.anchorOffset;
  typing = {
    node: s.anchorNode,
    offset: s.anchorOffset,
    look: { ...(same ? typing.look : {}), ...look },
  };
}
function applyFont(key) {
  if (!key || !FONTS[key]) return;
  pendingFont = FONTS[key].stack;
  restoreRange();
  cssWrap(() => document.execCommand("fontName", false, "FlynnTmpFont"));
  fixTemp();
  rememberTyping({ font: key });
  touch();
  refreshTools();
}
function applySize(px) {
  if (!+px) return;
  pendingSize = +px;
  restoreRange();
  cssWrap(() => document.execCommand("fontSize", false, "7"));
  fixTemp();
  rememberTyping({ size: +px });
  touch();
  refreshTools();
}
function applyColor(kind, color) {
  restoreRange();
  const none = kind === "fore" ? "#010203" : "transparent";
  cssWrap(() =>
    document.execCommand(
      kind === "fore" ? "foreColor" : "hiliteColor",
      false,
      color || none,
    ),
  );
  fixTemp();
  touch();
  colorPop.hidden = true;
  refreshTools();
}
const SWATCH = {
  fore: [
    "#e03131",
    "#f08c00",
    "#2f9e44",
    "#1c7ed6",
    "#7048e8",
    "#d6336c",
    "#495057",
    "#868e96",
    "#0b7285",
    "#a61e4d",
    "#5c940d",
    "#ffffff",
  ],
  back: [
    "#fff3a3",
    "#ffd8a8",
    "#c3fae8",
    "#d0ebff",
    "#e5dbff",
    "#ffdeeb",
    "#d8f5a2",
    "#e9ecef",
    "#ffec99",
    "#ffc9c9",
    "#bac8ff",
    "#99e9f2",
  ],
};
function openColors(kind, anchor) {
  menu.hidden = true;
  const basics = kind === "fore" ? SWATCH.fore : SWATCH.back;
  const noneLabel = kind === "fore" ? "Default text color" : "No highlight";
  colorPop.innerHTML =
    `<button class="none" data-c="" title="${noneLabel}"><i class="fa-solid fa-ban"></i><span>${noneLabel}</span></button>` +
    basics
      .map(
        (c) =>
          `<button data-c="${c}" style="background:${c}" title="${c}" aria-label="${c}"></button>`,
      )
      .join("");
  colorPop.onclick = (e) => {
    const b = e.target.closest("[data-c]");
    if (b) applyColor(kind, b.dataset.c || null);
  };
  // show first, then measure: a hidden element has no size, which used to
  // push the picker off the edge of narrow panels
  colorPop.hidden = false;
  const a = anchor.getBoundingClientRect(),
    w = colorPop.offsetWidth,
    h = colorPop.offsetHeight;
  let top = a.bottom + 6;
  if (top + h > innerHeight - 8) top = Math.max(8, a.top - h - 6);
  colorPop.style.top = top + "px";
  colorPop.style.left =
    Math.max(8, Math.min(innerWidth - w - 8, a.left + a.width / 2 - w / 2)) +
    "px";
}

const ACT = {
  sizeUp: () => stepSize(1),
  sizeDown: () => stepSize(-1),
  toggleTools,
  pinTools,
  importNotes: pickImport,
  pdf: printNote,
  bold: () => ex("bold"),
  italic: () => ex("italic"),
  underline: () => ex("underline"),
  strike: () => ex("strikeThrough"),
  textColor: () => openColors("fore", $('[data-cmd="textColor"]')),
  highlight: () => openColors("back", $('[data-cmd="highlight"]')),
  h1: () => block("h1"),
  h2: () => block("h2"),
  p: () => block("p"),
  quote: () => block("blockquote"),
  code: () => block("pre"),
  ul: () => list("insertUnorderedList"),
  ol: () => list("insertOrderedList"),
  check: checklist,
  save: saveNow,
  undo: () => ex("undo"),
  redo: () => ex("redo"),
  clear: clearFmt,
  link: openLink,
  hr: () => block("hr"),
  spell: toggleSpell,
  newNote,
  search: () => {
    openDrawer();
    searchEl.focus();
  },
  list: toggleDrawer,
  pin: togglePin,
  fav: toggleFav,
  settings: openSettings,
};
$("#tools").addEventListener("mousedown", (e) => {
  if (!e.target.closest("select")) e.preventDefault();
  else captureRange();
});
$("#tools").addEventListener("focusin", captureRange);
$("#tools").addEventListener("click", (e) => {
  const b = e.target.closest("[data-cmd]");
  if (b) ACT[b.dataset.cmd]?.();
});
fontSel.innerHTML =
  Object.entries(FONTS)
    .map(([k, f]) => `<option value="${k}">${f.label}</option>`)
    .join("") + '<option class="dyn" value="" hidden></option>';
const SIZES = [
  10, 11, 12, 13, 14, 15, 16, 18, 20, 22, 24, 28, 32, 36, 40, 48, 56, 64,
];
sizeSel.innerHTML =
  SIZES.map((s) => `<option value="${s}">${s}</option>`).join("") +
  '<option class="dyn" value="" hidden></option>';
function showOption(sel, value, label) {
  const dyn = sel.querySelector(".dyn");
  if (
    value != null &&
    [...sel.options].some((o) => o !== dyn && o.value === String(value))
  ) {
    sel.value = String(value);
    return;
  }
  dyn.value = value == null ? "" : String(value);
  dyn.textContent = label;
  sel.value = dyn.value;
  dyn.selected = true;
}
fontSel.onchange = () => {
  applyFont(fontSel.value);
};
function stepSize(dir) {
  const look = currentLook(),
    typed = typing?.look?.size;
  const cur = typed ?? (look.size != null ? look.size : prefs.fontSize);
  const next =
    dir > 0
      ? SIZES.find((x) => x > cur)
      : [...SIZES].reverse().find((x) => x < cur);
  if (!next) return toast(dir > 0 ? "Largest size" : "Smallest size");
  applySize(next);
  for (const b of document.querySelectorAll(".step")) {
    b.classList.remove("bump");
    void b.offsetWidth;
  }
  $(dir > 0 ? ".step.inc" : ".step.dec").classList.add("bump");
}
sizeSel.onchange = () => {
  applySize(sizeSel.value);
};

const elOf = (n) => n && (n.nodeType === 3 ? n.parentElement : n);
const normStack = (st) => st.replace(/["'\s]/g, "").toLowerCase();
function selectedElements() {
  const sel = getSelection();
  if (!sel.rangeCount) return [];
  const r = sel.getRangeAt(0);
  if (sel.isCollapsed) return [elOf(sel.anchorNode)];
  const root = r.commonAncestorContainer;
  if (root.nodeType === 3) return [root.parentElement];
  const out = new Set(),
    w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  for (let n; (n = w.nextNode()) && out.size < 400; ) {
    if (!r.intersectsNode(n)) continue;
    const a = n === r.startContainer ? r.startOffset : 0,
      z = n === r.endContainer ? r.endOffset : n.length;
    if (
      z > a &&
      n.data
        .slice(a, z)
        .replace(/\u200b/g, "")
        .trim()
    )
      out.add(n.parentElement);
  }
  return out.size ? [...out] : [elOf(r.startContainer)];
}
function currentLook() {
  const els = selectedElements().filter((e) => e && editor.contains(e));
  if (!els.length) return {};
  const sizes = new Set(),
    fonts = new Set();
  for (const el of els) {
    const cs = getComputedStyle(el);
    sizes.add(Math.round(parseFloat(cs.fontSize)));
    fonts.add(normStack(cs.fontFamily));
  }
  let font = null;
  if (fonts.size === 1) {
    const f = [...fonts][0];
    font =
      Object.keys(FONTS).find((k) => normStack(FONTS[k].stack) === f) ||
      Object.keys(FONTS).find(
        (k) => normStack(FONTS[k].stack).split(",")[0] === f.split(",")[0],
      ) ||
      "";
  }
  return { size: sizes.size === 1 ? [...sizes][0] : null, font };
}
function captureRange() {
  const sel = getSelection();
  if (sel.rangeCount && inEditor(sel.anchorNode))
    lastRange = sel.getRangeAt(0).cloneRange();
}
function refreshTools() {
  const sel = getSelection();
  captureRange();
  if (document.activeElement !== editor) return;
  updateListbar();
  const on = (cmd, v) => $(`[data-cmd="${cmd}"]`)?.classList.toggle("on", !!v);
  try {
    on("bold", document.queryCommandState("bold"));
    on("italic", document.queryCommandState("italic"));
    on("underline", document.queryCommandState("underline"));
    on("strike", document.queryCommandState("strikeThrough"));
    const b = (document.queryCommandValue("formatBlock") || "").toLowerCase();
    on("h1", b === "h1");
    on("h2", b === "h2");
    on("code", b === "pre");
    on("quote", b === "blockquote");
    on(
      "ul",
      document.queryCommandState("insertUnorderedList") && !closest("ul.check"),
    );
    on("ol", document.queryCommandState("insertOrderedList"));
    on("check", closest("ul.check"));
  } catch {}
  if (
    typing &&
    !(
      sel.isCollapsed &&
      sel.anchorNode === typing.node &&
      sel.anchorOffset === typing.offset
    )
  )
    typing = null;
  const look = { ...currentLook(), ...(typing ? typing.look : {}) };
  if ("size" in look)
    showOption(sizeSel, look.size, look.size == null ? "—" : look.size);
  if ("font" in look)
    showOption(
      fontSel,
      look.font,
      look.font == null ? "Mixed fonts" : "Custom font",
    );
}
document.addEventListener("selectionchange", refreshTools);

const linkbar = $("#linkbar"),
  linkUrl = $("#linkUrl");
function openLink() {
  if (!lastRange) editor.focus();
  linkUrl.value = closest("a")?.getAttribute("href") || "";
  linkbar.hidden = false;
  linkUrl.focus();
  linkUrl.select();
}
function closeLink() {
  linkbar.hidden = true;
  restoreRange();
}
$("#linkCancel").onclick = closeLink;
linkUrl.addEventListener("keydown", (e) => {
  if (e.key === "Escape") closeLink();
});
linkbar.addEventListener("submit", (e) => {
  e.preventDefault();
  let url = linkUrl.value.trim();
  restoreRange();
  if (!url) document.execCommand("unlink");
  else {
    if (/^\s*javascript:/i.test(url))
      return toast("That link type is not allowed");
    if (!/^[a-z][a-z0-9+.-]*:/i.test(url)) url = "https://" + url;
    if (getSelection().isCollapsed)
      document.execCommand(
        "insertHTML",
        false,
        `<a href="${url.replace(/"/g, "%22")}">${url.replace(/</g, "&lt;")}</a>&nbsp;`,
      );
    else document.execCommand("createLink", false, url);
  }
  linkbar.hidden = true;
  touch();
});

const blockOf = (node) => {
  let el = node && (node.nodeType === 3 ? node.parentElement : node);
  while (el && el !== editor) {
    if (/^(P|DIV|H1|H2|H3|LI|PRE|BLOCKQUOTE)$/.test(el.tagName)) return el;
    el = el.parentElement;
  }
  return null;
};
function syncMarkers() {
  editor.querySelectorAll("li").forEach((li) => {
    const nested = !!li.parentElement.closest("li");
    const w = document.createTreeWalker(li, NodeFilter.SHOW_TEXT, {
      acceptNode: (t) =>
        t.parentElement.closest("li") === li &&
        t.data.replace(/[\u200b\s]/g, "")
          ? 1
          : 3,
    });
    const t = w.nextNode(),
      base = getComputedStyle(li),
      cs = t ? getComputedStyle(t.parentElement) : base;
    const parentLi = nested ? li.parentElement.closest("li") : null;
    const put = (prop, val, same) => {
      const v = same
        ? parentLi && getComputedStyle(parentLi).getPropertyValue(prop).trim()
          ? "initial"
          : ""
        : val;
      if (v) {
        if (li.style.getPropertyValue(prop) !== v)
          li.style.setProperty(prop, v);
      } else if (li.style.getPropertyValue(prop)) li.style.removeProperty(prop);
    };
    put("--m-w", cs.fontWeight, cs.fontWeight === base.fontWeight);
    put("--m-i", cs.fontStyle, cs.fontStyle === base.fontStyle);
    put("--m-s", cs.fontSize, cs.fontSize === base.fontSize);
    put("--m-f", cs.fontFamily, cs.fontFamily === base.fontFamily);
    put("--m-c", cs.color, cs.color === base.color);
    if (!li.getAttribute("style")?.trim()) li.removeAttribute("style");
  });
}
const listbar = $("#listbar"),
  lbStart = $("#lbStart");
let lbOl = null;
function updateListbar() {
  lbOl = closest("ol");
  listbar.hidden = !lbOl || !!notes[activeId]?.trashed;
  if (lbOl && document.activeElement !== lbStart)
    lbStart.value = lbOl.start || 1;
}
function setStart(n) {
  if (!lbOl) return;
  n = Math.max(1, Math.min(9999, Math.round(+n) || 1));
  if (n === 1) lbOl.removeAttribute("start");
  else lbOl.setAttribute("start", n);
  lbStart.value = n;
  touch();
}
listbar.addEventListener("mousedown", (e) => {
  if (!e.target.closest("input")) e.preventDefault();
});
lbStart.onchange = () => setStart(lbStart.value);
lbStart.onkeydown = (e) => {
  if (e.key === "Enter") {
    e.preventDefault();
    setStart(lbStart.value);
    restoreRange();
  }
};
$("#lbRestart").onclick = () => setStart(1);
$("#lbCont").onclick = () => {
  if (!lbOl) return;
  let p = lbOl.previousElementSibling;
  while (p && p.tagName !== "OL") p = p.previousElementSibling;
  if (!p) return toast("There is no numbered list above this one");
  setStart((p.start || 1) + p.querySelectorAll(":scope > li").length);
};

function tryAutoFormat(e) {
  const sel = getSelection();
  if (!sel.rangeCount || !sel.isCollapsed || !inEditor(sel.anchorNode)) return;
  let blk = blockOf(sel.anchorNode);
  if (!blk) {
    document.execCommand("formatBlock", false, "p");
    blk = blockOf(getSelection().anchorNode);
  }
  if (!blk || blk.tagName === "LI" || blk.tagName === "PRE" || closest("li"))
    return;
  const r = document.createRange();
  r.selectNodeContents(blk);
  r.setEnd(sel.anchorNode, sel.anchorOffset);
  const before = r.toString();
  const num = /^\d{1,4}[.)]$/.test(before) ? parseInt(before) : 0;
  const cmd = /^[-*•]$/.test(before)
    ? "ul"
    : num
      ? "ol"
      : /^(\[\]|\[ \]|\[x\])$/i.test(before)
        ? "check"
        : before === "#"
          ? "h1"
          : before === "##"
            ? "h2"
            : before === ">"
              ? "quote"
              : null;
  if (!cmd) return;
  e.preventDefault();
  r.deleteContents();
  if (!blk.textContent && !blk.querySelector("br")) blk.innerHTML = "<br>";
  r.setStart(blk, 0);
  r.collapse(true);
  sel.removeAllRanges();
  sel.addRange(r);
  ACT[cmd]();
  if (cmd === "ol") {
    const ol = closest("ol");
    if (ol && ol.children.length === 1) {
      if (num > 1) ol.setAttribute("start", num);
      else ol.removeAttribute("start");
      touch();
    }
  }
}

editor.addEventListener("input", () => {
  fixTemp();
  touch();
});
editor.addEventListener("blur", (e) => {
  captureRange();
  if (!e.relatedTarget || !listbar.contains(e.relatedTarget))
    listbar.hidden = true;
  if (saveMode() === "instant") flush();
  else if (dirty) {
    clearTimeout(draftTimer);
    draftTimer = setTimeout(writeDraft, 300);
  }
});
editor.addEventListener("paste", (e) => {
  e.preventDefault();
  document.execCommand(
    "insertText",
    false,
    e.clipboardData.getData("text/plain"),
  );
});
editor.addEventListener("click", (e) => {
  const a = e.target.closest("a");
  if (a && (e.ctrlKey || e.metaKey)) {
    e.preventDefault();
    chrome.tabs.create({ url: a.href });
    return;
  }
  const li = e.target.closest("li");
  if (
    li &&
    li.parentElement.classList.contains("check") &&
    e.target === li &&
    e.offsetX < 28
  ) {
    li.classList.toggle("done");
    touch();
  }
});
editor.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey) {
    const prev = closest("li");
    setTimeout(() => {
      const li = closest("li");
      if (li && li !== prev) li.classList.remove("done");
    }, 0);
  }
  if (e.key === "Tab" && closest("li")) {
    e.preventDefault();
    document.execCommand(e.shiftKey ? "outdent" : "indent");
    touch();
  }
  if (
    e.key === " " &&
    prefs.autoFormat &&
    !e.ctrlKey &&
    !e.altKey &&
    !e.metaKey &&
    !e.isComposing
  )
    tryAutoFormat(e);
});

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    menu.hidden = true;
    colorPop.hidden = true;
    nbPop.hidden = true;
    ctxMenu.hidden = true;
    if (!linkbar.hidden) closeLink();
    else closeDrawer();
    return;
  }
  const combo = comboFromEvent(e);
  if (!combo) return;
  const id = keymap.get(combo);
  if (!id) return;
  if (!ACTION_MAP[id].global && document.activeElement !== editor) return;
  e.preventDefault();
  ACT[id]?.();
});

async function handleCmd(cmd) {
  await ready;
  if (cmd?.type === "new" && Date.now() - cmd.t < 5000) {
    await chrome.storage.local.remove("cmd");
    newNote();
  }
}
chrome.storage.onChanged.addListener((ch, area) => {
  if (area !== "local") return;
  let relist = false;
  for (const [k, { newValue }] of Object.entries(ch)) {
    if (k.startsWith("note:")) {
      const id = k.slice(5);
      if (!newValue) {
        delete notes[id];
        relist = true;
        if (id === activeId) pickNext();
        continue;
      }
      const old = notes[id];
      // ignore late echoes of our own older saves
      if (old && (newValue.modified || 0) < (old.modified || 0)) continue;
      if (old?.file && !newValue.file) newValue.file = old.file;
      if (JSON.stringify(old) === JSON.stringify(newValue)) continue;
      const external =
        !old ||
        old.html !== newValue.html ||
        old.title !== newValue.title ||
        !!old.trashed !== !!newValue.trashed;
      notes[id] = newValue;
      relist = true;
      if (id === activeId) {
        // no unsaved typing here, so show what was changed elsewhere (e.g. a web clip)
        if (external && !dirty) loadActive();
        else {
          paintActions();
          updateMeta();
        }
      }
    } else if (k.startsWith("nb:")) {
      const id = k.slice(3);
      if (newValue) NOTEBOOKS[id] = newValue;
      else {
        delete NOTEBOOKS[id];
        if (view === "nb:" + id) view = "all";
      }
      relist = true;
    } else if (k === "prefs" && newValue) {
      prefs = { ...DEFAULT_PREFS, ...newValue };
      keymap = buildKeymap(prefs);
      applyPrefs();
    } else if (
      k === "activeSide" &&
      newValue &&
      newValue !== activeId &&
      notes[newValue]
    )
      openNote(newValue);
    else if (k === "cmd" && newValue) handleCmd(newValue);
  }
  if (relist) renderList();
});
window.addEventListener("pagehide", exitSave);
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "hidden") exitSave();
});
$("#actbar").addEventListener("mousedown", (e) => e.preventDefault());
$("#undoBtn").onclick = () => ex("undo");
$("#redoBtn").onclick = () => ex("redo");
$("#saveBtn").onclick = saveNow;

const nbHeader = $(".nb-head");
const nbsEl = $("#nbs");
nbHeader.addEventListener("click", (e) => {
  if (e.target.closest("#nbAdd")) return;
  nbsEl.classList.toggle("collapsed");
  nbHeader.classList.toggle("closed");
});

(async function init() {
  prefs = await getPrefs();
  keymap = buildKeymap(prefs);
  applyPrefs();
  const all = await chrome.storage.local.get(null);
  for (const [k, v] of Object.entries(all)) {
    if (k.startsWith("note:")) notes[v.id] = v;
    else if (k.startsWith("nb:") && v?.id) NOTEBOOKS[v.id] = v;
    else if (k.startsWith("draft:")) drafts[k.slice(6)] = v;
  }
  let id = all.activeSide;
  if (!notes[id] || notes[id].trashed || notes[id].archived) {
    id = Object.values(notes)
      .filter((n) => !n.trashed && !n.archived)
      .sort((a, b) => b.modified - a.modified)[0]?.id;
  }
  if (!id) {
    const now = Date.now(),
      n = {
        id: uid(),
        title: "",
        html: "",
        created: now,
        modified: now,
        pinned: false,
        favorite: false,
        archived: false,
        trashed: false,
      };
    notes[n.id] = n;
    await chrome.storage.local.set({ ["note:" + n.id]: n });
    id = n.id;
  }
  activeId = id;
  loadActive();
  renderList(true);
  setupContextMenus();
  chrome.storage.local.set({ activeSide: id });
  await FS.init();
  readyResolve();
  if (all.cmd) handleCmd(all.cmd);
  else if (!notes[id].html && !notes[id].title) editor.focus();
})();
