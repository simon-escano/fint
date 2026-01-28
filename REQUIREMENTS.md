# Project Zint: Requirements & Architecture

## 1. Project Vision
**Zint** is a high-performance, keyboard-driven GUI file manager for Linux (specifically Arch/Hyprland).
* **The Core Concept:** "Yazi, but with CSS." It combines the speed, efficiency, and muscle memory of a TUI (Yazi) with the rich styling, smooth animations, and media capabilities of a GUI.
* **The Goal:** To serve as both a daily driver file manager AND a system-wide file picker dialog that returns paths to standard output.

## 2. Technical Stack
* **Core Framework:** Tauri v2.x (Rust Backend).
* **Frontend:** React (TypeScript) + Vite.
* **Styling:** Tailwind CSS (for layout/utility) + CSS Variables (for user theming).
* **Icons:** Lucide React.
* **Performance:** `@tanstack/react-virtual` (MANDATORY for rendering file lists).
* **State Management:** React Hooks (Keep it simple).

## 3. Core UI Layout: The Miller Columns
The application must use a strict 3-Panel Grid Layout:

1.  **Left Panel (Parent):**
    * Displays the content of the parent directory.
    * **Style:** Dimmed opacity (e.g., 40%), non-interactive.
2.  **Center Panel (Current):**
    * The active workspace.
    * **Style:** Fully opaque, focused.
    * Contains the cursor indicator (highlighted row).
    * Must support virtualized scrolling for directories with 10,000+ files.
3.  **Right Panel (Preview):**
    * Context-aware preview of the currently selected item.
    * **If Image:** Render `<img>` tag (fit to container).
    * **If Video:** Render `<video>` tag (muted, autoplay on hover).
    * **If Code/Text:** Render syntax-highlighted snippet (first 50 lines).
    * **If Folder:** Show a list summary of that folder's contents.

## 4. Input & Navigation (Vim Logic)
The app must implement a global keyboard handler that intercepts keys before they reach the DOM. Zint strictly mimics [Yazi's default keymap](https://yazi-rs.github.io/docs/quick-start/#keybindings).

### Navigation
* `k` / `ArrowUp`: Move cursor up.
* `j` / `ArrowDown`: Move cursor down.
* `h` / `ArrowLeft`: Go to Parent Directory (`cd ..`).
* `l` / `ArrowRight`: Enter Directory (if folder) or Open File (if file).
* `gg`: Jump to top of list.
* `G`: Jump to bottom of list.

### Selection & Operations
* `Space`: Toggle selection of current item.
* `v`: Enter **Visual Mode** (select all items moved over).
* `V`: Visual Line Mode.
* `Esc`: Cancel selection / Exit Visual Mode.
* `Ctrl + a`: Select all.

### File Actions (Clipboard)
* `y`: **Yank** (Copy) selected files.
* `x`: **Cut** selected files.
* `p`: **Paste** copied/cut files into current directory.
* `d`: **Delete** (Move to Trash).

### Tabs
* `t`: Create a new tab.
* `w`: Close current tab.
* `1` - `9`: Switch to specific tab.

## 5. The "Enter" Key Contract
The behavior of the `Enter` key depends strictly on how the application was launched.

### Mode A: Standalone (Default)
* **Command:** `zint`
* **Behavior:**
    * **On File:** Open the file using the system default application (e.g., `xdg-open`).
    * **On Folder:** Open the folder in the User's Default Code Editor (e.g., VS Code). *Note: To navigate INTO a folder, the user presses `l`, not Enter.*

### Mode B: Picker (CLI Integration)
* **Command:** `zint --pick-file` OR `zint --pick-dir`
* **Behavior:**
    * **On File (in `--pick-file` mode):** Print absolute path to `STDOUT` and terminate process immediately.
    * **On Folder (in `--pick-dir` mode):** Print absolute path to `STDOUT` and terminate process immediately.

## 6. Implementation Guidelines for AI
1.  **Rust is for I/O:** Do not do heavy logic in Rust if possible. Use Rust only to `read_dir`, `metadata`, and handle the `stdout` printing. Pass raw data to React.
2.  **Virtualization is Non-Negotiable:** Do NOT render `<ul>` lists mapping over arrays directly. You must use `@tanstack/react-virtual`. The DOM will freeze with large directories if you don't.
3.  **Styling Strategy:**
    * Use Tailwind for structure: `flex`, `grid`, `h-screen`, `overflow-hidden`.
    * Use CSS Variables for colors: `bg-[var(--bg-primary)]` instead of `bg-slate-900`.
4.  **Error Handling:** If a directory cannot be read (permission denied), show a red toast notification but do not crash the app.