# Flynn Notes

A browser-based notepad for Chrome that opens in the right-side panel. Flynn Notes is designed for quick writing, organizing notes, collecting useful web selections, and keeping your notes available while browsing.

> **Current version:** 2.2.0  
> **Platform:** Google Chrome (Manifest V3)

## Features

- **Side-panel notes** — open Flynn Notes from the Chrome toolbar and write without leaving the current page.
- **Quick access** — use keyboard shortcuts to open the panel or create a new note.
- **Rich-text editor** — format text with bold, italic, underline, strikethrough, headings, lists, checklists, quotes, links, code, highlights, and text colors.
- **Note organization** — search note titles and content, and organize notes with folders, favorites, pinning, archive, and trash.
- **Automatic saving** — changes are saved automatically in the browser.
- **Web clipping** — select text on a webpage, right-click, and save the selection to Flynn Notes with its page link.
- **Import and export** — import `.md` and `.txt` files, download individual notes as Markdown, and use the storage settings to export or import a notes backup.
- **Print and PDF** — print a note or save it as a PDF using the browser print dialog, with A4 formatting.
- **Personalization** — configure themes, fonts, font sizes, editor colors, and animation preferences.
- **Toolbar controls** — hide or pin the formatting toolbar and customize supported editor shortcuts in Settings.
- **Writing statistics** — view word count, character count, and estimated reading time.

## Installation

### Load the extension locally

1. Download or clone this repository.
2. Extract the project folder if it was downloaded as a ZIP file.
3. Open `chrome://extensions` in Google Chrome.
4. Turn on **Developer mode**.
5. Select **Load unpacked**.
6. Choose the `flynn-notes` project folder (the folder containing `manifest.json`).
7. Click the Flynn Notes icon in the Chrome toolbar to open the side panel.

## Keyboard shortcuts

| Action | Default shortcut |
| --- | --- |
| Open Flynn Notes side panel | `Alt + Shift + S` |
| Open Flynn Notes and start a new note | `Alt + Shift + N` |
| Increase editor font size | `Ctrl + Shift + .` |
| Decrease editor font size | `Ctrl + Shift + ,` |
| Hide or show the toolbar | `Alt + T` |
| Pin or unpin the toolbar | `Alt + P` |

You can review or customize supported editor shortcuts in **Settings → Shortcuts**. Chrome may let you change extension shortcuts at `chrome://extensions/shortcuts`.

## Import, export, and backups

- Import Markdown or plain-text files (`.md`, `.markdown`, `.txt`) from the import button, the note menu, Settings → Storage, or by dragging supported files onto the panel.
- Download an individual note as a Markdown file from its menu.
- Use **Settings → Storage** to export all notes or import a previous backup.
- Use **Print / save as PDF** in a note's menu to create a printable copy.

## Updating the extension

1. Download or pull the latest project files.
2. Open `chrome://extensions`.
3. Find **Flynn Notes** and click its reload icon.
4. Reopen the side panel if it is already open.

Your notes are stored in Chrome extension storage and should remain available when updating the extension. For important notes, export a backup before replacing or removing the extension.

## Project structure

```text
flynn-notes/
├── manifest.json       # Chrome extension configuration
├── background.js       # Service worker, commands, and context-menu actions
├── sidepanel.html      # Main notes side-panel interface
├── app.js              # Main editor and note interactions
├── app.css             # Side-panel styling
├── base.css            # Shared styles
├── shared.js           # Shared storage and utility functions
├── options.html        # Settings page
├── options.js          # Settings behavior
├── options.css         # Settings styling
├── print.html          # Print view
├── print.js            # Print preparation
├── print.css           # Print layout
├── fonts.css           # Local font definitions
├── fonts/              # Bundled font files
├── icons/              # Extension icons
└── vendor/             # Bundled third-party assets
```

## Data and permissions

Flynn Notes uses Chrome extension storage to save notes and preferences in the browser. The project does not require a Flynn Notes account or a cloud database to use its core note-taking features. Notes are not automatically synced to a separate cloud service by this extension.

The extension requests these Chrome permissions:

- `storage` and `unlimitedStorage` — save notes and settings, with additional storage capacity for note content.
- `sidePanel` — display the notepad in Chrome's side panel.
- `contextMenus` — provide right-click actions for opening Flynn Notes and saving selected webpage text.
- `activeTab` — support actions associated with the active browser tab.

## Built with

- HTML, CSS, and JavaScript
- Chrome Extensions Manifest V3
- Chrome Side Panel API and extension storage
- Bundled local fonts and Font Awesome icons

## Version history

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

## License

No license file is currently included. Unless a license is added to this repository, all rights remain with the copyright holder.
