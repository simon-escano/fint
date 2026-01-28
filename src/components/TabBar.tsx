import { Plus } from 'lucide-react';

interface Tab {
    id: string;
    path: string;
}

interface TabBarProps {
    tabs: Tab[];
    activeIndex: number;
    onSwitchTab: (index: number) => void;
}

export function TabBar({ tabs, activeIndex, onSwitchTab }: TabBarProps) {
    if (tabs.length <= 1) return null;

    return (
        <div className="tab-bar">
            {tabs.map((tab, index) => {
                const dirName = tab.path.split('/').filter(Boolean).pop() || '/';
                const isActive = index === activeIndex;

                return (
                    <button
                        key={tab.id}
                        className={`tab ${isActive ? 'active' : ''}`}
                        onClick={() => onSwitchTab(index)}
                    >
                        <span className="text-text-muted mr-1">{index + 1}:</span>
                        {dirName}
                    </button>
                );
            })}

            <button className="tab opacity-50 hover:opacity-100">
                <Plus className="w-4 h-4" />
            </button>
        </div>
    );
}
