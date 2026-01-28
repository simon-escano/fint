import { invoke } from '@tauri-apps/api/core';
import { DirectoryContents, PreviewContent, FintConfig } from '../types';

// ============================================================================
// Configuration
// ============================================================================

export async function getConfig(): Promise<FintConfig> {
    return invoke<FintConfig>('get_config');
}

export async function getUserCss(): Promise<string | null> {
    return invoke<string | null>('get_user_css');
}

export async function getConfigPath(): Promise<string | null> {
    return invoke<string | null>('get_config_path');
}

// ============================================================================
// File System
// ============================================================================

// Read directory contents
export async function readDirectory(path: string, showHidden: boolean = false): Promise<DirectoryContents> {
    return invoke<DirectoryContents>('read_directory', { path, showHidden });
}

// Get file preview
export async function getFilePreview(path: string): Promise<PreviewContent> {
    return invoke<PreviewContent>('get_file_preview', { path });
}

// Copy files to destination
export async function copyFiles(sources: string[], destination: string): Promise<void> {
    return invoke('copy_files', { sources, destination });
}

// Move files to destination (cut + paste)
export async function moveFiles(sources: string[], destination: string): Promise<void> {
    return invoke('move_files', { sources, destination });
}

// Delete files (move to trash)
export async function deleteFiles(paths: string[]): Promise<void> {
    return invoke('delete_files', { paths });
}

// Open file with system default application
export async function openFile(path: string): Promise<void> {
    return invoke('open_file', { path });
}

// Open with configured editor
export async function openWithEditor(path: string): Promise<void> {
    return invoke('open_with_editor', { path });
}

// Get home directory
export async function getHomeDirectory(): Promise<string> {
    return invoke<string>('get_home_directory');
}

// Get parent directory
export async function getParentDirectory(path: string): Promise<string | null> {
    return invoke<string | null>('get_parent_directory', { path });
}

// Print path and exit (picker mode)
export async function printPathAndExit(path: string): Promise<void> {
    return invoke('print_path_and_exit', { path });
}

// Convert local file path to asset URL for Tauri
export function convertFileSrc(path: string): string {
    // In Tauri v2, we use the asset protocol
    return `asset://localhost/${encodeURIComponent(path)}`;
}

