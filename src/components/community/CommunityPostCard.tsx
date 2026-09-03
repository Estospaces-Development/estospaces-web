import React, { useState } from 'react';
import { Heart, MessageCircle, Pin, Eye, EyeOff, MoreVertical } from 'lucide-react';
import { CommunityPost } from '@/services/communityService';
import { formatDistanceToNow } from 'date-fns';
import Avatar from '@/components/ui/Avatar';

interface CommunityPostCardProps {
    post: CommunityPost;
    isManager?: boolean;
    onLike: (postId: string) => void;
    onPin: (postId: string) => void;
    onHide: (postId: string) => void;
    onVisibilityChange: (postId: string, visibility: CommunityPost['visibility']) => void;
    onCommentClick: (post: CommunityPost) => void;
}

const CommunityPostCard: React.FC<CommunityPostCardProps> = ({
    post,
    isManager = true,
    onLike,
    onPin,
    onHide,
    onVisibilityChange,
    onCommentClick,
}) => {
    const [showFullContent, setShowFullContent] = useState(false);
    const [showActions, setShowActions] = useState(false);

    const handleLike = () => {
        onLike(post.postId);
    };

    const getTagColors = (tag: CommunityPost['tag']) => {
        switch (tag) {
            case 'urgent': return 'bg-red-100 text-red-900 dark:bg-red-900/30 dark:text-red-200';
            case 'deal': return 'bg-green-100 text-green-900 dark:bg-green-900/30 dark:text-green-200';
            case 'announcement': return 'bg-blue-100 text-blue-900 dark:bg-blue-900/30 dark:text-blue-200';
            case 'info': return 'bg-purple-100 text-purple-900 dark:bg-purple-900/30 dark:text-purple-200';
            default: return 'bg-gray-100 text-gray-900 dark:bg-gray-900/30 dark:text-gray-200';
        }
    };

    const getRoleBadgeColors = (role: CommunityPost['authorRole']) => {
        return role === 'manager'
            ? 'bg-indigo-100 text-indigo-900 border border-indigo-200 dark:bg-indigo-900/30 dark:text-indigo-200 dark:border-indigo-800'
            : 'bg-orange-100 text-orange-900 dark:bg-orange-900/30 dark:text-orange-200 border border-orange-200 dark:border-orange-800';
    };

    const contentPreview = post.content.length > 200 ? post.content.slice(0, 200) + '...' : post.content;
    const needsReadMore = post.content.length > 200;

    return (
        <div className={`min-w-0 overflow-hidden rounded-xl border border-gray-100 bg-white p-4 shadow-sm transition-all duration-300 hover:shadow-md dark:border-zinc-800 dark:bg-black sm:p-5 ${post.isPinned ? 'ring-2 ring-indigo-500/30' : ''}`}>
            {/* Header */}
            <div className="mb-3 flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex min-w-0 items-center gap-3">
                    <Avatar
                        userId={post.authorId}
                        name={post.authorName}
                        size="md"
                    />
                    <div className="min-w-0">
                        <div className="flex min-w-0 flex-wrap items-center gap-2">
                            <h4 className="min-w-0 break-words font-semibold text-gray-900 dark:text-white">{post.authorName}</h4>
                            <span className={`shrink-0 rounded-md px-2 py-0.5 text-xs font-medium ${getRoleBadgeColors(post.authorRole)}`}>
                                {post.authorRole.charAt(0).toUpperCase() + post.authorRole.slice(1)}
                            </span>
                        </div>
                        <p className="text-xs font-medium text-gray-800 dark:text-gray-300">
                            {formatDistanceToNow(post.createdAt, { addSuffix: true })}
                        </p>
                    </div>
                </div>

                <div className="flex min-w-0 items-center gap-2 self-end sm:self-auto">
                    <span className={`max-w-full truncate rounded-lg px-3 py-1 text-xs font-semibold uppercase ${getTagColors(post.tag)}`}>
                        {post.tag}
                    </span>
                    {post.isPinned && <Pin className="w-4 h-4 text-indigo-600 fill-indigo-600" />}

                    {isManager && (
                        <div className="relative">
                            <button
                                onClick={() => setShowActions(!showActions)}
                                aria-label={`Open moderation actions for ${post.title || post.authorName}`}
                                aria-expanded={showActions}
                                className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg p-1 transition-colors hover:bg-gray-100 dark:hover:bg-zinc-800"
                            >
                                <MoreVertical className="w-4 h-4 text-gray-800 dark:text-gray-300" />
                            </button>
                            {showActions && (
                                <div role="menu" className="absolute right-0 top-8 bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 rounded-lg shadow-lg py-1 z-10 w-40">
                                    <button role="menuitem" aria-label={post.isPinned ? `Unpin ${post.title || 'post'}` : `Pin ${post.title || 'post'}`} onClick={() => { onPin(post.postId); setShowActions(false); }} className="w-full px-4 py-2 text-left text-sm font-medium text-gray-900 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-zinc-800 flex items-center gap-2">
                                        <Pin className="w-4 h-4" /> {post.isPinned ? 'Unpin' : 'Pin'} Post
                                    </button>
                                    <button role="menuitem" aria-label={`Archive ${post.title || 'post'}`} onClick={() => { onHide(post.postId); setShowActions(false); }} className="w-full px-4 py-2 text-left text-sm font-medium text-gray-900 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-zinc-800 flex items-center gap-2">
                                        <EyeOff className="w-4 h-4" /> Hide Post
                                    </button>
                                    <div className="border-t border-gray-100 dark:border-zinc-800 my-1" />
                                    <button role="menuitem" aria-label={`Make ${post.title || 'post'} visible to all`} onClick={() => { onVisibilityChange(post.postId, 'all'); setShowActions(false); }} className="w-full px-4 py-2 text-left text-sm font-medium text-gray-900 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-zinc-800">Visible to All</button>
                                    <button role="menuitem" aria-label={`Make ${post.title || 'post'} visible to managers only`} onClick={() => { onVisibilityChange(post.postId, 'managers'); setShowActions(false); }} className="w-full px-4 py-2 text-left text-sm font-medium text-gray-900 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-zinc-800">Managers Only</button>
                                    <button role="menuitem" aria-label={`Make ${post.title || 'post'} visible to brokers only`} onClick={() => { onVisibilityChange(post.postId, 'brokers'); setShowActions(false); }} className="w-full px-4 py-2 text-left text-sm font-medium text-gray-900 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-zinc-800">Brokers Only</button>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Content */}
            <div className="mb-4">
                {post.title && (
                    <h3 className="mb-2 text-lg font-bold text-gray-900 dark:text-white break-words [overflow-wrap:anywhere]">
                        {post.title}
                    </h3>
                )}
                <p className="text-gray-900 dark:text-gray-200 leading-relaxed">
                    {showFullContent ? post.content : contentPreview}
                </p>
                {needsReadMore && (
                    <button onClick={() => setShowFullContent(!showFullContent)} aria-expanded={showFullContent} className="text-indigo-600 hover:underline text-sm font-medium mt-2">
                        {showFullContent ? 'Show less' : 'Read more'}
                    </button>
                )}
            </div>

            {/* Footer */}
            <div className="flex flex-wrap items-center gap-3 border-t border-gray-100 pt-3 dark:border-zinc-800">
                <button
                    onClick={handleLike}
                    aria-label={post.isLiked ? `Unlike ${post.title || 'community post'}` : `Like ${post.title || 'community post'}`}
                    aria-pressed={post.isLiked}
                    className={`flex min-h-11 items-center gap-2 rounded-lg px-3 py-1.5 transition-all duration-200 ${post.isLiked
                        ? 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400'
                        : 'bg-gray-100 dark:bg-zinc-800 text-gray-900 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-zinc-700'
                        }`}
                >
                    <Heart className={`w-4 h-4 ${post.isLiked ? 'fill-current' : ''}`} />
                    <span className="text-sm font-medium">{post.likesCount}</span>
                </button>

                <button
                    onClick={() => onCommentClick(post)}
                    aria-label={`Open comments for ${post.title || 'community post'}`}
                    className="flex min-h-11 cursor-pointer items-center gap-2 rounded-lg bg-gray-100 px-3 py-1.5 text-gray-900 transition-colors hover:bg-gray-200 dark:bg-zinc-800 dark:text-gray-200 dark:hover:bg-zinc-700"
                >
                    <MessageCircle className="w-4 h-4" />
                    <span className="text-sm font-medium">{post.commentsCount}</span>
                </button>

                {post.visibility !== 'all' && (
                    <div className="ml-auto flex items-center gap-1 text-xs font-medium text-gray-800 dark:text-gray-300">
                        <Eye className="w-3 h-3" />
                        <span className="capitalize">{post.visibility} only</span>
                    </div>
                )}
            </div>
        </div>
    );
};

export default CommunityPostCard;
