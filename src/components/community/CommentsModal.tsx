"use client";

import React, { useState } from 'react';
import { X, Send } from 'lucide-react';
import { CommunityPost, AuthorRole, PostComment } from '@/services/communityService';
import { formatDistanceToNow } from 'date-fns';
import { useAuth } from '@/contexts/AuthContext';
import Avatar from '@/components/ui/Avatar';

interface CommentsModalProps {
    isOpen: boolean;
    post: CommunityPost | null;
    onClose: () => void;
    onAddComment: (postId: string, content: string) => void;
}

const CommentsModal: React.FC<CommentsModalProps> = ({ isOpen, post, onClose, onAddComment }) => {
    const [newComment, setNewComment] = useState('');
    const { user } = useAuth();

    if (!isOpen || !post) return null;
    const comments = post.comments || [];

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (newComment.trim()) {
            onAddComment(post.postId, newComment);
            setNewComment('');
        }
    };

    const getRoleBadgeColors = (role: AuthorRole) => {
        return role === 'manager'
            ? 'bg-indigo-100 text-indigo-900 border border-indigo-200 dark:bg-indigo-900/30 dark:text-indigo-200 dark:border-indigo-800'
            : 'bg-orange-100 text-orange-900 dark:bg-orange-900/30 dark:text-orange-200 border border-orange-200 dark:border-orange-800';
    };

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[9999] flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div
                role="dialog"
                aria-modal="true"
                aria-labelledby="community-comments-title"
                className="bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl w-full max-w-3xl max-h-[85vh] flex flex-col border border-gray-100 dark:border-zinc-800 animate-in zoom-in-95 duration-200"
            >
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-100 dark:border-zinc-800">
                    <div>
                        <h2 id="community-comments-title" className="text-2xl font-bold text-gray-900 dark:text-white">Comments</h2>
                        <p className="text-sm font-medium text-gray-800 dark:text-gray-300 mt-1">
                            {comments.length} {comments.length === 1 ? 'comment' : 'comments'}
                        </p>
                    </div>
                    <button onClick={onClose} aria-label="Close comments" className="p-2 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-lg transition-colors">
                        <X className="w-5 h-5 text-gray-800 dark:text-gray-300" />
                    </button>
                </div>

                {/* Original Post */}
                <div className="p-6 border-b border-gray-100 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-950/50">
                    <div className="flex items-start gap-3 mb-3">
                        <Avatar
                            userId={post.authorId}
                            name={post.authorName}
                            size="md"
                        />
                        <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                                <h4 className="font-semibold text-gray-900 dark:text-white">{post.authorName}</h4>
                                <span className={`px-2 py-0.5 rounded-md text-xs font-medium ${getRoleBadgeColors(post.authorRole)}`}>
                                    {post.authorRole.charAt(0).toUpperCase() + post.authorRole.slice(1)}
                                </span>
                                <span className="text-xs font-medium text-gray-800 dark:text-gray-300">
                                    {formatDistanceToNow(post.createdAt, { addSuffix: true })}
                                </span>
                            </div>
                            <p className="text-gray-900 dark:text-gray-200 leading-relaxed">{post.content}</p>
                        </div>
                    </div>
                </div>

                {/* Comments List */}
                <div className="flex-1 overflow-y-auto p-6 space-y-4">
                    {comments.length === 0 ? (
                        <div className="text-center py-12">
                            <p className="text-gray-800 dark:text-gray-300">No comments yet. Be the first to comment!</p>
                        </div>
                    ) : (
                        comments.map((comment: PostComment) => (
                            <div key={comment.commentId} className="flex gap-3">
                                <Avatar
                                    userId={comment.authorId}
                                    name={comment.authorName}
                                    size="sm"
                                />
                                <div className="flex-1 bg-gray-50 dark:bg-zinc-950/50 rounded-lg p-4">
                                    <div className="flex items-center gap-2 mb-2">
                                        <span className="font-medium text-gray-900 dark:text-white text-sm">{comment.authorName}</span>
                                        <span className={`px-2 py-0.5 rounded-md text-xs font-medium ${getRoleBadgeColors(comment.authorRole)}`}>
                                            {comment.authorRole.charAt(0).toUpperCase() + comment.authorRole.slice(1)}
                                        </span>
                                        <span className="text-xs font-medium text-gray-800 dark:text-gray-300">
                                            {formatDistanceToNow(comment.createdAt, { addSuffix: true })}
                                        </span>
                                    </div>
                                    <p className="text-gray-900 dark:text-gray-200 text-sm leading-relaxed">{comment.content}</p>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {/* Add Comment Form */}
                <div className="p-6 border-t border-gray-100 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-950/50">
                    <form onSubmit={handleSubmit} className="flex gap-3">
                        <Avatar
                            userId={user?.id}
                            src={user?.avatar || user?.avatar_url}
                            name={user?.name || user?.email || 'Me'}
                            size="sm"
                        />
                        <div className="flex-1 flex gap-2">
                            <input
                                type="text"
                                value={newComment}
                                onChange={(e) => setNewComment(e.target.value)}
                                placeholder="Write a comment..."
                                aria-label="Write a comment"
                                required
                                className="flex-1 px-4 py-2 rounded-lg border border-gray-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            />
                            <button
                                type="submit"
                                disabled={!newComment.trim()}
                                aria-label="Send comment"
                                className="px-4 py-2 bg-indigo-800 hover:bg-indigo-900 text-white rounded-lg transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                            >
                                <Send className="w-4 h-4" />
                                <span className="hidden sm:inline">Send</span>
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default CommentsModal;
