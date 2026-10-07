import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import RoleVideoPlayer from '@/components/video/RoleVideoPlayer';
import { ROLE_VIDEOS, hasSeenWelcomeVideo, markWelcomeVideoSeen, type RoleVideoRole } from '@/lib/roleVideos';

interface WelcomeVideoCardProps {
    role: RoleVideoRole;
}

/**
 * First-visit welcome video, shown at the top of the role's dashboard until dismissed.
 * It is an inline card, not an overlay, so it never blocks the page underneath.
 */
export default function WelcomeVideoCard({ role }: WelcomeVideoCardProps) {
    const { user } = useAuth();
    const userId = user?.id;
    const [visible, setVisible] = useState(false);
    const video = ROLE_VIDEOS[role];

    useEffect(() => {
        if (userId && !hasSeenWelcomeVideo(role, userId)) setVisible(true);
    }, [role, userId]);

    if (!visible) return null;

    const dismiss = () => {
        if (userId) markWelcomeVideoSeen(role, userId);
        setVisible(false);
    };

    return (
        <section
            aria-labelledby={`welcome-video-title-${role}`}
            data-welcome-video-card
            className="relative overflow-hidden rounded-3xl border border-orange-100 bg-white p-4 shadow-sm dark:border-orange-900/30 dark:bg-gray-900 sm:p-6"
        >
            <button
                type="button"
                onClick={dismiss}
                aria-label="Dismiss welcome video"
                className="absolute right-3 top-3 z-10 rounded-full p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 dark:hover:bg-gray-800"
            >
                <X size={18} />
            </button>
            <div className="grid items-center gap-5 md:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] md:gap-8">
                <div className="pr-8 md:pr-0">
                    <p className="text-xs font-black uppercase tracking-[0.22em] text-orange-500">Welcome to Estospaces</p>
                    <h2
                        id={`welcome-video-title-${role}`}
                        className="mt-2 text-xl font-bold text-gray-900 dark:text-white sm:text-2xl"
                    >
                        {role === 'manager' ? 'Watch the manager walkthrough' : 'Watch the user masterclass'}
                    </h2>
                    <p className="mt-2 text-sm leading-6 text-gray-600 dark:text-gray-400">
                        {video.description} You can find it again in Docs at any time.
                    </p>
                    <button
                        type="button"
                        onClick={dismiss}
                        className="mt-4 rounded-xl border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
                    >
                        Dismiss
                    </button>
                </div>
                <RoleVideoPlayer video={video} />
            </div>
        </section>
    );
}
