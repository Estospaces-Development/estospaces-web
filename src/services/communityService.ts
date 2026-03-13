import { apiFetch, getServiceUrl } from '@/lib/apiUtils';

const CORE_URL = () => getServiceUrl('core');

export type AuthorRole = 'manager' | 'tenant' | 'admin' | 'broker';
export type PostTag = 'announcement' | 'update' | 'event' | 'maintenance' | 'general' | 'discussion' | 'urgent' | 'deal' | 'info';
export type PostVisibility = 'public' | 'tenants' | 'managers' | 'brokers' | 'private' | 'all';

export interface PostComment {
    commentId: string;
    postId: string;
    authorId: string;
    authorName: string;
    authorRole: AuthorRole;
    content: string;
    createdAt: string;
}

export interface CommunityPost {
    postId: string;
    authorId: string;
    authorName: string;
    authorRole: AuthorRole;
    category: string;
    title: string;
    content: string;
    createdAt: string;
    likesCount: number;
    commentsCount: number;
    tags: string[];
    tag: PostTag; // Primary tag for UI
    isLiked: boolean;
    isPinned?: boolean;
    visibility: PostVisibility | 'all' | 'brokers';
    comments: PostComment[];
}

export const getCommunityPosts = async (category?: string) => {
    try {
        const url = `${CORE_URL()}/api/v1/community/posts${category ? `?category=${category}` : ''}`;
        const data = await apiFetch<CommunityPost[]>(url);
        return { data: data || [], error: null };
    } catch (error: any) {
        console.error('[communityService] getCommunityPosts error:', error.message);
        return { data: [], error: error.message };
    }
};

export const addComment = async (postId: string, content: string) => {
    try {
        const data = await apiFetch<PostComment>(`${CORE_URL()}/api/v1/community/posts/${postId}/comments`, {
            method: 'POST',
            body: JSON.stringify({ content })
        });
        return { data, error: null };
    } catch (error: any) {
        console.error('[communityService] addComment error:', error.message);
        return { data: null, error: error.message };
    }
};
