"use client";

import React, { useState } from 'react';
import { X, Send } from 'lucide-react';
import { CommunityPost, AuthorRole } from '../../mocks/communityPosts';
import { formatDistanceToNow } from 'date-fns';

interface CommentsModalProps {
    isOpen: boolean;
    post: CommunityPost | null;
    onClose: () => void;
    onAddComment: (postId: string, content: string) => void;
}

const CommentsModal: React.FC<CommentsModalProps> = ({ isOpen, post, onClose, onAddComment }) => {
    const [newComment, setNewComment] = useState('');

    if (!isOpen || !post) return null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (newComment.trim()) {
            onAddComment(post.postId, newComment);
            setNewComment('');
        }
    };

    const getRoleBadgeColors = (role: AuthorRole) => {
        return role === 'manager'
            ? 'bg-indigo-100 text-indigo-700 border border-indigo-200 dark:bg-indigo-900/30 dark:text-indigo-400 dark:border-indigo-800'
            : 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 border border-orange-200 dark:border-orange-800';
    };

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[9999] flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl w-full max-w-3xl max-h-[85vh] flex flex-col border border-gray-200 dark:border-zinc-800 animate-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-zinc-800">
                    <div>
                        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Comments</h2>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                            {post.commentsCount} {post.commentsCount === 1 ? 'comment' : 'comments'}
                        </p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-lg transition-colors">
                        <X className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                    </button>
                </div>

                {/* Original Post */}
                <div className="p-6 border-b border-gray-200 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-950/50">
                    <div className="flex items-start gap-3 mb-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
                            <span className="text-white font-semibold text-sm">{post.authorName.charAt(0)}</span>
                        </div>
                        <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                                <h4 className="font-semibold text-gray-900 dark:text-white">{post.authorName}</h4>
                                <span className={`px-2 py-0.5 rounded-md text-xs font-medium ${getRoleBadgeColors(post.authorRole)}`}>
                                    {post.authorRole.charAt(0).toUpperCase() + post.authorRole.slice(1)}
                                </span>
                                <span className="text-xs text-gray-500 dark:text-gray-400">
                                    {formatDistanceToNow(post.createdAt, { addSuffix: true })}
                                </span>
                            </div>
                            <p className="text-gray-700 dark:text-gray-300 leading-relaxed">{post.content}</p>
                        </div>
                    </div>
                </div>

                {/* Comments List */}
                <div className="flex-1 overflow-y-auto p-6 space-y-4">
                    {post.comments.length === 0 ? (
                        <div className="text-center py-12">
                            <p className="text-gray-500 dark:text-gray-400">No comments yet. Be the first to comment!</p>
                        </div>
                    ) : (
                        post.comments.map((comment) => (
                            <div key={comment.commentId} className="flex gap-3">
                                <div className="w-8 h-8 bg-gradient-to-br from-gray-400 to-gray-600 rounded-full flex items-center justify-center flex-shrink-0">
                                    <span className="text-white font-semibold text-xs">{comment.authorName.charAt(0)}</span>
                                </div>
                                <div className="flex-1 bg-gray-50 dark:bg-zinc-950/50 rounded-lg p-4">
                                    <div className="flex items-center gap-2 mb-2">
                                        <span className="font-medium text-gray-900 dark:text-white text-sm">{comment.authorName}</span>
                                        <span className={`px-2 py-0.5 rounded-md text-xs font-medium ${getRoleBadgeColors(comment.authorRole)}`}>
                                            {comment.authorRole.charAt(0).toUpperCase() + comment.authorRole.slice(1)}
                                        </span>
                                        <span className="text-xs text-gray-500 dark:text-gray-400">
                                            {formatDistanceToNow(comment.createdAt, { addSuffix: true })}
                                        </span>
                                    </div>
                                    <p className="text-gray-700 dark:text-gray-300 text-sm leading-relaxed">{comment.content}</p>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {/* Add Comment Form */}
                <div className="p-6 border-t border-gray-200 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-950/50">
                    <form onSubmit={handleSubmit} className="flex gap-3">
                        <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
                            <span className="text-white font-semibold text-xs">M</span>
                        </div>
                        <div className="flex-1 flex gap-2">
                            <input
                                type="text"
                                value={newComment}
                                onChange={(e) => setNewComment(e.target.value)}
                                placeholder="Write a comment..."
                                className="flex-1 px-4 py-2 rounded-lg border border-gray-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            />
                            <button
                                type="submit"
                                disabled={!newComment.trim()}
                                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
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
