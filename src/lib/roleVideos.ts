export type RoleVideoRole = 'user' | 'manager';

export interface RoleVideo {
    id: string;
    title: string;
    description: string;
}

export const ROLE_VIDEOS: Record<RoleVideoRole, RoleVideo> = {
    user: {
        id: 'xM140AfjOBA',
        title: 'How to Use Estospaces | Complete User Masterclass (Find a Home → Get Your Keys)',
        description: 'A full walkthrough for users, from finding a property to getting your keys.',
    },
    manager: {
        id: 'hi-H7D164NA',
        title: 'Stop Losing Property Leads: The Complete Estospaces Manager Walkthrough',
        description: 'A full walkthrough for managers: listings, leads, shortlists, and Fast Track.',
    },
};

export const getRoleVideoWatchUrl = (id: string) => `https://www.youtube.com/watch?v=${id}`;

// youtube-nocookie sets no cookies until the viewer presses play.
export const getRoleVideoEmbedUrl = (id: string) =>
    `https://www.youtube-nocookie.com/embed/${encodeURIComponent(id)}?autoplay=1&rel=0&modestbranding=1&playsinline=1`;

export const getRoleVideoThumbnailUrl = (id: string) => `https://i.ytimg.com/vi/${id}/maxresdefault.jpg`;

export const getRoleVideoFallbackThumbnailUrl = (id: string) => `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;

export const welcomeVideoStorageKey = (role: RoleVideoRole, userId: string) =>
    `estospaces_welcome_video_seen_${role}_${userId}`;

type VideoStorage = Pick<Storage, 'getItem' | 'setItem'>;

const getStorage = (): VideoStorage | null => {
    try {
        return typeof window === 'undefined' ? null : window.localStorage;
    } catch {
        return null;
    }
};

export function hasSeenWelcomeVideo(role: RoleVideoRole, userId: string, storage: VideoStorage | null = getStorage()) {
    try {
        return storage?.getItem(welcomeVideoStorageKey(role, userId)) === 'true';
    } catch {
        return false;
    }
}

export function markWelcomeVideoSeen(role: RoleVideoRole, userId: string, storage: VideoStorage | null = getStorage()) {
    try {
        storage?.setItem(welcomeVideoStorageKey(role, userId), 'true');
    } catch {
        // Storage can be blocked; the viewer may see the welcome video again next time.
    }
}
