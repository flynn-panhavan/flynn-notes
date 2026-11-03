# Flynn Notes

A browser-based notepad for Chrome that opens in the right-side panel. Flynn Notes is designed for quick writing, organizing notes, collecting useful web selections, and keeping your notes available while browsing.

> **Current version:** 2.4.2  
> **Platform:** Google Chrome (Manifest V3)

## Features

- **Side-panel notes** — open Flynn Notes from the Chrome toolbar and write without leaving the current page.
- **Quick access** — use keyboard shortcuts to open the panel or create a new note.
- **Rich-text editor** — format text with bold, italic, underline, strikethrough, headings, lists, checklists, quotes, links, code, highlights, and text colors.
- **Note organization** — search note titles and content, and organize notes with folders, favorites, pinning, archive, and trash.
- **Save, Back and Next buttons** — a bar above the editor always shows Back (undo), Next (redo) and Save, even when the formatting toolbar is hidden.
- **Choose how saving works** — Settings → Editor → Saving: instantly, a set number of minutes after you start writing, or only when you press Save (`Ctrl + S`). Unsaved text is always kept as a draft and restored if you close the panel.
- **Notebooks** — create notebooks as separate spaces for notes, move notes between them, rename or delete them. With a save folder connected, each notebook becomes a subfolder of Markdown files.
- **Web clipping** — select text on a webpage, right-click, and save the selection to Flynn Notes with its page link.
- **Import and export** — import `.md` and `.txt` files, download individual notes as Markdown, and use the storage settings to export or import a notes backup.
- **Print and PDF** — print a note or save it as a PDF using the browser print dialog, with A4 formatting.
- **Premium look** — gradient accents, frosted-glass panels, soft ambient light and spring animations in every theme. **Anime Night** adds drifting sakura petals, twinkling stars, glowing details and an occasional shooting star.
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
| Save now | `Ctrl + S` |
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
├── premium.css         # Premium visual layer: gradients, glass, anime effects, motion
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

## License

No license file is currently included. Unless a license is added to this repository, all rights remain with the copyright holder.
