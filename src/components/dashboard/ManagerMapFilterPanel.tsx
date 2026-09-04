import { useEffect, type ReactNode } from 'react';

interface ManagerMapFilterPanelProps {
    children: ReactNode;
    onClose: () => void;
    open: boolean;
}

const ManagerMapFilterPanel = ({ children, onClose, open }: ManagerMapFilterPanelProps) => {
    useEffect(() => {
        if (!open) return undefined;

        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') onClose();
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [onClose, open]);

    if (!open) return null;

    return (
        <>
            <button
                type="button"
                aria-label="Dismiss map filters"
                className="absolute inset-0 z-[490] cursor-default bg-transparent"
                onClick={onClose}
            />
            <div
                role="dialog"
                aria-label="Map filters"
                aria-modal="false"
                className="absolute left-2 right-2 top-2 z-[500] max-h-[80vh] overflow-y-auto rounded-lg border border-gray-100 bg-white/95 p-4 shadow-lg backdrop-blur-sm dark:border-gray-700 dark:bg-gray-800/95 sm:left-4 sm:right-auto sm:top-4 sm:w-full sm:max-w-xs"
            >
                {children}
            </div>
        </>
    );
};

export default ManagerMapFilterPanel;
