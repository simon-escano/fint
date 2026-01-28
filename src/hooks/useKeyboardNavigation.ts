import { useEffect, useRef, useCallback } from 'react';

interface KeyboardActions {
    moveCursor: (delta: number) => void;
    goToParent: () => void;
    enterSelected: () => void;
    handleEnter: () => void;
    jumpToTop: () => void;
    jumpToBottom: () => void;
    toggleSelection: () => void;
    enterVisualMode: (lineMode?: boolean) => void;
    cancelSelection: () => void;
    selectAll: () => void;
    yank: () => void;
    cut: () => void;
    paste: () => void;
    deletePaths: () => void;
    createTab: () => void;
    closeTab: () => void;
    switchTab: (index: number) => void;
    toggleHidden: () => void;
    goHome: () => void;
}

export function useKeyboardNavigation(actions: KeyboardActions) {
    const keySequenceRef = useRef<string>('');
    const keyTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const handleKeyDown = useCallback((e: KeyboardEvent) => {
        // Don't handle if typing in an input
        if ((e.target as HTMLElement).tagName === 'INPUT' ||
            (e.target as HTMLElement).tagName === 'TEXTAREA') {
            return;
        }

        // Clear key sequence timeout
        if (keyTimeoutRef.current) {
            clearTimeout(keyTimeoutRef.current);
        }

        // Handle Ctrl combinations
        if (e.ctrlKey) {
            switch (e.key.toLowerCase()) {
                case 'a':
                    e.preventDefault();
                    actions.selectAll();
                    return;
            }
        }

        // Handle key sequences like 'gg'
        const key = e.key;
        const sequence = keySequenceRef.current + key;

        // Check for 'gg' sequence
        if (sequence === 'gg') {
            e.preventDefault();
            actions.jumpToTop();
            keySequenceRef.current = '';
            return;
        }

        // If we have 'g', wait for next key
        if (key === 'g') {
            keySequenceRef.current = 'g';
            keyTimeoutRef.current = setTimeout(() => {
                keySequenceRef.current = '';
            }, 500);
            return;
        }

        // Reset sequence for single keys
        keySequenceRef.current = '';

        // Single key handlers
        switch (key) {
            case 'j':
            case 'ArrowDown':
                e.preventDefault();
                actions.moveCursor(1);
                break;

            case 'k':
            case 'ArrowUp':
                e.preventDefault();
                actions.moveCursor(-1);
                break;

            case 'h':
            case 'ArrowLeft':
                e.preventDefault();
                actions.goToParent();
                break;

            case 'l':
            case 'ArrowRight':
                e.preventDefault();
                actions.enterSelected();
                break;

            case 'Enter':
                e.preventDefault();
                actions.handleEnter();
                break;

            case 'G':
                e.preventDefault();
                actions.jumpToBottom();
                break;

            case ' ':
                e.preventDefault();
                actions.toggleSelection();
                break;

            case 'v':
                e.preventDefault();
                actions.enterVisualMode(false);
                break;

            case 'V':
                e.preventDefault();
                actions.enterVisualMode(true);
                break;

            case 'Escape':
                e.preventDefault();
                actions.cancelSelection();
                break;

            case 'y':
                e.preventDefault();
                actions.yank();
                break;

            case 'x':
                e.preventDefault();
                actions.cut();
                break;

            case 'p':
                e.preventDefault();
                actions.paste();
                break;

            case 'd':
                e.preventDefault();
                actions.deletePaths();
                break;

            case 't':
                e.preventDefault();
                actions.createTab();
                break;

            case 'w':
                e.preventDefault();
                actions.closeTab();
                break;

            case '1':
            case '2':
            case '3':
            case '4':
            case '5':
            case '6':
            case '7':
            case '8':
            case '9':
                e.preventDefault();
                actions.switchTab(parseInt(key) - 1);
                break;

            case '.':
                e.preventDefault();
                actions.toggleHidden();
                break;

            case '~':
                e.preventDefault();
                actions.goHome();
                break;
        }
    }, [actions]);

    useEffect(() => {
        window.addEventListener('keydown', handleKeyDown);
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            if (keyTimeoutRef.current) {
                clearTimeout(keyTimeoutRef.current);
            }
        };
    }, [handleKeyDown]);
}
