<div align="center">

<img src="icons/128.png" alt="Flynn Notes logo" width="96" height="96">

# Flynn Notes

**A modern notepad that lives in Chrome's side panel, or opens as a full page.**
Fast writing, notebooks, web clipping, and Markdown files saved to a folder you choose.

![Version](https://img.shields.io/badge/version-2.9.0-C2603A)
![Platform](https://img.shields.io/badge/platform-Chrome-4285F4?logo=googlechrome&logoColor=white)
![Manifest](https://img.shields.io/badge/Manifest-V3-34A853)
![Dependencies](https://img.shields.io/badge/runtime%20dependencies-0-success)
![Build](https://img.shields.io/badge/build%20step-none-lightgrey)
![Storage](https://img.shields.io/badge/data-local%20only-blueviolet)

[Features](#features) · [Install](#installation) · [Shortcuts](#keyboard-shortcuts) · [Architecture](#architecture) · [Code style](#code-style) · [Contributing](#contributing) · [Changelog](#changelog)

</div>

---

## Table of contents

- [Overview](#overview)
- [Features](#features)
- [Installation](#installation)
- [Usage](#usage)
- [Keyboard shortcuts](#keyboard-shortcuts)
- [Settings](#settings)
- [Architecture](#architecture)
- [Project structure](#project-structure)
- [Data and storage](#data-and-storage)
- [Permissions and privacy](#permissions-and-privacy)
- [Theming](#theming)
- [Code style](#code-style)
- [Development workflow](#development-workflow)
- [Contributing](#contributing)
- [Troubleshooting](#troubleshooting)
- [Tech stack and credits](#tech-stack-and-credits)
- [License](#license)
- [Changelog](#changelog)

## Overview

Flynn Notes is a Manifest V3 Chrome extension for quick, distraction-free note taking while you browse. The same interface runs in the browser's side panel or in a full browser tab. Notes are saved in Chrome extension storage and can optionally be written to a local folder as plain Markdown files.

| | |
| --- | --- |
| **Current version** | 2.9.0 |
| **Platform** | Google Chrome (Manifest V3) |
| **Language** | Vanilla JavaScript, HTML, CSS |
| **Build tooling** | None. The folder loads directly into Chrome. |
| **Runtime dependencies** | None. Fonts and Font Awesome are bundled locally. |
| **Accounts / cloud** | None required |

## Features

### Writing
- **Rich-text editor**: bold, italic, underline, strikethrough, headings, bullet / numbered / check lists, quotes, links, inline code, code blocks with a language, highlights and text colors.
- **Code blocks with a header**: each block shows its language (click to change it) with **Copy** and **Download** buttons. Type ```` ```js ```` + Space to start one.
- **Back, Next and Save bar**: always visible above the editor, even when the formatting toolbar is hidden.
- **Flexible saving**: save instantly, N minutes after you start writing, or only when you press Save. Unsaved text is kept as a draft and restored if the panel closes.
- **Writing statistics**: word count, character count and estimated reading time.

### Organization
- **Notebooks**: separate spaces for notes; move, rename or delete them.
- **Pin, favorite, archive and trash** for every note.
- **Search** across titles and content.

### Capture and export
- **Web clipping**: select text on any page, right-click, and save it to a "Web clips" note with the page link.
- **Import** `.md`, `.markdown` and `.txt` files by button, menu or drag and drop.
- **Export**: download a note as Markdown (named exactly like the note), or back up and restore all notes from Settings → Storage.
- **Save folder**: connect a folder and each notebook becomes a subfolder of Markdown files.
- **Print / PDF**: A4 print layout through the browser print dialog.

### Interface
- **Side panel or full page**: expand into a normal tab from the button in the Back / Next / Save bar, the notes drawer, the note menu, a shortcut, or the right-click menu. The side panel closes automatically so the same notes are not open twice.
- **Soft Glass theme**: warm ivory / charcoal surfaces, frosted-glass bars and four accent colors (terracotta, blue, lavender, teal).
- **Premium look and motion**: gradients, spring animations and the Anime Night theme, controlled by an Animation setting (Lively, Subtle, Off).
- **Personalization**: fonts, font sizes, editor colors and customizable editor shortcuts.

## Installation

### Load unpacked (developer mode)

1. Download or clone this repository. Unzip it if you downloaded a ZIP.
2. Open `chrome://extensions` in Google Chrome.
3. Turn on **Developer mode** (top right).
4. Click **Load unpacked**.
5. Select the `flynn-notes` folder, the one that contains `manifest.json`.
6. Click the Flynn Notes icon in the toolbar to open the side panel.

### Update

1. Replace the project files with the new version.
2. Go to `chrome://extensions` and click the reload icon on **Flynn Notes**.
3. Reopen the side panel.

Notes live in Chrome extension storage and survive updates. Export a backup before removing the extension.

### Requirements

| Requirement | Why |
| --- | --- |
| Chrome 123 or newer | The theme uses the CSS `light-dark()` function, and the side panel API needs a recent Chrome. |
| Chrome 141 or newer (optional) | Lets the extension close the side panel itself when opening the full page from a shortcut or the right-click menu. |
| A Chromium browser with `showDirectoryPicker` | Needed only for the optional save-to-folder feature. |

## Usage

| I want to… | Do this |
| --- | --- |
| Open the notes | Click the toolbar icon, or press `Alt + Shift + S` |
| Add a code block | Click the `</>` button, press `Ctrl + Alt + C`, or type ```` ```js ```` and Space |
| Copy or download a code block | Use **Copy** / **Download** in the block's header |
| Start a new note | Press `Alt + Shift + N`, or use **New note** in the drawer |
| Open as a full page | Click the expand-arrows button next to Save, or press `Alt + Shift + F` |
| Clip text from a page | Select text, right-click, **Save selection to Flynn Notes** |
| Import files | Import button, note menu, Settings → Storage, or drag files onto the window |
| Print or save as PDF | Note menu (⋯) → **Print / save as PDF** |
| Back up everything | Settings → Storage → export |

## Keyboard shortcuts

| Action | Default |
| --- | --- |
| Open the side panel | `Alt + Shift + S` |
| Open as a full page | `Alt + Shift + F` |
| Open and start a new note | `Alt + Shift + N` |
| Save now | `Ctrl + S` |
| Increase editor font size | `Ctrl + Shift + .` |
| Decrease editor font size | `Ctrl + Shift + ,` |
| Code block | `Ctrl + Alt + C` |
| Hide or show the toolbar | `Alt + T` |
| Pin or unpin the toolbar | `Alt + P` |

Editor shortcuts can be changed in **Settings → Shortcuts**. Extension-level shortcuts (the first three) are managed at `chrome://extensions/shortcuts`.

## Settings

Open Settings from the drawer or the extension's options page. It has seven sections:

| Section | What it controls |
| --- | --- |
| Appearance | Theme (light, dark, Anime Night), accent color, animation level |
| Typography | Fonts, font style, font sizes |
| Colors | Editor text and highlight colors |
| Editor | Saving mode, spell check, toolbar behavior |
| Shortcuts | Editor keyboard shortcuts |
| Storage | Save folder, export / import backups |
| About | Version and project information |

## Architecture

```text
                ┌──────────────────────────┐
                │  js/background.js        │  service worker
                │  commands · context menu │
                └────────────┬─────────────┘
                             │ chrome.storage.local  (cmd, notes)
┌──────────────────────┐     │     ┌──────────────────────┐
│ pages/sidepanel.html │◄────┴────►│ pages/options.html   │
│  js/app.js           │           │  js/options.js       │
│  (side panel / tab)  │           │  (settings)          │
└──────────┬───────────┘           └──────────┬───────────┘
           │            js/shared.js          │
           └─────► storage · prefs · folder ◄─┘
                   sync · Markdown helpers
           │
           └──► pages/print.html + js/print.js  (print view)
```

- **One interface, two containers.** `sidepanel.html` runs both in Chrome's side panel and in a normal tab. `app.js` uses `chrome.tabs.getCurrent()` to tell which one it is in.
- **Storage as the message bus.** The service worker never talks to the page directly. It writes a command (for example "new note" or a clipped note) to `chrome.storage.local`, and the page reacts to the storage change.
- **Shared module.** `shared.js` holds storage access, preferences, folder sync and Markdown conversion, and is loaded by every page.
- **No build step.** Plain scripts loaded with `<script>`. No bundler, transpiler or package manager.

### Script load order

Order matters because the files share globals, with no module system.

| Page | Scripts, in order |
| --- | --- |
| `sidepanel.html` | `sg-motion.js` → `shared.js` → `app.js` |
| `options.html` | `sg-motion.js` → `shared.js` → `options.js` |
| `print.html` | `shared.js` → `print.js` |

### Stylesheet load order

| Layer | File | Role |
| --- | --- | --- |
| 1 | `theme.css` | Design tokens and accent presets. **Load first; owns all colors.** |
| 2 | `sg-motion.css` | Motion kit (spinner, glide, collapse, pulse) |
| 3 | `fonts.css` + Font Awesome | Local fonts and icons |
| 4 | `base.css` | Shared base styles; aliases app tokens to the theme |
| 5 | `app.css` / `options.css` / `print.css` | Page-specific layout |
| 6 | `premium.css` | Gradients, glass, ambient effects, animation |
| 7 | `polish.css` | Final pass: flat toolbar, focus rings, contrast, forced-colors |

## Project structure

```text
flynn-notes/
├── manifest.json            # Extension configuration (Manifest V3)
├── README.md
├── pages/                   # HTML screens
│   ├── sidepanel.html       # Main notes interface (side panel and full page)
│   ├── options.html         # Settings page
│   └── print.html           # Print view
├── js/                      # Scripts
│   ├── background.js        # Service worker: commands, context menus, full-page opener
│   ├── app.js               # Editor and note interactions
│   ├── shared.js            # Storage, preferences, folder sync, Markdown helpers
│   ├── options.js           # Settings behavior
│   ├── print.js             # Print preparation
│   └── sg-motion.js         # Controller for the motion kit (window.SGM)
├── css/                     # Styles
│   ├── theme.css            # Soft Glass tokens and accent presets
│   ├── base.css             # Shared styles
│   ├── app.css              # Main interface
│   ├── options.css          # Settings page
│   ├── print.css            # Print layout
│   ├── premium.css          # Premium visual layer
│   ├── polish.css           # Final polish layer
│   ├── sg-motion.css        # Motion kit animations
│   └── fonts.css            # Local @font-face definitions
├── fonts/                   # Bundled .woff2 files
├── icons/                   # 16, 48 and 128 px extension icons
└── vendor/                  # Bundled third-party assets (Font Awesome)
```

**Size at a glance:** about 5,900 lines across 6 scripts, 9 stylesheets and 3 pages. The largest file is `js/app.js` (about 2,000 lines).

## Data and storage

All data stays in your browser. There is no account, server or cloud sync.

| Key | Contents |
| --- | --- |
| `note:<id>` | One entry per note: `id`, `title`, `html`, `created`, `modified`, plus flags `pinned`, `favorite`, `archived`, `trashed` and `clips`. Code blocks are `<pre data-lang="js">`; the language header is drawn by the editor and is not stored |
| `prefs` | Appearance, typography, editor and shortcut preferences |
| `activeSide` | The note currently open |
| `cmd` | A one-off command from the service worker to the page |

Storage area: `chrome.storage.local` with `unlimitedStorage`.

**Optional save folder.** When you connect a folder through the File System Access API, each note is also written as a Markdown file, and each notebook becomes a subfolder. Files are named exactly like the note (`Shopping list.md`); duplicate titles become `Title (2).md`. Code blocks are written as fenced blocks with their language (```` ```js ````) and read back the same way on import.

## Permissions and privacy

| Permission | Used for |
| --- | --- |
| `storage`, `unlimitedStorage` | Saving notes and settings |
| `sidePanel` | Showing the notepad in Chrome's side panel |
| `contextMenus` | Right-click actions: open the side panel, open as full page, save selected text |
| `activeTab` | Actions on the current tab (web clipping) |

- No host permissions, no remote code, no analytics, no network requests.
- Fonts and icons are bundled, so the extension works offline.
- Notes are never sent anywhere by the extension.

## Theming

Colors live only in `css/theme.css` as `light-dark()` design tokens. Application CSS must use `var(--token)` and never hard-coded colors.

- Switch accent with `data-accent="terracotta | blue | lavender | teal"` on `<html>`.
- Switch mode with `data-theme="light | dark"`; leave it off to follow the system.
- To add an accent, copy any accent block in `theme.css`, rename it and change its six values.
- Anime Night keeps its own palette in `premium.css`.

## Code style

The project has no linter or formatter configured. Follow the existing conventions:

**General**
- 2-space indentation, semicolons, `const` by default, `let` only when reassigned, no `var`.
- Plain browser JavaScript (ES2020+). No frameworks, no bundler, no `npm` dependencies.
- Small arrow-function helpers for one-liners, `async` / `await` instead of promise chains.
- Keep shared logic in `shared.js`; keep page logic in that page's script.
- Comment *why*, not *what*. Short header comments at the top of a file or section are welcome.

**JavaScript**
- Double quotes in `app.js` and `options.js`; single quotes in `background.js` and `shared.js`. Keep a file consistent with itself.
- Use `chrome.*` APIs with `await`. Wrap calls that may fail on older Chrome versions in `.catch(() => {})` or a feature check, as in `chrome.sidePanel.close`.
- Never use `innerHTML` with unescaped text. Use the existing `esc()` helper in `background.js` or `textContent`.
- Save through the shared `flush()` before doing anything that closes the page.

**CSS**
- Use tokens from `theme.css` (`var(--surface)`, `var(--text)`, `var(--accent)`), never raw hex values.
- Page rules go in the page's own stylesheet; cross-page rules go in `base.css`.
- Respect the Animation setting and `prefers-reduced-motion`; add motion through `sg-motion.css`.
- Keep a visible focus ring and support forced-colors (see `polish.css`).

**HTML**
- Semantic elements and `aria-label` / `title` on icon-only buttons.
- Paths in `pages/*.html` are relative to the page, so they start with `../`.

**Naming**
- Files: lowercase, kebab-case (`sg-motion.js`).
- DOM ids: camelCase (`#saveBtn`, `#tabBtn`). CSS classes: short, lowercase (`.act`, `.ib`).
- Storage keys: lowercase, with a `prefix:` for collections (`note:<id>`).

## Development workflow

1. Edit files in place. There is nothing to compile.
2. Reload the extension at `chrome://extensions`.
3. Reopen the side panel or tab to see changes.
4. Debug the side panel or full page: right-click → **Inspect**. Debug the service worker: click **service worker** on the extension card.
5. Check script syntax quickly:

   ```bash
   for f in js/*.js; do node --check "$f"; done
   node -e "JSON.parse(require('fs').readFileSync('manifest.json'))"
   ```

### Pre-release checklist

- [ ] Version bumped in `manifest.json` **and** the README header and badge
- [ ] Changelog entry added
- [ ] Every path in `manifest.json` and `pages/*.html` resolves
- [ ] Side panel, full page, Settings and print view all open
- [ ] New note, save, undo / redo, import and export all work
- [ ] Light, dark and Anime Night themes checked
- [ ] Notes survive a reload of the extension

## Contributing

1. Fork the repository and create a branch (`feature/short-description`).
2. Keep changes focused; one feature or fix per pull request.
3. Follow the [code style](#code-style) above.
4. Test manually using the pre-release checklist.
5. Describe what changed and why in the pull request, with a screenshot for any visual change.

Commit messages use a short imperative summary, for example `Add full-page button to the action bar`.

## Troubleshooting

| Problem | Fix |
| --- | --- |
| Icon does nothing | Reload the extension at `chrome://extensions` and try again |
| Side panel or Settings looks unstyled | A file path is wrong. Open the page's DevTools and check the Network tab for 404s |
| Colors look wrong or broken | Chrome is older than 123; update Chrome |
| Shortcut does not work | Another extension may use it; change it at `chrome://extensions/shortcuts` |
| Side panel stays open after opening the full page by shortcut | Chrome is older than 141; close it manually |
| "Choose folder" is missing | The browser does not support the File System Access API |
| Notes disappeared | They are stored per Chrome profile; check you are in the same profile, and restore from a backup |

## Tech stack and credits

- HTML, CSS and JavaScript (no framework)
- Chrome Extensions Manifest V3: Side Panel, Storage, Context Menus, Commands APIs
- File System Access API for the optional save folder
- [Font Awesome Free](https://fontawesome.com) 7.3.1 (icons: CC BY 4.0, fonts: SIL OFL 1.1, code: MIT)
- Fonts bundled locally: Plus Jakarta Sans, Roboto, Open Sans, Battambang (for Khmer)

## License

No license file is currently included. Unless a license is added to this repository, all rights remain with the copyright holder. Add a `LICENSE` file before sharing or publishing the project, and update this section to match.

## Changelog

### 2.9.0

- **Code blocks now have a header.** Every code block shows a bar at the top: the language on the left (click it to change it: text, md, js, ts, py, c, cpp, cs, java, go, rs, php, sql, json, yaml, html, css, bash) and **Copy** and **Download** on the right. Download saves the block as `code.<ext>` (for example `code.py`). The header is drawn above the editor, so it is never saved into the note. The header uses a thin `</>` icon and follows the light, dark and Anime Night themes. The language also shows as a small label in the print view.
- Type ```` ```js ```` and press Space to start a code block in that language (a bare ```` ``` ```` + Space gives a plain code block).
- Markdown export writes the language on the fence (```` ```js ````) and import reads it back, so languages survive a round trip.
- **Tab** inside a code block inserts two spaces instead of moving focus.
- **Copy** puts both plain text and a `<pre><code>` version on the clipboard, so rich inputs (such as a chat box) paste it as a code block and plain fields get clean text.
- Copy, Download and Markdown export keep every line break of a code block, the same as selecting and copying by hand.

### 2.8.0

- Added **Open as full page**: a button at the right end of the Back / Next / Save bar, the `Alt + Shift + F` shortcut, and an "Open Flynn Notes as full page" right-click item.
- Opening the full page saves the current note and closes the side panel (on Chrome versions that support it). The button inside the full page does not close it.
- Reorganized the project into `pages/`, `js/` and `css/` folders, with all paths updated.
- Rewrote the README with badges, architecture, storage, code style and contributing guides.

### 2.7.0

- Added the **Soft Glass Motion** kit (`sg-motion.css` / `sg-motion.js`).
- Save button: ring spinner while saving, ring pulse and popping icon when saved; labels slide when they change ("Save" ↔ "Saved"). The footer status text slides in too.
- Import button shows a spinner while files are importing.
- Settings: Animation, Font style and Saving are gliding segmented controls, and the "Save after N minutes" row opens and closes smoothly.
- The Animation setting rules everything: **Lively** plays all motion, **Subtle** keeps quick fades and state changes, **Off** removes movement (loading spinners stay visible).

### 2.6.0

- New **Soft Glass** theme (`theme.css`): warm ivory in light mode, warm charcoal in dark mode, brown-tinted layered shadows, frosted-glass bars and menus, and Plus Jakarta Sans for the interface (Khmer falls back to Battambang).
- New **Accent** picker in Settings → Appearance: terracotta (default), blue, lavender or teal.
- All colors in the app CSS now come from theme tokens, so light / dark and every accent stay consistent. Anime Night keeps its own palette.
- The Light and Dark tiles in Settings preview the real theme colors.

### 2.5.0

- Cleaner look: the formatting toolbar is a flat strip under the header, Back / Next are quiet buttons and Save is the single highlighted action.
- Easier-to-read footer: plain "words · chars · min read" text, one colored status icon, and "Edited" text hides in narrow panels.
- Notes list: the selected note uses a calm tinted highlight; hover no longer moves cards.
- Buttons and menus no longer jump on hover; popovers open without the bounce.
- One consistent keyboard focus ring, plus high-contrast and forced-colors support.
- Shorter empty-notebooks hint.

### 2.4.5

- Fixed a file-name clash on Windows and macOS: changing only the capitalization of a title (`note` → `Note`) no longer creates `Note (2).md`.
- Removed an unused leftover page (`popup.html`) and a duplicated list-marker rule.
- README corrections: notes are organized in notebooks (not folders), and the Anime Night description matches the code.

### 2.4.4

- Markdown files are named exactly like the note (for example `Shopping list.md`) instead of ending in an `[xxxx]` ID tag, both for "Download as Markdown" and in the save folder. Notes with the same title get `Title (2).md`, and existing files are renamed the next time the note is saved.
- Fixed the "No highlight" / "Default text color" button in the color picker so it spans the full width above the 6 × 2 grid.
- Fixed bullets and numbers not following the text when the first words of a list item are bold, italic, colored or a different size or font.
- Menus, pickers and the notes drawer use a 97% opaque background so note text no longer shows through.

### 2.4.3

- Fixed notebooks not being created as subfolders in the save folder: new notebooks (even empty ones) get a folder immediately, notes are saved inside their notebook folder, and renaming, moving or deleting a notebook updates the folders.

### 2.4.2

- Fixed the highlight and text-color pickers opening partly off-screen in narrow panels; they now center under their button and stay inside the panel (opening upward if there is no room below).
- Tidied the picker layout: a clearly labeled "No highlight" / "Default text color" button on top and a neat 6 × 2 grid of colors, instead of a lone extra swatch on a third row.
- Menus and pickers are now nearly opaque so note text no longer shows through them.

### 2.4.1

- Fixed the formatting toolbar overflowing in narrow side panels (the "A+" button was cut off and the last buttons wrapped onto an extra row).
- Added a compact toolbar layout for small widths: smaller controls, a font selector that shrinks to fit, and buttons that pack into two tidy rows down to about 300px wide.
- Long note titles now end with an ellipsis instead of being cut off.

### 2.4.0

- New premium visual design across the side panel and settings: gradient accents, frosted-glass drawer, toolbar and menus, softly moving ambient light, refined typography and spacing.
- Note cards, notebooks and navigation have gradient outlines, glows and springy hover motion; the New note button gets a gloss sweep and the Save button pulses while there are unsaved changes.
- Anime Night is now more immersive: falling sakura petals, a drifting aurora, a shooting star, glowing links and favorites, and a gradient brand mark.
- Settings page redesigned with glass cards, hairline gradient borders and a gradient navigation highlight.
- All motion follows the Animation setting: **Lively** shows everything, **Subtle** keeps quick fades, **Off** disables it, and your system's "reduce motion" setting is respected.
- Fixed the right-click "Move to notebook…" menu closing before you could pick a notebook.

### 2.3.1

- Fixed notes with the same title overwriting each other's Markdown file in the save folder; they now get `Title (2).md`, and no note's file is deleted by another.
- Fixed web clips being lost when the clip note was open in the panel; changes made elsewhere now appear and are no longer overwritten.
- Fixed the settings page exporting an out-of-date backup; it now reads the latest notes, and the note count stays current.
- Fixed Quote, Code and Horizontal line formatting (block formatting was applied twice, and a line could be inserted after the wrong divider).
- Markdown import no longer breaks links containing underscores; Markdown export keeps links with spaces or brackets valid.
- Deleting a notebook from the right-click menu no longer jumps away from the notebook you are viewing.
- Importing a backup no longer carries over folder paths from another computer.

### 2.3.0

- Fixed highlight and text color: choosing "no color" no longer leaves black text, and highlighted text is always readable (including in dark themes).
- Numbered and bulleted lists now follow the text: bold, italic, color and size of the first words carry over to the number or bullet.
- Numbered lists work more like Word: nested levels use 1. / a. / i., typing `3.` + Space starts a list at 3, and a Numbering box lets you set the start number, restart at 1, or continue from the list above.
- Fixed H1 / H2 leaving oversized text behind when applied or removed.
- Added Back (undo), Next (redo) and Save buttons, and `Ctrl + S`.
- Added a saving setting: instantly, after N minutes of writing, or manual only, with draft recovery.
- Added notebooks (spaces for notes), a "Move to notebook" menu and notebook subfolders in the save folder.

### 2.2.0

- Added importing `.md`, `.markdown`, and `.txt` files as notes, including drag-and-drop import.
- Added A4 print layout and PDF export through the browser print dialog.
- Added editor color customization with a live preview.
- Added font-size increase and decrease controls and keyboard shortcuts.
- Added toolbar hide/show and pin/unpin controls.
- Added Lively, Subtle, and Off animation settings.
- Removed tags.

### 2.1

- Improved font and font-size controls to reflect the current selection, including mixed formatting and an empty caret.
- Redesigned the full-screen Settings page with a live preview.
