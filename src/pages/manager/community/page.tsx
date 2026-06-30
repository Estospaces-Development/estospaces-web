"use client";

import React, { useState, useMemo, useEffect } from 'react';
import { Users, Plus } from 'lucide-react';
import BackButton from '../../../components/ui/BackButton';
import CommunityStats from '../../../components/community/CommunityStats';
import CommunityFilterBar, { SortOption } from '../../../components/community/CommunityFilterBar';
import CommunityPostCard from '../../../components/community/CommunityPostCard';
import CreatePostModal from '../../../components/community/CreatePostModal';
import CommentsModal from '../../../components/community/CommentsModal';
import {
    addComment,
    AuthorRole,
    CommunityPost,
    createCommunityPost,
    getCommunityPosts,
    PostComment,
    PostTag,
    PostVisibility,
    toggleCommunityLike,
    updateCommunityArchive,
    updateCommunityPin,
    updateCommunityVisibility,
} from '@/services/communityService';
import { useToast } from '@/contexts/ToastContext';

const normalizeCommunityPost = (post: CommunityPost): CommunityPost => ({
    ...post,
    likesCount: post.likesCount ?? 0,
    commentsCount: post.commentsCount ?? (post.comments || []).length,
    comments: post.comments || [],
    isLiked: post.isLiked ?? false,
    isPinned: post.isPinned ?? false,
    visibility: post.visibility || 'all',
    tag: post.tag || 'info',
});

const BrokersCommunity = () => {
    const toast = useToast();
    const [posts, setPosts] = useState<CommunityPost[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedTag, setSelectedTag] = useState<PostTag | 'all'>('all');
    const [selectedRole, setSelectedRole] = useState<AuthorRole | 'all'>('all');
    const [sortBy, setSortBy] = useState<SortOption>('pinned_first');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isCommentsModalOpen, setIsCommentsModalOpen] = useState(false);
    const [selectedPost, setSelectedPost] = useState<CommunityPost | null>(null);

    useEffect(() => {
        const fetchPosts = async () => {
            setLoading(true);
            const { data } = await getCommunityPosts();
            if (data && data.length > 0) {
                setPosts(data.map(normalizeCommunityPost));
            }
            setLoading(false);
        };
        fetchPosts();
    }, []);

    const stats = useMemo(() => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const urgentPostsToday = posts.filter(p => p.tag === 'urgent' && new Date(p.createdAt) >= today).length;
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
            case 'latest': sorted.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()); break;
            case 'most_active': sorted.sort((a, b) => (b.likesCount + b.commentsCount) - (a.likesCount + a.commentsCount)); break;
            case 'pinned_first': sorted.sort((a, b) => {
                if (a.isPinned && !b.isPinned) return -1;
                if (!a.isPinned && b.isPinned) return 1;
                return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
            }); break;
        }
        return sorted;
    }, [posts, selectedTag, selectedRole, sortBy]);

    const handleLike = async (postId: string) => {
        const targetPost = posts.find((post) => post.postId === postId);
        if (!targetPost) {
            return;
        }

        const { data, error } = await toggleCommunityLike(postId, !targetPost.isLiked);
        if (error || !data) {
            toast.error(error || 'Unable to update community like right now.');
            return;
        }

        setPosts((prev) => prev.map((post) => post.postId === postId ? normalizeCommunityPost(data) : post));
    };

    const handlePin = async (postId: string) => {
        const targetPost = posts.find((post) => post.postId === postId);
        if (!targetPost) {
            return;
        }

        const { data, error } = await updateCommunityPin(postId, !targetPost.isPinned);
        if (error || !data) {
            toast.error(error || 'Unable to update pinned state right now.');
            return;
        }

        setPosts((prev) => prev.map((post) => post.postId === postId ? normalizeCommunityPost(data) : post));
    };

    const handleHide = async (postId: string) => {
        const { error } = await updateCommunityArchive(postId, true);
        if (error) {
            toast.error(error || 'Unable to archive this post right now.');
            return;
        }

        setPosts((prev) => prev.filter((post) => post.postId !== postId));
    };

    const handleVisibilityChange = async (postId: string, visibility: PostVisibility | 'all' | 'brokers') => {
        const { data, error } = await updateCommunityVisibility(postId, visibility as PostVisibility);
        if (error || !data) {
            toast.error(error || 'Unable to update visibility right now.');
            return;
        }

        setPosts((prev) => prev.map((post) => post.postId === postId ? normalizeCommunityPost(data) : post));
    };

    const handleCreatePost = async (title: string, content: string, tag: PostTag, visibility: PostVisibility) => {
        const { data, error } = await createCommunityPost(title, content, tag, visibility);
        if (error || !data) {
            toast.error(error || 'Unable to create a community post right now.');
            return;
        }

        setPosts(prev => [normalizeCommunityPost(data), ...prev]);
        window.scrollTo({ top: 0, behavior: 'smooth' });
        toast.success('Community post published.');
    };

    const handleCommentClick = (post: CommunityPost) => {
        setSelectedPost(post);
        setIsCommentsModalOpen(true);
    };

    const handleAddComment = async (postId: string, content: string) => {
        const { data, error } = await addComment(postId, content);
        if (error || !data) {
            toast.error(error || 'Unable to add your comment right now.');
            return;
        }

        setPosts(prev => prev.map(post => {
            if (post.postId !== postId) {
                return post;
            }
            const comments = post.comments || [];
            return { ...post, comments: [...comments, data as PostComment], commentsCount: comments.length + 1 };
        }));
        setSelectedPost((prev: CommunityPost | null) => {
            if (!prev || prev.postId !== postId) {
                return prev;
            }
            const comments = prev.comments || [];
            return { ...prev, comments: [...comments, data as PostComment], commentsCount: comments.length + 1 };
        });
    };

    return (
        <div data-testid="community-page" className="space-y-6 animate-in fade-in duration-500 pb-20">
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
                            <p className="text-sm text-gray-800 dark:text-gray-300">Internal space for coordination, updates & deal acceleration</p>
                        </div>
                    </div>
                    <button
                        onClick={() => setIsModalOpen(true)}
                        className="flex items-center gap-2 bg-indigo-800 hover:bg-indigo-900 text-white font-semibold px-6 py-3 rounded-lg transition-all duration-200 shadow-md hover:shadow-lg"
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
                    {loading ? (
                        <div className="py-20 bg-white dark:bg-black rounded-3xl border border-dashed border-gray-300 dark:border-gray-700 flex items-center justify-center text-center px-6 text-sm font-semibold text-gray-800 dark:text-gray-300">
                            Loading community posts...
                        </div>
                    ) : filteredAndSortedPosts.length === 0 ? (
                        <div className="py-20 bg-white dark:bg-black rounded-3xl border border-dashed border-gray-300 dark:border-gray-700 flex flex-col items-center justify-center text-center px-6">
                            <div className="w-20 h-20 bg-gray-50 dark:bg-gray-900 rounded-full flex items-center justify-center mb-4">
                                <Users size={40} className="text-gray-600 dark:text-gray-300" />
                            </div>
                            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">No posts found</h3>
                            <p className="text-gray-800 dark:text-gray-300 max-w-sm">
                                {selectedTag !== 'all' || selectedRole !== 'all'
                                    ? "No community posts match your current search or filters. Try adjusting them or clear filters to see more."
                                    : "The community is currently quiet. Be the first to start a conversation by creating a new post!"}
                            </p>
                            {(selectedTag !== 'all' || selectedRole !== 'all') && (
                                <button
                                    onClick={() => {
                                        setSelectedTag('all');
                                        setSelectedRole('all');
                                    }}
                                    className="mt-6 text-orange-800 dark:text-orange-200 font-bold hover:underline"
                                >
                                    Clear all filters
                                </button>
                            )}
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
