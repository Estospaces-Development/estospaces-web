import { useState } from 'react';
import { Play } from 'lucide-react';
import {
    getRoleVideoEmbedUrl,
    getRoleVideoFallbackThumbnailUrl,
    getRoleVideoThumbnailUrl,
    type RoleVideo,
} from '@/lib/roleVideos';

interface RoleVideoPlayerProps {
    video: RoleVideo;
    className?: string;
}

/** Click-to-play YouTube embed: the player only loads once the viewer presses play. */
export default function RoleVideoPlayer({ video, className = '' }: RoleVideoPlayerProps) {
    const [playing, setPlaying] = useState(false);
    const [thumbnail, setThumbnail] = useState(getRoleVideoThumbnailUrl(video.id));

    return (
        <div className={`relative aspect-video w-full overflow-hidden rounded-2xl bg-black ${className}`}>
            {playing ? (
                <iframe
                    className="absolute inset-0 h-full w-full border-0"
                    src={getRoleVideoEmbedUrl(video.id)}
                    title={video.title}
                    allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
                    allowFullScreen
                    referrerPolicy="strict-origin-when-cross-origin"
                />
            ) : (
                <button
                    type="button"
                    onClick={() => setPlaying(true)}
                    aria-label={`Play video: ${video.title}`}
                    className="group absolute inset-0 block h-full w-full focus:outline-none focus-visible:ring-4 focus-visible:ring-inset focus-visible:ring-orange-500"
                >
                    <img
                        src={thumbnail}
                        alt=""
                        loading="lazy"
                        onError={() => setThumbnail(getRoleVideoFallbackThumbnailUrl(video.id))}
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                    />
                    <span className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                    <span className="absolute left-1/2 top-1/2 flex h-16 w-16 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-orange-500 text-white shadow-xl transition-transform group-hover:scale-110 sm:h-20 sm:w-20">
                        <Play className="ml-1 h-7 w-7 sm:h-8 sm:w-8" fill="currentColor" />
                    </span>
                </button>
            )}
        </div>
    );
}
