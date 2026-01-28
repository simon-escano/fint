import { useEffect, useState } from 'react';
import { AlertCircle, CheckCircle, X } from 'lucide-react';

interface ToastProps {
    message: string;
    type?: 'error' | 'success';
    onClose: () => void;
    duration?: number;
}

export function Toast({ message, type = 'error', onClose, duration = 4000 }: ToastProps) {
    const [isVisible, setIsVisible] = useState(true);

    useEffect(() => {
        const timer = setTimeout(() => {
            setIsVisible(false);
            setTimeout(onClose, 200);
        }, duration);

        return () => clearTimeout(timer);
    }, [duration, onClose]);

    const Icon = type === 'error' ? AlertCircle : CheckCircle;

    return (
        <div
            className={`toast ${type} ${isVisible ? 'opacity-100' : 'opacity-0'} transition-opacity`}
        >
            <div className="flex items-center gap-3">
                <Icon className="w-5 h-5 flex-shrink-0" />
                <span className="text-sm flex-1">{message}</span>
                <button
                    onClick={onClose}
                    className="p-1 hover:bg-[var(--bg-hover)] rounded transition-colors"
                >
                    <X className="w-4 h-4" />
                </button>
            </div>
        </div>
    );
}
