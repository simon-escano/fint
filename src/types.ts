// File system types matching Rust backend
export interface FileEntry {
    name: string;
    path: string;
    is_dir: boolean;
    is_symlink: boolean;
    is_hidden: boolean;
    size: number;
    modified: string;
    extension: string | null;
}

export interface DirectoryContents {
    path: string;
    entries: FileEntry[];
    error: string | null;
}

export interface PreviewContent {
    file_type: string;
    content: string | null;
    error: string | null;
}

// Configuration types (matching Rust backend)
export interface WindowConfig {
    decorations: boolean;
    width: number;
    height: number;
}

export interface BehaviorConfig {
    show_hidden: boolean;
    sort_directories_first: boolean;
    default_directory: string | null;
}

export interface EditorConfig {
    command: string;
}

export interface FintConfig {
    window: WindowConfig;
    behavior: BehaviorConfig;
    editor: EditorConfig;
}

// App state types
export type PickerMode = 'none' | 'file' | 'dir';
export type ViewMode = 'normal' | 'visual' | 'visual-line';
export type ClipboardOperation = 'copy' | 'cut';

export interface ClipboardState {
    paths: string[];
    operation: ClipboardOperation;
}

export interface Tab {
    id: string;
    path: string;
    cursorIndex: number;
    scrollOffset: number;
}

export interface AppState {
    currentPath: string;
    parentPath: string | null;
    entries: FileEntry[];
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
    config: FintConfig | null;
}

// Utility functions
export function formatFileSize(bytes: number): string {
    if (bytes === 0) return '-';
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(i > 0 ? 1 : 0)} ${units[i]}`;
}

export function getFileTypeFromExtension(ext: string | null): string {
    if (!ext) return 'file';
    const extension = ext.toLowerCase();

    const types: Record<string, string[]> = {
        image: ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'bmp', 'ico'],
        video: ['mp4', 'webm', 'mkv', 'avi', 'mov'],
        audio: ['mp3', 'wav', 'ogg', 'flac', 'm4a'],
        code: ['rs', 'js', 'ts', 'tsx', 'jsx', 'py', 'go', 'c', 'cpp', 'h', 'hpp',
            'java', 'kt', 'swift', 'rb', 'php', 'sh', 'bash', 'zsh', 'fish',
            'css', 'scss', 'less', 'html', 'xml', 'json', 'yaml', 'yml', 'toml',
            'md', 'markdown', 'sql', 'graphql', 'vue', 'svelte'],
        text: ['txt', 'log', 'conf', 'cfg', 'ini', 'env'],
        archive: ['zip', 'tar', 'gz', 'rar', '7z', 'bz2'],
        pdf: ['pdf'],
    };

    for (const [type, extensions] of Object.entries(types)) {
        if (extensions.includes(extension)) return type;
    }
    return 'file';
}
