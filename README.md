# Zint

A high-performance, keyboard-driven GUI file manager for Linux, combining TUI efficiency with GUI media capabilities.

![Zint File Manager](./docs/screenshot.png)

## Features

- **Miller Columns Layout** - 3-panel view: parent, current, preview
- **Vim-style Navigation** - Yazi-compatible keybindings
- **File Picker Mode** - Use as system file dialog replacement
- **Custom Theming** - User CSS support
- **Configurable** - TOML-based configuration
- **Virtualized Lists** - Handles 10,000+ files smoothly

## Installation

### From Source

```bash
# Prerequisites
# - Rust (1.70+)
# - Node.js (18+)
# - System deps: libwebkit2gtk-4.1-dev libayatana-appindicator3-dev

# Clone and build
git clone https://github.com/youruser/zint.git
cd zint
npm install
npm run tauri build

# Binary at: src-tauri/target/release/zint
```

### Arch Linux (AUR)

```bash
yay -S zint-bin  # or paru -S zint-bin
```

## Usage

```bash
# Run as file manager
zint

# File picker mode (prints path to stdout)
zint --pick-file

# Directory picker mode
zint --pick-dir
```

## Keybindings

### Navigation

| Key | Action |
|-----|--------|
| `j` / `↓` | Move cursor down |
| `k` / `↑` | Move cursor up |
| `h` / `←` | Go to parent directory |
| `l` / `→` / `Enter` | Enter directory / Open file |
| `gg` | Jump to first item |
| `G` | Jump to last item |
| `~` | Go to home directory |

### Selection

| Key | Action |
|-----|--------|
| `Space` | Toggle selection on current item |
| `v` | Start visual mode (multi-select) |
| `V` | Start visual line mode |
| `Ctrl+a` | Select all |
| `Esc` | Clear selection / Exit visual mode |

### File Operations

| Key | Action |
|-----|--------|
| `y` | Yank (copy) selected files |
| `x` | Cut selected files |
| `p` | Paste files |
| `d` | Delete (move to trash) |

### Tabs

| Key | Action |
|-----|--------|
| `t` | Open new tab |
| `w` | Close current tab |
| `1-9` | Switch to tab 1-9 |

### Other

| Key | Action |
|-----|--------|
| `.` | Toggle hidden files |
| `o` | Open with configured editor |

## Configuration

Config file: `~/.config/zint/config.toml`

```toml
# Window settings
[window]
decorations = true    # Show/hide window title bar

[behavior]
show_hidden = false   # Show hidden files by default
sort_directories_first = true
# default_directory = "~/Projects"

[editor]
command = "code"      # Command to open folders with 'o'
```

### Config Options

| Option | Default | Description |
|--------|---------|-------------|
| `window.decorations` | `true` | Show window title bar |
| `behavior.show_hidden` | `false` | Show hidden files |
| `behavior.sort_directories_first` | `true` | Directories appear before files |
| `behavior.default_directory` | `~` | Starting directory |
| `editor.command` | `code` | Editor for opening folders |

## Custom CSS Theming

CSS file: `~/.config/zint/style.css`

### Available CSS Classes

```css
/* Main containers */
.bg-bg-primary { }      /* Main background */
.bg-bg-secondary { }    /* Secondary panels */
.bg-bg-panel { }        /* Panel backgrounds */

/* File items */
.file-item { }          /* All file entries */
.file-item.cursor { }   /* Cursor position */
.file-item.selected { } /* Selected items */
.file-item.directory { }/* Directories */

/* Icons */
.icon-folder { }        /* Folder icons */
.icon-file { }          /* File icons */

/* Panels */
.panel { }              /* All panels */
.panel-parent { }       /* Parent directory panel */
.panel-current { }      /* Current directory panel */
.preview-panel { }      /* Preview panel */

/* Status bar */
.status-bar { }
.status-mode { }        /* Mode indicator */
.status-path { }        /* Current path */
.status-clipboard { }   /* Clipboard state */

/* Tab bar */
.tab-bar { }
.tab-item { }
.tab-item.active { }
```

### Example Theme (Catppuccin)

```css
:root {
  --bg-primary: #1e1e2e;
  --bg-secondary: #181825;
  --bg-hover: #313244;
  --text-primary: #cdd6f4;
  --accent: #cba6f7;
}

.file-item.cursor {
  background-color: #45475a !important;
  border-left-color: #cba6f7 !important;
}
```

### Transparent Background

Zint supports transparent backgrounds for compositors like Hyprland/Sway:

```css
/* ~/.config/zint/style.css */
:root {
  --bg-primary: rgba(30, 30, 46, 0.85);   /* 85% opacity */
  --bg-secondary: rgba(24, 24, 37, 0.9);
  --bg-panel: rgba(30, 30, 46, 0.7);
}

/* Make sure html/body are also transparent */
html, body, #root {
  background: transparent !important;
}
```

### Live Reload

Changes to `style.css` are applied **instantly** without restarting Zint. Just save the file and see your changes live!

## Using as Default File Picker

### XDG Portal (Recommended)

Set environment variable:
```bash
export GTK_USE_PORTAL=1
```

Create `~/.local/share/xdg-desktop-portal/portals/zint.portal`:
```ini
[portal]
DBusName=org.freedesktop.impl.portal.desktop.zint
Interfaces=org.freedesktop.impl.portal.FileChooser
```

### Hyprland Integration

Add to `~/.config/hypr/hyprland.conf`:
```ini
# File picker keybind
bind = SUPER SHIFT, F, exec, zint --pick-file | xargs -I{} notify-send "Selected: {}"

# Use with wl-paste
bind = SUPER SHIFT, O, exec, zint --pick-file | wl-copy
```

### Script Wrapper

```bash
#!/bin/bash
# ~/bin/file-picker
selected=$(zint --pick-file 2>/dev/null)
if [ -n "$selected" ]; then
    echo "$selected"
fi
```

## Development

```bash
# Dev mode with hot reload
npm run tauri dev

# Type check frontend
npm run build

# Build release binary
npm run tauri build
```

## Tech Stack

- **Frontend**: React 18 + TypeScript + Vite
- **Styling**: Tailwind CSS + CSS Variables
- **Virtualization**: @tanstack/react-virtual
- **Backend**: Tauri v2 (Rust)
- **Icons**: Lucide React

## License

MIT
