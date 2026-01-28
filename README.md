# Fint

A high-performance, keyboard-driven GUI file manager for Linux, combining TUI efficiency with GUI media capabilities.

![Fint File Manager](./docs/screenshot.png)

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
git clone https://github.com/youruser/fint.git
cd fint
npm install
npm run tauri build

# Binary at: src-tauri/target/release/fint
```

### Arch Linux (AUR)

```bash
yay -S fint-bin  # or paru -S fint-bin
```

## Usage

```bash
# Run as file manager
fint

# File picker mode (prints path to stdout)
fint --pick-file

# Directory picker mode
fint --pick-dir
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

Config file: `~/.config/fint/config.toml`

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

CSS file: `~/.config/fint/style.css`

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

Fint supports transparent backgrounds for compositors like Hyprland/Sway:

```css
/* ~/.config/fint/style.css */
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

Changes to `style.css` are applied **instantly** without restarting Fint. Just save the file and see your changes live!

## Using as Default File Picker

### XDG Portal (Recommended)

Set environment variable:
```bash
export GTK_USE_PORTAL=1
```

Create `~/.local/share/xdg-desktop-portal/portals/fint.portal`:
```ini
[portal]
DBusName=org.freedesktop.impl.portal.desktop.fint
Interfaces=org.freedesktop.impl.portal.FileChooser
```

### Hyprland Integration

Add to `~/.config/hypr/hyprland.conf`:
```ini
# File picker keybind
bind = SUPER SHIFT, F, exec, fint --pick-file | xargs -I{} notify-send "Selected: {}"

# Use with wl-paste
bind = SUPER SHIFT, O, exec, fint --pick-file | wl-copy
```

### Script Wrapper

```bash
#!/bin/bash
# ~/bin/file-picker
selected=$(fint --pick-file 2>/dev/null)
if [ -n "$selected" ]; then
    echo "$selected"
fi
```

## Development Workflow

### For You (The Developer)

Since you are developing Fint, use the local development build for your daily driver to test changes immediately:

```bash
# 1. Run dev server (hot reload)
npm run tauri dev

# 2. Build release binary for personal use
npm run tauri build
# Binary location: src-tauri/target/release/fint
```

To update your system-wide installation effectively during dev:
```bash
# Link the dev binary (optional)
sudo ln -sf $(pwd)/src-tauri/target/release/fint /usr/local/bin/fint
```

### Releasing Updates

1. **Tag a version**:
   ```bash
   git tag v0.1.0
   git push origin v0.1.0
   ```
2. **Wait for CI**: GitHub Actions will build `fint_0.1.0_amd64.deb` and AppImage.
3. **AUR Update**: Update the `PKGBUILD` version and checksums, then push to AUR.

## AUR Packaging (fint-bin)

To make `yay -S fint-bin` work, you must submit the package to the AUR:

1. Create an AUR account at [aur.archlinux.org](https://aur.archlinux.org).
2. Create the package repo:
   ```bash
   git clone ssh://aur@aur.archlinux.org/fint-bin.git
   cd fint-bin
   ```
3. Copy the `PKGBUILD` from this repo to the AUR repo.
4. Update checksums:
   ```bash
   updpkgsums
   makepkg --printsrcinfo > .SRCINFO
   ```
5. Test build:
   ```bash
   makepkg -si
   ```
6. Push to AUR:
   ```bash
   git add PKGBUILD .SRCINFO
   git commit -m "Initial release v0.1.0"
   git push
   ```

## License

MIT
