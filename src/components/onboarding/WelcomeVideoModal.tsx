import { useCallback, useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import RoleVideoPlayer from '@/components/video/RoleVideoPlayer';
import { ROLE_VIDEOS, hasSeenWelcomeVideo, markWelcomeVideoSeen, type RoleVideoRole } from '@/lib/roleVideos';

interface WelcomeVideoModalProps {
    role: RoleVideoRole;
}

/** Shows the role's walkthrough video once per account the first time they land in the app. */
export default function WelcomeVideoModal({ role }: WelcomeVideoModalProps) {
    const { user } = useAuth();
    const userId = user?.id;
    const [open, setOpen] = useState(false);
    const closeRef = useRef<HTMLButtonElement | null>(null);
    const video = ROLE_VIDEOS[role];

    useEffect(() => {
        if (userId && !hasSeenWelcomeVideo(role, userId)) setOpen(true);
    }, [role, userId]);

    const close = useCallback(() => {
        if (userId) markWelcomeVideoSeen(role, userId);
        setOpen(false);
    }, [role, userId]);

    useEffect(() => {
        if (!open) return undefined;
        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        closeRef.current?.focus();
        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') close();
        };
        window.addEventListener('keydown', onKeyDown);
        return () => {
            document.body.style.overflow = previousOverflow;
            window.removeEventListener('keydown', onKeyDown);
        };
    }, [open, close]);

    if (!open) return null;

    return (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={close} aria-hidden="true" />
            <div
                role="dialog"
                aria-modal="true"
                aria-labelledby="welcome-video-title"
                className="relative w-full max-w-3xl overflow-hidden rounded-3xl bg-white shadow-2xl dark:bg-gray-900"
            >
                <button
                    ref={closeRef}
                    type="button"
                    onClick={close}
                    aria-label="Close welcome video"
                    className="absolute right-3 top-3 z-10 rounded-full bg-white/90 p-2 text-gray-700 shadow hover:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-500"
                >
                    <X size={20} />
                </button>
                <div className="p-5 pb-4 pr-14 sm:p-7 sm:pb-5">
                    <p className="text-xs font-black uppercase tracking-[0.22em] text-orange-500">Welcome to Estospaces</p>
                    <h2 id="welcome-video-title" className="mt-2 text-xl font-bold text-gray-900 dark:text-white sm:text-2xl">
                        {role === 'manager' ? 'Watch the manager walkthrough' : 'Watch the user masterclass'}
                    </h2>
                    <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                        {video.description} You can find it again in Docs at any time.
                    </p>
                </div>
                <RoleVideoPlayer video={video} className="rounded-none" />
                <div className="flex justify-end p-4 sm:px-7">
                    <button
                        type="button"
                        onClick={close}
                        className="rounded-xl bg-orange-500 px-6 py-2.5 text-sm font-semibold text-white shadow-lg shadow-orange-500/25 hover:bg-orange-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2"
                    >
                        Skip for now
                    </button>
                </div>
            </div>
        </div>
    );
}
