#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::env;
use std::sync::mpsc::channel;
use std::time::Duration;
use std::thread;
use chrono::{DateTime, Local};
use serde::{Deserialize, Serialize};
use std::fs::{self, Metadata};
use std::path::{Path, PathBuf};
use std::io::Read;
use tauri::{AppHandle, Manager, Emitter};
use notify::{Watcher, RecursiveMode, Config, RecommendedWatcher};

// ============================================================================
// Configuration Types
// ============================================================================

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct WindowConfig {
    #[serde(default = "default_true")]
    pub decorations: bool,
    #[serde(default = "default_1200")]
    pub width: u32,
    #[serde(default = "default_800")]
    pub height: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct BehaviorConfig {
    #[serde(default)]
    pub show_hidden: bool,
    #[serde(default = "default_true")]
    pub sort_directories_first: bool,
    #[serde(default)]
    pub default_directory: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct EditorConfig {
    #[serde(default = "default_editor")]
    pub command: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct ZintConfig {
    #[serde(default)]
    pub window: WindowConfig,
    #[serde(default)]
    pub behavior: BehaviorConfig,
    #[serde(default)]
    pub editor: EditorConfig,
}

fn default_true() -> bool { true }
fn default_1200() -> u32 { 1200 }
fn default_800() -> u32 { 800 }
fn default_editor() -> String { "code".to_string() }

fn get_config_dir() -> Option<PathBuf> {
    dirs::config_dir().map(|p| p.join("zint"))
}

fn ensure_config_dir() -> Option<PathBuf> {
    let config_dir = get_config_dir()?;
    if !config_dir.exists() {
        fs::create_dir_all(&config_dir).ok()?;
    }
    Some(config_dir)
}

fn load_config_internal() -> ZintConfig {
    let config_path = match get_config_dir() {
        Some(dir) => dir.join("config.toml"),
        None => return ZintConfig::default(),
    };

    if !config_path.exists() {
        // Create default config file
        if let Some(dir) = ensure_config_dir() {
            let default_config = r#"# Zint Configuration
# See https://github.com/youruser/zint for documentation

[window]
decorations = true    # Show window title bar
# width = 1200
# height = 800

[behavior]
show_hidden = false
sort_directories_first = true
# default_directory = "~"

[editor]
command = "code"      # Command to open folders
"#;
            let _ = fs::write(dir.join("config.toml"), default_config);
        }
        return ZintConfig::default();
    }

    match fs::read_to_string(&config_path) {
        Ok(content) => toml::from_str(&content).unwrap_or_default(),
        Err(_) => ZintConfig::default(),
    }
}

// ============================================================================
// File Entry Types
// ============================================================================

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FileEntry {
    pub name: String,
    pub path: String,
    pub is_dir: bool,
    pub is_symlink: bool,
    pub is_hidden: bool,
    pub size: u64,
    pub modified: String,
    pub extension: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DirectoryContents {
    pub path: String,
    pub entries: Vec<FileEntry>,
    pub error: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PreviewContent {
    pub file_type: String,
    pub content: Option<String>,
    pub error: Option<String>,
}

fn format_modified(metadata: &Metadata) -> String {
    metadata
        .modified()
        .ok()
        .and_then(|time| {
            let datetime: DateTime<Local> = time.into();
            Some(datetime.format("%Y-%m-%d %H:%M").to_string())
        })
        .unwrap_or_else(|| "-".to_string())
}

fn get_extension(path: &Path) -> Option<String> {
    path.extension()
        .and_then(|ext| ext.to_str())
        .map(|s| s.to_lowercase())
}

// ============================================================================
// Tauri Commands - Configuration
// ============================================================================

#[tauri::command]
fn get_config() -> ZintConfig {
    load_config_internal()
}

#[tauri::command]
fn get_user_css() -> Option<String> {
    let css_path = get_config_dir()?.join("style.css");
    if css_path.exists() {
        fs::read_to_string(css_path).ok()
    } else {
        // Create example CSS file
        if let Some(dir) = ensure_config_dir() {
            let example_css = r#"/* Zint Custom Styles
 * This file is loaded on startup.
 * See documentation for available CSS classes.
 *
 * Examples:
 *
 * Change background color:
 * .bg-bg-primary { background-color: #1a1a2e !important; }
 *
 * Change accent color:
 * .file-item.cursor { background-color: #e94560 !important; }
 *
 * Customize scrollbar:
 * ::-webkit-scrollbar-thumb { background: #e94560; }
 */
"#;
            let _ = fs::write(dir.join("style.css"), example_css);
        }
        None
    }
}

#[tauri::command]
fn get_config_path() -> Option<String> {
    get_config_dir().map(|p| p.to_string_lossy().to_string())
}

// CSS file watcher - emits events when style.css changes
fn start_css_watcher(app_handle: AppHandle) {
    let css_path = match get_config_dir() {
        Some(dir) => dir.join("style.css"),
        None => return,
    };
    
    // Ensure the file exists
    if !css_path.exists() {
        return;
    }
    
    let (tx, rx) = channel();
    
    let mut watcher = match RecommendedWatcher::new(
        move |res| {
            if let Ok(event) = res {
                let _ = tx.send(event);
            }
        },
        Config::default().with_poll_interval(Duration::from_millis(500)),
    ) {
        Ok(w) => w,
        Err(_) => return,
    };
    
    // Watch the CSS file
    if watcher.watch(&css_path, RecursiveMode::NonRecursive).is_err() {
        return;
    }
    
    // Listen for changes and emit events
    loop {
        match rx.recv_timeout(Duration::from_secs(1)) {
            Ok(_) => {
                // Small debounce - wait a bit for write to complete
                thread::sleep(Duration::from_millis(100));
                
                // Read new CSS content
                if let Ok(css) = fs::read_to_string(&css_path) {
                    let _ = app_handle.emit("css-reload", css);
                }
            }
            Err(std::sync::mpsc::RecvTimeoutError::Timeout) => {
                // Continue waiting
            }
            Err(std::sync::mpsc::RecvTimeoutError::Disconnected) => {
                break;
            }
        }
    }
}

// ============================================================================
// Tauri Commands - File System
// ============================================================================

#[tauri::command]
fn read_directory(path: String, show_hidden: bool) -> DirectoryContents {
    let dir_path = Path::new(&path);
    
    if !dir_path.exists() {
        return DirectoryContents {
            path: path.clone(),
            entries: vec![],
            error: Some("Directory does not exist".to_string()),
        };
    }

    match fs::read_dir(dir_path) {
        Ok(entries) => {
            let mut files: Vec<FileEntry> = entries
                .filter_map(|entry| {
                    let entry = entry.ok()?;
                    let metadata = entry.metadata().ok()?;
                    let path_buf = entry.path();
                    let name = entry.file_name().to_string_lossy().to_string();
                    let is_hidden = name.starts_with('.');
                    
                    // Filter hidden files if not showing them
                    if is_hidden && !show_hidden {
                        return None;
                    }
                    
                    Some(FileEntry {
                        name,
                        path: path_buf.to_string_lossy().to_string(),
                        is_dir: metadata.is_dir(),
                        is_symlink: metadata.file_type().is_symlink(),
                        is_hidden,
                        size: metadata.len(),
                        modified: format_modified(&metadata),
                        extension: get_extension(&path_buf),
                    })
                })
                .collect();

            // Sort: directories first, then by name
            files.sort_by(|a, b| {
                match (a.is_dir, b.is_dir) {
                    (true, false) => std::cmp::Ordering::Less,
                    (false, true) => std::cmp::Ordering::Greater,
                    _ => a.name.to_lowercase().cmp(&b.name.to_lowercase()),
                }
            });

            DirectoryContents {
                path,
                entries: files,
                error: None,
            }
        }
        Err(e) => DirectoryContents {
            path,
            entries: vec![],
            error: Some(format!("Permission denied: {}", e)),
        },
    }
}

#[tauri::command]
fn get_file_preview(path: String) -> PreviewContent {
    let file_path = Path::new(&path);

    if !file_path.exists() {
        return PreviewContent {
            file_type: "unknown".to_string(),
            content: None,
            error: Some("File does not exist".to_string()),
        };
    }

    if file_path.is_dir() {
        match fs::read_dir(file_path) {
            Ok(entries) => {
                let items: Vec<String> = entries
                    .take(20)
                    .filter_map(|e| e.ok())
                    .map(|e| {
                        let meta = e.metadata().ok();
                        let prefix = if meta.map(|m| m.is_dir()).unwrap_or(false) {
                            "📁 "
                        } else {
                            "📄 "
                        };
                        format!("{}{}", prefix, e.file_name().to_string_lossy())
                    })
                    .collect();
                
                PreviewContent {
                    file_type: "directory".to_string(),
                    content: Some(items.join("\n")),
                    error: None,
                }
            }
            Err(e) => PreviewContent {
                file_type: "directory".to_string(),
                content: None,
                error: Some(format!("Cannot read directory: {}", e)),
            },
        }
    } else {
        let extension = get_extension(file_path).unwrap_or_default();
        
        let file_type = match extension.as_str() {
            "png" | "jpg" | "jpeg" | "gif" | "webp" | "svg" | "bmp" | "ico" => "image",
            "mp4" | "webm" | "mkv" | "avi" | "mov" => "video",
            "mp3" | "wav" | "ogg" | "flac" | "m4a" => "audio",
            "pdf" => "pdf",
            "rs" | "js" | "ts" | "tsx" | "jsx" | "py" | "go" | "c" | "cpp" | "h" | "hpp" 
            | "java" | "kt" | "swift" | "rb" | "php" | "sh" | "bash" | "zsh" | "fish"
            | "css" | "scss" | "less" | "html" | "xml" | "json" | "yaml" | "yml" | "toml"
            | "md" | "markdown" | "txt" | "log" | "conf" | "cfg" | "ini" | "env"
            | "sql" | "graphql" | "vue" | "svelte" => "code",
            _ => "binary",
        };

        if file_type == "code" || file_type == "binary" {
            match fs::File::open(file_path) {
                Ok(mut file) => {
                    let mut buffer = vec![0u8; 8192];
                    match file.read(&mut buffer) {
                        Ok(bytes_read) => {
                            buffer.truncate(bytes_read);
                            
                            match String::from_utf8(buffer) {
                                Ok(content) => {
                                    let lines: Vec<&str> = content.lines().take(50).collect();
                                    PreviewContent {
                                        file_type: "code".to_string(),
                                        content: Some(lines.join("\n")),
                                        error: None,
                                    }
                                }
                                Err(_) => PreviewContent {
                                    file_type: "binary".to_string(),
                                    content: None,
                                    error: None,
                                },
                            }
                        }
                        Err(e) => PreviewContent {
                            file_type: file_type.to_string(),
                            content: None,
                            error: Some(format!("Cannot read file: {}", e)),
                        },
                    }
                }
                Err(e) => PreviewContent {
                    file_type: file_type.to_string(),
                    content: None,
                    error: Some(format!("Cannot open file: {}", e)),
                },
            }
        } else {
            PreviewContent {
                file_type: file_type.to_string(),
                content: Some(path),
                error: None,
            }
        }
    }
}

#[tauri::command]
fn copy_files(sources: Vec<String>, destination: String) -> Result<(), String> {
    let dest_path = Path::new(&destination);
    
    if !dest_path.is_dir() {
        return Err("Destination must be a directory".to_string());
    }

    for source in sources {
        let src_path = Path::new(&source);
        let file_name = src_path
            .file_name()
            .ok_or("Invalid source path")?;
        let dest_file = dest_path.join(file_name);

        if src_path.is_dir() {
            copy_dir_recursive(src_path, &dest_file)?;
        } else {
            fs::copy(src_path, &dest_file)
                .map_err(|e| format!("Failed to copy {}: {}", source, e))?;
        }
    }

    Ok(())
}

fn copy_dir_recursive(src: &Path, dest: &Path) -> Result<(), String> {
    fs::create_dir_all(dest).map_err(|e| e.to_string())?;
    
    for entry in fs::read_dir(src).map_err(|e| e.to_string())? {
        let entry = entry.map_err(|e| e.to_string())?;
        let src_path = entry.path();
        let dest_path = dest.join(entry.file_name());
        
        if src_path.is_dir() {
            copy_dir_recursive(&src_path, &dest_path)?;
        } else {
            fs::copy(&src_path, &dest_path).map_err(|e| e.to_string())?;
        }
    }
    
    Ok(())
}

#[tauri::command]
fn move_files(sources: Vec<String>, destination: String) -> Result<(), String> {
    let dest_path = Path::new(&destination);
    
    if !dest_path.is_dir() {
        return Err("Destination must be a directory".to_string());
    }

    for source in sources {
        let src_path = Path::new(&source);
        let file_name = src_path
            .file_name()
            .ok_or("Invalid source path")?;
        let dest_file = dest_path.join(file_name);

        fs::rename(src_path, &dest_file)
            .map_err(|e| format!("Failed to move {}: {}", source, e))?;
    }

    Ok(())
}

#[tauri::command]
fn delete_files(paths: Vec<String>) -> Result<(), String> {
    for path in paths {
        trash::delete(&path)
            .map_err(|e| format!("Failed to delete {}: {}", path, e))?;
    }
    Ok(())
}

#[tauri::command]
fn open_file(path: String) -> Result<(), String> {
    open::that(&path).map_err(|e| format!("Failed to open file: {}", e))
}

#[tauri::command]
fn open_with_editor(path: String) -> Result<(), String> {
    let config = load_config_internal();
    let editor = config.editor.command;
    
    std::process::Command::new(&editor)
        .arg(&path)
        .spawn()
        .map_err(|e| format!("Failed to open with {}: {}", editor, e))?;
    
    Ok(())
}

#[tauri::command]
fn get_home_directory() -> String {
    dirs::home_dir()
        .map(|p| p.to_string_lossy().to_string())
        .unwrap_or_else(|| "/".to_string())
}

#[tauri::command]
fn get_parent_directory(path: String) -> Option<String> {
    Path::new(&path)
        .parent()
        .map(|p| p.to_string_lossy().to_string())
}

#[tauri::command]
fn print_path_and_exit(app: AppHandle, path: String) {
    println!("{}", path);
    app.exit(0);
}

// ============================================================================
// Main Entry Point
// ============================================================================

fn main() {
    // Parse CLI arguments for picker mode
    let args: Vec<String> = env::args().collect();
    let pick_file = args.contains(&"--pick-file".to_string());
    let pick_dir = args.contains(&"--pick-dir".to_string());
    
    if pick_file {
        env::set_var("ZINT_PICKER_MODE", "file");
    } else if pick_dir {
        env::set_var("ZINT_PICKER_MODE", "dir");
    }

    // Load config to apply window settings
    let config = load_config_internal();

    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .setup(move |app| {
            // Apply window decorations from config
            if let Some(window) = app.get_webview_window("main") {
                if !config.window.decorations {
                    let _ = window.set_decorations(false);
                }
            }
            
            // Start CSS file watcher
            let app_handle = app.handle().clone();
            thread::spawn(move || {
                start_css_watcher(app_handle);
            });
            
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            get_config,
            get_user_css,
            get_config_path,
            read_directory,
            get_file_preview,
            copy_files,
            move_files,
            delete_files,
            open_file,
            open_with_editor,
            get_home_directory,
            get_parent_directory,
            print_path_and_exit,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
