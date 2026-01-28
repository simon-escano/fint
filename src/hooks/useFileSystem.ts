import { useState, useCallback, useEffect, useRef } from 'react';
import { FileEntry, PickerMode, ViewMode, ClipboardState, Tab, ZintConfig } from '../types';
import { readDirectory, getParentDirectory, getHomeDirectory, copyFiles, moveFiles, deleteFiles, openFile, printPathAndExit, getConfig, getUserCss } from '../api/tauri';

interface UseFileSystemState {
    currentPath: string;
    parentPath: string | null;
    entries: FileEntry[];
    previewEntries: FileEntry[];
    cursorIndex: number;
    selectedPaths: Set<string>;
    viewMode: ViewMode;
    visualStartIndex: number | null;
    clipboard: ClipboardState | null;
    tabs: Tab[];
    activeTabIndex: number;
    pickerMode: PickerMode;
    error: string | null;
    loading: boolean;
    showHidden: boolean;
    config: ZintConfig | null;
}

export function useFileSystem() {
    const [state, setState] = useState<UseFileSystemState>({
        currentPath: '',
        parentPath: null,
        entries: [],
        previewEntries: [],
        cursorIndex: 0,
        selectedPaths: new Set(),
        viewMode: 'normal',
        visualStartIndex: null,
        clipboard: null,
        tabs: [],
        activeTabIndex: 0,
        pickerMode: 'none',
        error: null,
        loading: true,
        showHidden: false,
        config: null,
    });

    const scrollContainerRef = useRef<HTMLDivElement>(null);

    // Initialize - load config and home directory
    useEffect(() => {
        const init = async () => {
            try {
                // Load config first
                const config = await getConfig();
                const showHidden = config.behavior.show_hidden;

                // Load and inject user CSS
                const userCss = await getUserCss();
                if (userCss) {
                    injectUserCss(userCss);
                }

                // Get starting directory (expand ~ to home)
                const home = await getHomeDirectory();
                let startDir = config.behavior.default_directory || home;
                if (startDir.startsWith('~')) {
                    startDir = startDir.replace('~', home);
                }

                // Update state with config
                setState(s => ({ ...s, config, showHidden }));

                // Navigate to start directory
                await navigateTo(startDir, showHidden);
            } catch (err) {
                setState(s => ({ ...s, error: String(err), loading: false }));
            }
        };
        init();

        // Set up live CSS reload listener
        let unlisten: (() => void) | undefined;

        import('@tauri-apps/api/event').then(({ listen }) => {
            listen<string>('css-reload', (event) => {
                injectUserCss(event.payload);
            }).then((unlistenFn) => {
                unlisten = unlistenFn;
            });
        });

        return () => {
            unlisten?.();
        };
    }, []);

    // Helper to inject/update user CSS
    const injectUserCss = (css: string) => {
        const existingStyle = document.getElementById('user-custom-css');
        if (existingStyle) existingStyle.remove();
        const styleEl = document.createElement('style');
        styleEl.id = 'user-custom-css';
        styleEl.textContent = css;
        document.head.appendChild(styleEl);
    };

    // Load preview when cursor changes
    useEffect(() => {
        const loadPreview = async () => {
            const entry = state.entries[state.cursorIndex];
            if (entry?.is_dir) {
                try {
                    const contents = await readDirectory(entry.path, state.showHidden);
                    setState(s => ({ ...s, previewEntries: contents.entries.slice(0, 50) }));
                } catch {
                    setState(s => ({ ...s, previewEntries: [] }));
                }
            } else {
                setState(s => ({ ...s, previewEntries: [] }));
            }
        };

        if (state.entries.length > 0) {
            loadPreview();
        }
    }, [state.cursorIndex, state.entries]);

    // Navigate to a directory
    const navigateTo = useCallback(async (path: string, showHidden?: boolean) => {
        setState(s => ({ ...s, loading: true, error: null }));
        const useHidden = showHidden ?? state.showHidden;

        try {
            const [contents, parent] = await Promise.all([
                readDirectory(path, useHidden),
                getParentDirectory(path),
            ]);

            if (contents.error) {
                setState(s => ({ ...s, error: contents.error, loading: false }));
                return;
            }

            // Load parent directory contents (for later use in parent panel)
            if (parent) {
                await readDirectory(parent);
            }

            setState(s => ({
                ...s,
                currentPath: path,
                parentPath: parent,
                entries: contents.entries,
                cursorIndex: 0,
                selectedPaths: new Set(),
                viewMode: 'normal',
                visualStartIndex: null,
                loading: false,
                error: null,
            }));
        } catch (err) {
            setState(s => ({ ...s, error: String(err), loading: false }));
        }
    }, []);

    // Navigate to parent directory
    const goToParent = useCallback(async () => {
        if (state.parentPath) {
            await navigateTo(state.parentPath);
        }
    }, [state.parentPath, navigateTo]);

    // Enter directory or open file
    const enterSelected = useCallback(async () => {
        const entry = state.entries[state.cursorIndex];
        if (!entry) return;

        if (entry.is_dir) {
            await navigateTo(entry.path);
        } else {
            // In picker mode, print and exit
            if (state.pickerMode === 'file') {
                await printPathAndExit(entry.path);
            } else {
                // Standalone mode - open with system default
                try {
                    await openFile(entry.path);
                } catch (err) {
                    setState(s => ({ ...s, error: String(err) }));
                }
            }
        }
    }, [state.entries, state.cursorIndex, state.pickerMode, navigateTo]);

    // Handle Enter key - behavior depends on picker mode
    const handleEnter = useCallback(async () => {
        const entry = state.entries[state.cursorIndex];
        if (!entry) return;

        if (state.pickerMode === 'file' && !entry.is_dir) {
            await printPathAndExit(entry.path);
        } else if (state.pickerMode === 'dir' && entry.is_dir) {
            await printPathAndExit(entry.path);
        } else if (state.pickerMode === 'none') {
            // Standalone mode: open file or folder with system app
            try {
                await openFile(entry.path);
            } catch (err) {
                setState(s => ({ ...s, error: String(err) }));
            }
        }
    }, [state.entries, state.cursorIndex, state.pickerMode]);

    // Cursor movement
    const moveCursor = useCallback((delta: number) => {
        setState(s => {
            const newIndex = Math.max(0, Math.min(s.entries.length - 1, s.cursorIndex + delta));

            // Handle visual mode selection
            if (s.viewMode === 'visual' || s.viewMode === 'visual-line') {
                const startIdx = s.visualStartIndex ?? s.cursorIndex;
                const newSelection = new Set<string>();
                const start = Math.min(startIdx, newIndex);
                const end = Math.max(startIdx, newIndex);

                for (let i = start; i <= end; i++) {
                    if (s.entries[i]) {
                        newSelection.add(s.entries[i].path);
                    }
                }

                return { ...s, cursorIndex: newIndex, selectedPaths: newSelection };
            }

            return { ...s, cursorIndex: newIndex };
        });
    }, []);

    // Jump to top/bottom
    const jumpToTop = useCallback(() => {
        setState(s => ({ ...s, cursorIndex: 0 }));
    }, []);

    const jumpToBottom = useCallback(() => {
        setState(s => ({ ...s, cursorIndex: Math.max(0, s.entries.length - 1) }));
    }, []);

    // Toggle selection
    const toggleSelection = useCallback(() => {
        setState(s => {
            const entry = s.entries[s.cursorIndex];
            if (!entry) return s;

            const newSelection = new Set(s.selectedPaths);
            if (newSelection.has(entry.path)) {
                newSelection.delete(entry.path);
            } else {
                newSelection.add(entry.path);
            }

            // Move cursor down after toggling
            const newIndex = Math.min(s.entries.length - 1, s.cursorIndex + 1);
            return { ...s, selectedPaths: newSelection, cursorIndex: newIndex };
        });
    }, []);

    // Enter visual mode
    const enterVisualMode = useCallback((lineMode: boolean = false) => {
        setState(s => ({
            ...s,
            viewMode: lineMode ? 'visual-line' : 'visual',
            visualStartIndex: s.cursorIndex,
            selectedPaths: new Set([s.entries[s.cursorIndex]?.path].filter(Boolean) as string[]),
        }));
    }, []);

    // Exit visual mode / cancel selection
    const cancelSelection = useCallback(() => {
        setState(s => ({
            ...s,
            viewMode: 'normal',
            visualStartIndex: null,
            selectedPaths: new Set(),
        }));
    }, []);

    // Select all
    const selectAll = useCallback(() => {
        setState(s => ({
            ...s,
            selectedPaths: new Set(s.entries.map(e => e.path)),
        }));
    }, []);

    // Yank (copy)
    const yank = useCallback(() => {
        setState(s => {
            const paths = s.selectedPaths.size > 0
                ? Array.from(s.selectedPaths)
                : s.entries[s.cursorIndex] ? [s.entries[s.cursorIndex].path] : [];

            if (paths.length === 0) return s;

            return {
                ...s,
                clipboard: { paths, operation: 'copy' },
                viewMode: 'normal',
                visualStartIndex: null,
                selectedPaths: new Set(),
            };
        });
    }, []);

    // Cut
    const cut = useCallback(() => {
        setState(s => {
            const paths = s.selectedPaths.size > 0
                ? Array.from(s.selectedPaths)
                : s.entries[s.cursorIndex] ? [s.entries[s.cursorIndex].path] : [];

            if (paths.length === 0) return s;

            return {
                ...s,
                clipboard: { paths, operation: 'cut' },
                viewMode: 'normal',
                visualStartIndex: null,
                selectedPaths: new Set(),
            };
        });
    }, []);

    // Paste
    const paste = useCallback(async () => {
        if (!state.clipboard || state.clipboard.paths.length === 0) return;

        try {
            if (state.clipboard.operation === 'copy') {
                await copyFiles(state.clipboard.paths, state.currentPath);
            } else {
                await moveFiles(state.clipboard.paths, state.currentPath);
            }

            // Refresh directory
            await navigateTo(state.currentPath);

            // Clear clipboard after cut
            if (state.clipboard.operation === 'cut') {
                setState(s => ({ ...s, clipboard: null }));
            }
        } catch (err) {
            setState(s => ({ ...s, error: String(err) }));
        }
    }, [state.clipboard, state.currentPath, navigateTo]);

    // Delete (trash)
    const deletePaths = useCallback(async () => {
        const paths = state.selectedPaths.size > 0
            ? Array.from(state.selectedPaths)
            : state.entries[state.cursorIndex] ? [state.entries[state.cursorIndex].path] : [];

        if (paths.length === 0) return;

        try {
            await deleteFiles(paths);
            await navigateTo(state.currentPath);
        } catch (err) {
            setState(s => ({ ...s, error: String(err) }));
        }
    }, [state.selectedPaths, state.entries, state.cursorIndex, state.currentPath, navigateTo]);

    // Tab management
    const createTab = useCallback(() => {
        setState(s => {
            const newTab: Tab = {
                id: crypto.randomUUID(),
                path: s.currentPath,
                cursorIndex: 0,
                scrollOffset: 0,
            };
            return {
                ...s,
                tabs: [...s.tabs, newTab],
                activeTabIndex: s.tabs.length,
            };
        });
    }, []);

    const closeTab = useCallback(() => {
        setState(s => {
            if (s.tabs.length <= 1) return s;

            const newTabs = s.tabs.filter((_, i) => i !== s.activeTabIndex);
            const newIndex = Math.min(s.activeTabIndex, newTabs.length - 1);

            return {
                ...s,
                tabs: newTabs,
                activeTabIndex: newIndex,
            };
        });
    }, []);

    const switchTab = useCallback((index: number) => {
        setState(s => {
            if (index < 0 || index >= s.tabs.length) return s;
            return { ...s, activeTabIndex: index };
        });
    }, []);

    // Toggle hidden files
    const toggleHidden = useCallback(async () => {
        const newShowHidden = !state.showHidden;
        setState(s => ({ ...s, showHidden: newShowHidden, loading: true }));

        try {
            const contents = await readDirectory(state.currentPath, newShowHidden);
            setState(s => ({
                ...s,
                entries: contents.entries,
                cursorIndex: Math.min(s.cursorIndex, contents.entries.length - 1),
                loading: false
            }));
        } catch (err) {
            setState(s => ({ ...s, error: String(err), loading: false }));
        }
    }, [state.showHidden, state.currentPath]);

    // Go to home directory
    const goHome = useCallback(async () => {
        const home = await getHomeDirectory();
        await navigateTo(home, state.showHidden);
    }, [navigateTo, state.showHidden]);

    // Clear error
    const clearError = useCallback(() => {
        setState(s => ({ ...s, error: null }));
    }, []);

    // Get current entry
    const currentEntry = state.entries[state.cursorIndex] || null;

    return {
        ...state,
        currentEntry,
        scrollContainerRef,
        navigateTo,
        goToParent,
        enterSelected,
        handleEnter,
        moveCursor,
        jumpToTop,
        jumpToBottom,
        toggleSelection,
        enterVisualMode,
        cancelSelection,
        selectAll,
        yank,
        cut,
        paste,
        deletePaths,
        createTab,
        closeTab,
        switchTab,
        toggleHidden,
        goHome,
        clearError,
    };
}
