import { useRef, useEffect } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { FileEntry } from '../types';
import { FileItem } from './FileItem';

interface FileListProps {
    entries: FileEntry[];
    cursorIndex: number;
    selectedPaths: Set<string>;
    dimmed?: boolean;
    className?: string;
}

export function FileList({
    entries,
    cursorIndex,
    selectedPaths,
    dimmed = false,
    className = ''
}: FileListProps) {
    const parentRef = useRef<HTMLDivElement>(null);

    const virtualizer = useVirtualizer({
        count: entries.length,
        getScrollElement: () => parentRef.current,
        estimateSize: () => 32,
        overscan: 10,
    });

    // Scroll to cursor when it changes
    useEffect(() => {
        if (cursorIndex >= 0 && cursorIndex < entries.length) {
            virtualizer.scrollToIndex(cursorIndex, { align: 'auto' });
        }
    }, [cursorIndex, entries.length, virtualizer]);

    const items = virtualizer.getVirtualItems();

    return (
        <div
            ref={parentRef}
            className={`h-full overflow-auto ${dimmed ? 'panel-parent' : ''} ${className}`}
        >
            <div
                style={{
                    height: `${virtualizer.getTotalSize()}px`,
                    width: '100%',
                    position: 'relative',
                }}
            >
                {items.map((virtualRow) => {
                    const entry = entries[virtualRow.index];
                    const isCursor = virtualRow.index === cursorIndex;
                    const isSelected = selectedPaths.has(entry.path);

                    return (
                        <div
                            key={virtualRow.key}
                            style={{
                                position: 'absolute',
                                top: 0,
                                left: 0,
                                width: '100%',
                                height: `${virtualRow.size}px`,
                                transform: `translateY(${virtualRow.start}px)`,
                            }}
                        >
                            <FileItem
                                entry={entry}
                                isCursor={isCursor && !dimmed}
                                isSelected={isSelected}
                            />
                        </div>
                    );
                })}
            </div>

            {entries.length === 0 && (
                <div className="flex items-center justify-center h-full text-text-muted text-sm">
                    Empty directory
                </div>
            )}
        </div>
    );
}
