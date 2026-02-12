import React from 'react';

type AvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

interface AvatarProps {
    src?: string | null;
    alt?: string;
    name?: string;
    size?: AvatarSize;
    className?: string;
    status?: 'online' | 'offline' | 'away';
}

const sizeClasses: Record<AvatarSize, string> = {
    xs: 'w-6 h-6 text-[10px]',
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-14 h-14 text-lg',
    xl: 'w-20 h-20 text-2xl',
};

const statusSizeClasses: Record<AvatarSize, string> = {
    xs: 'w-1.5 h-1.5 border',
    sm: 'w-2 h-2 border',
    md: 'w-2.5 h-2.5 border-2',
    lg: 'w-3 h-3 border-2',
    xl: 'w-4 h-4 border-2',
};

const statusColors: Record<string, string> = {
    online: 'bg-green-500',
    offline: 'bg-gray-400',
    away: 'bg-amber-500',
};

const getInitials = (name: string): string => {
    return name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);
};

const Avatar: React.FC<AvatarProps> = ({
    src,
    alt = '',
    name = '',
    size = 'md',
    className = '',
    status,
}) => {
    const initials = name ? getInitials(name) : '?';

    return (
        <div className={`relative inline-flex flex-shrink-0 ${className}`}>
            {src ? (
                <img
                    src={src}
                    alt={alt || name}
                    className={`${sizeClasses[size]} rounded-full object-cover border-2 border-white dark:border-zinc-900 shadow-sm`}
                />
            ) : (
                <div
                    className={`${sizeClasses[size]} rounded-full bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center font-semibold text-white border-2 border-white dark:border-zinc-900 shadow-sm`}
                >
                    {initials}
                </div>
            )}
            {status && (
                <span
                    className={`absolute bottom-0 right-0 ${statusSizeClasses[size]} ${statusColors[status]} rounded-full border-white dark:border-zinc-900`}
                />
            )}
        </div>
    );
};

export default Avatar;
