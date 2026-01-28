import { ViewMode, ClipboardState } from '../types';
import { Clipboard, Scissors, Eye } from 'lucide-react';

interface StatusBarProps {
    path: string;
    entryCount: number;
    selectedCount: number;
    viewMode: ViewMode;
    clipboard: ClipboardState | null;
    pickerMode: 'none' | 'file' | 'dir';
}

export function StatusBar({
    path,
    entryCount,
    selectedCount,
    viewMode,
    clipboard,
    pickerMode
}: StatusBarProps) {
    return (
        <div className="status-bar">
            <div className="flex items-center gap-4">
                {/* Mode indicator */}
                {pickerMode !== 'none' && (
                    <span className="mode-indicator mode-picker">
                        Picker: {pickerMode}
                    </span>
                )}

                {viewMode !== 'normal' && (
                    <span className="mode-indicator mode-visual">
                        <Eye className="w-3 h-3 inline mr-1" />
                        {viewMode}
                    </span>
                )}

                {/* Clipboard indicator */}
                {clipboard && clipboard.paths.length > 0 && (
                    <span className="flex items-center gap-1 text-accent">
                        {clipboard.operation === 'copy' ? (
                            <Clipboard className="w-3 h-3" />
                        ) : (
                            <Scissors className="w-3 h-3" />
                        )}
                        <span>{clipboard.paths.length} {clipboard.operation === 'copy' ? 'copied' : 'cut'}</span>
                    </span>
                )}
            </div>

            <div className="flex items-center gap-4">
                {selectedCount > 0 && (
                    <span className="text-accent">{selectedCount} selected</span>
                )}

                <span>{entryCount} items</span>

                <span className="text-text-secondary truncate max-w-md" title={path}>
                    {path}
                </span>
            </div>
        </div>
    );
}
