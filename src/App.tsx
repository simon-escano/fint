import { useMemo, useEffect, useState } from 'react';
import { FileList } from './components/FileList';
import { Preview } from './components/Preview';
import { Toast } from './components/Toast';
import { TabBar } from './components/TabBar';
import { StatusBar } from './components/StatusBar';
import { useFileSystem } from './hooks/useFileSystem';
import { useKeyboardNavigation } from './hooks/useKeyboardNavigation';
import { readDirectory } from './api/tauri';
import { FileEntry } from './types';
import { Loader2 } from 'lucide-react';

function App() {
    const fs = useFileSystem();
    const [parentEntries, setParentEntries] = useState<FileEntry[]>([]);

    // Load parent directory entries for left panel
    useEffect(() => {
        const loadParent = async () => {
            if (fs.parentPath) {
                try {
                    const contents = await readDirectory(fs.parentPath, fs.showHidden);
                    setParentEntries(contents.entries);
                } catch {
                    setParentEntries([]);
                }
            } else {
                setParentEntries([]);
            }
        };
        loadParent();
    }, [fs.parentPath, fs.showHidden]);

    // Find cursor index in parent panel (current directory in parent list)
    const parentCursorIndex = useMemo(() => {
        const currentDirName = fs.currentPath.split('/').filter(Boolean).pop();
        return parentEntries.findIndex(e => e.name === currentDirName);
    }, [parentEntries, fs.currentPath]);

    // Set up keyboard navigation
    useKeyboardNavigation({
        moveCursor: fs.moveCursor,
        goToParent: fs.goToParent,
        enterSelected: fs.enterSelected,
        handleEnter: fs.handleEnter,
        jumpToTop: fs.jumpToTop,
        jumpToBottom: fs.jumpToBottom,
        toggleSelection: fs.toggleSelection,
        enterVisualMode: fs.enterVisualMode,
        cancelSelection: fs.cancelSelection,
        selectAll: fs.selectAll,
        yank: fs.yank,
        cut: fs.cut,
        paste: fs.paste,
        deletePaths: fs.deletePaths,
        createTab: fs.createTab,
        closeTab: fs.closeTab,
        switchTab: fs.switchTab,
        toggleHidden: fs.toggleHidden,
        goHome: fs.goHome,
    });

    if (fs.loading && fs.entries.length === 0) {
        return (
            <div className="h-screen flex items-center justify-center bg-bg-primary">
                <Loader2 className="w-8 h-8 animate-spin text-accent" />
            </div>
        );
    }

    return (
        <div className="h-screen flex flex-col bg-bg-primary overflow-hidden">
            {/* Tab Bar */}
            <TabBar
                tabs={fs.tabs}
                activeIndex={fs.activeTabIndex}
                onSwitchTab={fs.switchTab}
            />

            {/* Main 3-Panel Layout */}
            <div className="flex-1 grid grid-cols-[1fr_1.5fr_1.5fr] min-h-0">
                {/* Left Panel - Parent Directory */}
                <div className="panel overflow-hidden">
                    <FileList
                        entries={parentEntries}
                        cursorIndex={parentCursorIndex}
                        selectedPaths={new Set()}
                        dimmed
                    />
                </div>

                {/* Center Panel - Current Directory */}
                <div className="panel overflow-hidden">
                    <FileList
                        entries={fs.entries}
                        cursorIndex={fs.cursorIndex}
                        selectedPaths={fs.selectedPaths}
                    />
                </div>

                {/* Right Panel - Preview */}
                <div className="bg-bg-panel overflow-hidden">
                    <Preview entry={fs.currentEntry} />
                </div>
            </div>

            {/* Status Bar */}
            <StatusBar
                path={fs.currentPath}
                entryCount={fs.entries.length}
                selectedCount={fs.selectedPaths.size}
                viewMode={fs.viewMode}
                clipboard={fs.clipboard}
                pickerMode={fs.pickerMode}
            />

            {/* Error Toast */}
            {fs.error && (
                <Toast
                    message={fs.error}
                    type="error"
                    onClose={fs.clearError}
                />
            )}
        </div>
    );
}

export default App;
