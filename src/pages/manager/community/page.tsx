"use client";

import React, { useState, useMemo } from 'react';
import { Users, Plus } from 'lucide-react';
import BackButton from '../../../components/ui/BackButton';
import CommunityStats from '../../../components/community/CommunityStats';
import CommunityFilterBar, { SortOption } from '../../../components/community/CommunityFilterBar';
import CommunityPostCard from '../../../components/community/CommunityPostCard';
import CreatePostModal from '../../../components/community/CreatePostModal';
import CommentsModal from '../../../components/community/CommentsModal';
import { communityPosts, CommunityPost, PostTag, AuthorRole, PostVisibility, Comment } from '../../../mocks/communityPosts';

const BrokersCommunity = () => {
    const [posts, setPosts] = useState<CommunityPost[]>(communityPosts);
    const [selectedTag, setSelectedTag] = useState<PostTag | 'all'>('all');
    const [selectedRole, setSelectedRole] = useState<AuthorRole | 'all'>('all');
    const [sortBy, setSortBy] = useState<SortOption>('pinned_first');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isCommentsModalOpen, setIsCommentsModalOpen] = useState(false);
    const [selectedPost, setSelectedPost] = useState<CommunityPost | null>(null);

    const stats = useMemo(() => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const urgentPostsToday = posts.filter(p => p.tag === 'urgent' && p.createdAt >= today).length;
        const dealsShared = posts.filter(p => p.tag === 'deal').length;
        const uniqueBrokers = new Set(posts.filter(p => p.authorRole === 'broker').map(p => p.authorName)).size;
        return { totalPosts: posts.length, activeBrokers: uniqueBrokers, urgentPostsToday, dealsShared };
    }, [posts]);

    const filteredAndSortedPosts = useMemo(() => {
        let filtered = posts;
        if (selectedTag !== 'all') filtered = filtered.filter(p => p.tag === selectedTag);
        if (selectedRole !== 'all') filtered = filtered.filter(p => p.authorRole === selectedRole);

        const sorted = [...filtered];
        switch (sortBy) {
            case 'latest': sorted.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()); break;
            case 'most_active': sorted.sort((a, b) => (b.likesCount + b.commentsCount) - (a.likesCount + a.commentsCount)); break;
            case 'pinned_first': sorted.sort((a, b) => {
                if (a.isPinned && !b.isPinned) return -1;
                if (!a.isPinned && b.isPinned) return 1;
                return b.createdAt.getTime() - a.createdAt.getTime();
            }); break;
        }
        return sorted;
    }, [posts, selectedTag, selectedRole, sortBy]);

    const handleLike = (postId: string) => {
        setPosts(prev => prev.map(p => p.postId === postId ? { ...p, likesCount: p.likesCount + 1 } : p));
    };

    const handlePin = (postId: string) => {
        setPosts(prev => prev.map(p => p.postId === postId ? { ...p, isPinned: !p.isPinned } : p));
    };

    const handleHide = (postId: string) => {
        setPosts(prev => prev.filter(p => p.postId !== postId));
    };

    const handleVisibilityChange = (postId: string, visibility: PostVisibility) => {
        setPosts(prev => prev.map(p => p.postId === postId ? { ...p, visibility } : p));
    };

    const handleCreatePost = (content: string, tag: PostTag, visibility: PostVisibility) => {
        const newPost: CommunityPost = {
            postId: `post-${Date.now()}`,
            authorName: 'Current Manager',
            authorRole: 'manager',
            content,
            tag,
            createdAt: new Date(),
            likesCount: 0,
            commentsCount: 0,
            comments: [],
            isPinned: false,
            visibility,
        };
        setPosts(prev => [newPost, ...prev]);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleCommentClick = (post: CommunityPost) => {
        setSelectedPost(post);
        setIsCommentsModalOpen(true);
    };

    const handleAddComment = (postId: string, content: string) => {
        const newComment: Comment = {
            commentId: `comment-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            authorName: 'Current Manager',
            authorRole: 'manager',
            content,
            createdAt: new Date(),
        };
        setPosts(prev => prev.map(p => {
            if (p.postId === postId) {
                return { ...p, comments: [...p.comments, newComment], commentsCount: p.commentsCount + 1 };
            }
            return p;
        }));
        setSelectedPost((prev: CommunityPost | null) => {
            if (prev && prev.postId === postId) {
                return { ...prev, comments: [...prev.comments, newComment], commentsCount: prev.commentsCount + 1 };
            }
            return prev;
        });
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500 pb-20">
            {/* Header */}
            <div className="flex flex-col gap-2">
                <BackButton />
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-gradient-to-br from-orange-500 to-red-600 rounded-xl shadow-lg shadow-orange-500/20">
                            <Users className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Brokers Community</h1>
                            <p className="text-sm text-gray-500 dark:text-gray-400">Internal space for coordination, updates & deal acceleration</p>
                        </div>
                    </div>
                    <button
                        onClick={() => setIsModalOpen(true)}
                        className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium px-6 py-3 rounded-lg transition-all duration-200 shadow-md hover:shadow-lg"
                    >
                        <Plus className="w-5 h-5" />
                        <span>Create Post</span>
                    </button>
                </div>

                <CommunityStats
                    totalPosts={stats.totalPosts}
                    activeBrokers={stats.activeBrokers}
                    urgentPostsToday={stats.urgentPostsToday}
                    dealsShared={stats.dealsShared}
                />

                <CommunityFilterBar
                    selectedTag={selectedTag}
                    selectedRole={selectedRole}
                    sortBy={sortBy}
                    onTagChange={setSelectedTag}
                    onRoleChange={setSelectedRole}
                    onSortChange={setSortBy}
                />

                <div className="space-y-4">
                    {filteredAndSortedPosts.length === 0 ? (
                        <div className="bg-white dark:bg-black rounded-xl p-12 text-center border border-gray-200 dark:border-zinc-800">
                            <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No posts found</h3>
                            <p className="text-gray-500 dark:text-gray-400">Try adjusting your filters or be the first to create a post!</p>
                        </div>
                    ) : (
                        filteredAndSortedPosts.map(post => (
                            <CommunityPostCard
                                key={post.postId}
                                post={post}
                                isManager={true}
                                onLike={handleLike}
                                onPin={handlePin}
                                onHide={handleHide}
                                onVisibilityChange={handleVisibilityChange}
                                onCommentClick={handleCommentClick}
                            />
                        ))
                    )}
                </div>

                <CreatePostModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onSubmit={handleCreatePost} />
                <CommentsModal
                    isOpen={isCommentsModalOpen}
                    post={selectedPost}
                    onClose={() => { setIsCommentsModalOpen(false); setSelectedPost(null); }}
                    onAddComment={handleAddComment}
                />
            </div>
        </div>
    );
};

export default BrokersCommunity;
