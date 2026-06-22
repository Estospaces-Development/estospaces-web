"use client";

import React, { useEffect, useMemo, useState } from 'react';
import { useUserProfileSummary } from '@/contexts/UserProfileSummaryContext';

type AvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';
type AvatarShape = 'circle' | 'rounded';

interface AvatarProps {
    userId?: string | null;
    src?: string | null;
    alt?: string;
    name?: string;
    size?: AvatarSize;
    shape?: AvatarShape;
    className?: string;
    status?: 'online' | 'offline' | 'away';
    fallbackClassName?: string;
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

const shapeClasses: Record<AvatarShape, string> = {
    circle: 'rounded-full',
    rounded: 'rounded-2xl',
};

const getInitials = (name: string): string => {
    const initials = name
        .split(' ')
        .map((part) => part[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);

    return initials || '?';
};

export const isRenderableAvatarSrc = (src?: string | null): boolean => {
    const value = String(src || '').trim();
    if (!value) {
        return false;
    }

    try {
        const url = new URL(value);
        const isGoogleStorageHost = url.hostname === 'storage.googleapis.com' || url.hostname === 'storage.cloud.google.com';
        const pointsToPrivateMediaBucket = /^\/estospaces-media-[^/]+\//.test(url.pathname);
        return !(isGoogleStorageHost && pointsToPrivateMediaBucket);
    } catch {
        return !value.includes('storage.googleapis.com/estospaces-media-')
            && !value.includes('storage.cloud.google.com/estospaces-media-');
    }
};

const Avatar: React.FC<AvatarProps> = ({
    userId,
    src,
    alt = '',
    name = '',
    size = 'md',
    shape = 'circle',
    className = '',
    status,
    fallbackClassName = '',
}) => {
    const summary = useUserProfileSummary(userId);
    const [imageFailed, setImageFailed] = useState(false);
    const resolvedName = useMemo(
        () => summary?.display_name || name || alt || 'User',
        [alt, name, summary?.display_name],
    );
    const resolvedSrc = src || summary?.avatar || '';
    const renderableSrc = isRenderableAvatarSrc(resolvedSrc) ? resolvedSrc : '';

    useEffect(() => {
        setImageFailed(false);
    }, [renderableSrc]);

    return (
        <div className={`relative inline-flex flex-shrink-0 ${className}`}>
            {renderableSrc && !imageFailed ? (
                <img
                    src={renderableSrc}
                    alt={alt || resolvedName}
                    onError={() => setImageFailed(true)}
                    className={`${sizeClasses[size]} ${shapeClasses[shape]} object-cover border-2 border-white dark:border-zinc-900 shadow-sm`}
                />
            ) : (
                <div
                    className={`${sizeClasses[size]} ${shapeClasses[shape]} bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center font-semibold text-white border-2 border-white dark:border-zinc-900 shadow-sm ${fallbackClassName}`}
                >
                    {getInitials(resolvedName)}
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
