import {
    Folder,
    File,
    FileImage,
    FileVideo,
    FileAudio,
    FileCode,
    FileText,
    FileArchive,
    Link
} from 'lucide-react';
import { FileEntry, formatFileSize, getFileTypeFromExtension } from '../types';

interface FileItemProps {
    entry: FileEntry;
    isCursor: boolean;
    isSelected: boolean;
}

function getIcon(entry: FileEntry) {
    if (entry.is_symlink) {
        return <Link className="w-4 h-4 icon-file" />;
    }

    if (entry.is_dir) {
        return <Folder className="w-4 h-4 icon-folder" />;
    }

    const fileType = getFileTypeFromExtension(entry.extension);

    switch (fileType) {
        case 'image':
            return <FileImage className="w-4 h-4 icon-image" />;
        case 'video':
            return <FileVideo className="w-4 h-4 icon-video" />;
        case 'audio':
            return <FileAudio className="w-4 h-4 icon-file" />;
        case 'code':
            return <FileCode className="w-4 h-4 icon-code" />;
        case 'text':
            return <FileText className="w-4 h-4 icon-text" />;
        case 'archive':
            return <FileArchive className="w-4 h-4 icon-file" />;
        case 'pdf':
            return <FileText className="w-4 h-4 icon-file" />;
        default:
            return <File className="w-4 h-4 icon-file" />;
    }
}

export function FileItem({ entry, isCursor, isSelected }: FileItemProps) {
    const classNames = [
        'file-item',
        isCursor ? 'cursor' : '',
        isSelected ? 'selected' : '',
    ].filter(Boolean).join(' ');

    return (
        <div className={classNames}>
            {getIcon(entry)}

            <span className="flex-1 truncate text-sm">
                {entry.name}
            </span>

            <span className="text-xs text-text-muted w-20 text-right font-mono">
                {entry.is_dir ? '' : formatFileSize(entry.size)}
            </span>

            <span className="text-xs text-text-muted w-32 text-right hidden lg:block">
                {entry.modified}
            </span>
        </div>
    );
}
