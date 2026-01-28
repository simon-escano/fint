import { useState, useEffect, useRef } from 'react';
import { FileEntry } from '../types';
import { getFilePreview, convertFileSrc } from '../api/tauri';
import {
    Folder,
    File,
    FileImage,
    FileVideo,
    FileCode,
    AlertCircle
} from 'lucide-react';

interface PreviewProps {
    entry: FileEntry | null;
}

export function Preview({ entry }: PreviewProps) {
    const [previewContent, setPreviewContent] = useState<{
        type: string;
        content: string | null;
        error: string | null;
    } | null>(null);
    const [isHovering, setIsHovering] = useState(false);
    const videoRef = useRef<HTMLVideoElement>(null);

    useEffect(() => {
        if (!entry) {
            setPreviewContent(null);
            return;
        }

        const loadPreview = async () => {
            try {
                const preview = await getFilePreview(entry.path);
                setPreviewContent({
                    type: preview.file_type,
                    content: preview.content,
                    error: preview.error,
                });
            } catch (err) {
                setPreviewContent({
                    type: 'error',
                    content: null,
                    error: String(err),
                });
            }
        };

        loadPreview();
    }, [entry?.path]);

    // Handle video autoplay on hover
    useEffect(() => {
        if (videoRef.current) {
            if (isHovering) {
                videoRef.current.play().catch(() => { });
            } else {
                videoRef.current.pause();
                videoRef.current.currentTime = 0;
            }
        }
    }, [isHovering]);

    if (!entry) {
        return (
            <div className="h-full flex items-center justify-center text-text-muted">
                <File className="w-12 h-12 opacity-20" />
            </div>
        );
    }

    if (previewContent?.error) {
        return (
            <div className="h-full flex flex-col items-center justify-center text-text-muted gap-2 p-4">
                <AlertCircle className="w-8 h-8 text-red-400" />
                <span className="text-sm text-center">{previewContent.error}</span>
            </div>
        );
    }

    // Directory preview
    if (entry.is_dir && previewContent?.type === 'directory') {
        const items = previewContent.content?.split('\n') || [];
        return (
            <div className="h-full overflow-auto p-3">
                <div className="flex items-center gap-2 mb-3 pb-2 border-b border-[var(--border)]">
                    <Folder className="w-5 h-5 icon-folder" />
                    <span className="font-medium text-sm truncate">{entry.name}</span>
                </div>
                <div className="space-y-1">
                    {items.map((item, i) => (
                        <div key={i} className="text-sm text-text-secondary truncate">
                            {item}
                        </div>
                    ))}
                    {items.length === 0 && (
                        <div className="text-text-muted text-sm">Empty folder</div>
                    )}
                </div>
            </div>
        );
    }

    // Image preview
    if (previewContent?.type === 'image') {
        return (
            <div className="h-full flex items-center justify-center p-4 bg-[var(--bg-secondary)]">
                <img
                    src={convertFileSrc(entry.path)}
                    alt={entry.name}
                    className="preview-image rounded"
                    onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                    }}
                />
            </div>
        );
    }

    // Video preview
    if (previewContent?.type === 'video') {
        return (
            <div
                className="h-full flex items-center justify-center p-4 bg-black"
                onMouseEnter={() => setIsHovering(true)}
                onMouseLeave={() => setIsHovering(false)}
            >
                <video
                    ref={videoRef}
                    src={convertFileSrc(entry.path)}
                    className="preview-video rounded"
                    muted
                    loop
                    playsInline
                />
                {!isHovering && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                        <FileVideo className="w-12 h-12 text-white/50" />
                    </div>
                )}
            </div>
        );
    }

    // Code/text preview
    if (previewContent?.type === 'code' && previewContent.content) {
        return (
            <div className="h-full overflow-auto p-3">
                <div className="flex items-center gap-2 mb-3 pb-2 border-b border-[var(--border)]">
                    <FileCode className="w-5 h-5 icon-code" />
                    <span className="font-medium text-sm truncate">{entry.name}</span>
                </div>
                <pre className="preview-code text-xs">
                    {previewContent.content}
                </pre>
            </div>
        );
    }

    // Binary/unknown file
    return (
        <div className="h-full flex flex-col items-center justify-center text-text-muted gap-3 p-4">
            {previewContent?.type === 'image' ? (
                <FileImage className="w-16 h-16 opacity-30" />
            ) : (
                <File className="w-16 h-16 opacity-30" />
            )}
            <span className="text-sm">{entry.name}</span>
            <span className="text-xs text-text-muted">
                {entry.extension?.toUpperCase() || 'Unknown'} file
            </span>
        </div>
    );
}
