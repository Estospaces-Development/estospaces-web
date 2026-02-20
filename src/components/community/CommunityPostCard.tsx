import React, { useState } from 'react';
import { Heart, MessageCircle, Pin, Eye, EyeOff, MoreVertical } from 'lucide-react';
import { CommunityPost } from '../../mocks/communityPosts';
import { formatDistanceToNow } from 'date-fns';

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
    const [isLiked, setIsLiked] = useState(false);
    const [showFullContent, setShowFullContent] = useState(false);
    const [showActions, setShowActions] = useState(false);

    const handleLike = () => {
        setIsLiked(!isLiked);
        onLike(post.postId);
    };

    const getTagColors = (tag: CommunityPost['tag']) => {
        switch (tag) {
            case 'urgent': return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
            case 'deal': return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
            case 'announcement': return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
            case 'info': return 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400';
            default: return 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400';
        }
    };

    const getRoleBadgeColors = (role: CommunityPost['authorRole']) => {
        return role === 'manager'
            ? 'bg-indigo-100 text-indigo-700 border border-indigo-200 dark:bg-indigo-900/30 dark:text-indigo-400 dark:border-indigo-800'
            : 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 border border-orange-200 dark:border-orange-800';
    };

    const contentPreview = post.content.length > 200 ? post.content.slice(0, 200) + '...' : post.content;
    const needsReadMore = post.content.length > 200;

    return (
        <div className={`bg-white dark:bg-black rounded-xl p-5 shadow-sm border border-gray-200 dark:border-zinc-800 hover:shadow-md transition-all duration-300 ${post.isPinned ? 'ring-2 ring-indigo-500/30' : ''}`}>
            {/* Header */}
            <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-blue-600 rounded-full flex items-center justify-center">
                        <span className="text-white font-semibold text-sm">{post.authorName.charAt(0)}</span>
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <h4 className="font-semibold text-gray-900 dark:text-white">{post.authorName}</h4>
                            <span className={`px-2 py-0.5 rounded-md text-xs font-medium ${getRoleBadgeColors(post.authorRole)}`}>
                                {post.authorRole.charAt(0).toUpperCase() + post.authorRole.slice(1)}
                            </span>
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                            {formatDistanceToNow(post.createdAt, { addSuffix: true })}
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <span className={`px-3 py-1 rounded-lg text-xs font-semibold uppercase ${getTagColors(post.tag)}`}>
                        {post.tag}
                    </span>
                    {post.isPinned && <Pin className="w-4 h-4 text-indigo-600 fill-indigo-600" />}

                    {isManager && (
                        <div className="relative">
                            <button onClick={() => setShowActions(!showActions)} className="p-1 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-lg transition-colors">
                                <MoreVertical className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                            </button>
                            {showActions && (
                                <div className="absolute right-0 top-8 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-lg shadow-lg py-1 z-10 w-40">
                                    <button onClick={() => { onPin(post.postId); setShowActions(false); }} className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-zinc-800 flex items-center gap-2">
                                        <Pin className="w-4 h-4" /> {post.isPinned ? 'Unpin' : 'Pin'} Post
                                    </button>
                                    <button onClick={() => { onHide(post.postId); setShowActions(false); }} className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-zinc-800 flex items-center gap-2">
                                        <EyeOff className="w-4 h-4" /> Hide Post
                                    </button>
                                    <div className="border-t border-gray-200 dark:border-zinc-800 my-1" />
                                    <button onClick={() => { onVisibilityChange(post.postId, 'all'); setShowActions(false); }} className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-zinc-800">Visible to All</button>
                                    <button onClick={() => { onVisibilityChange(post.postId, 'managers'); setShowActions(false); }} className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-zinc-800">Managers Only</button>
                                    <button onClick={() => { onVisibilityChange(post.postId, 'brokers'); setShowActions(false); }} className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-zinc-800">Brokers Only</button>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Content */}
            <div className="mb-4">
                <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                    {showFullContent ? post.content : contentPreview}
                </p>
                {needsReadMore && (
                    <button onClick={() => setShowFullContent(!showFullContent)} className="text-indigo-600 hover:underline text-sm font-medium mt-2">
                        {showFullContent ? 'Show less' : 'Read more'}
                    </button>
                )}
            </div>

            {/* Footer */}
            <div className="flex items-center gap-4 pt-3 border-t border-gray-200 dark:border-zinc-800">
                <button
                    onClick={handleLike}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all duration-200 ${isLiked
                        ? 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400'
                        : 'bg-gray-100 dark:bg-zinc-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-zinc-700'
                        }`}
                >
                    <Heart className={`w-4 h-4 ${isLiked ? 'fill-current' : ''}`} />
                    <span className="text-sm font-medium">{post.likesCount + (isLiked ? 1 : 0)}</span>
                </button>

                <button
                    onClick={() => onCommentClick(post)}
                    className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 dark:bg-zinc-800 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-zinc-700 transition-colors cursor-pointer"
                >
                    <MessageCircle className="w-4 h-4" />
                    <span className="text-sm font-medium">{post.commentsCount}</span>
                </button>

                {post.visibility !== 'all' && (
                    <div className="ml-auto flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                        <Eye className="w-3 h-3" />
                        <span className="capitalize">{post.visibility} only</span>
                    </div>
                )}
            </div>
        </div>
    );
};

export default CommunityPostCard;
