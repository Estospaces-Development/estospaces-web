import { apiFetch, getErrorMessage, getServiceUrl } from '@/lib/apiUtils';

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
    category?: string;
    title?: string;
    content: string;
    createdAt: string;
    likesCount: number;
    commentsCount: number;
    tags?: string[];
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
        return { data: [], error: getErrorMessage(error) };
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
        return { data: null, error: getErrorMessage(error) };
    }
};

export const createCommunityPost = async (content: string, tag: PostTag, visibility: PostVisibility) => {
    try {
        const data = await apiFetch<CommunityPost>(`${CORE_URL()}/api/v1/community/posts`, {
            method: 'POST',
            body: JSON.stringify({ content, tag, visibility }),
        });
        return { data, error: null };
    } catch (error: any) {
        return { data: null, error: getErrorMessage(error) };
    }
};

export const toggleCommunityLike = async (postId: string, liked: boolean) => {
    try {
        const data = await apiFetch<CommunityPost>(`${CORE_URL()}/api/v1/community/posts/${postId}/like`, {
            method: 'POST',
            body: JSON.stringify({ liked }),
        });
        return { data, error: null };
    } catch (error: any) {
        return { data: null, error: getErrorMessage(error) };
    }
};

export const updateCommunityPin = async (postId: string, isPinned: boolean) => {
    try {
        const data = await apiFetch<CommunityPost>(`${CORE_URL()}/api/v1/community/posts/${postId}/pin`, {
            method: 'PUT',
            body: JSON.stringify({ is_pinned: isPinned }),
        });
        return { data, error: null };
    } catch (error: any) {
        return { data: null, error: getErrorMessage(error) };
    }
};

export const updateCommunityArchive = async (postId: string, archived: boolean) => {
    try {
        const data = await apiFetch<CommunityPost>(`${CORE_URL()}/api/v1/community/posts/${postId}/archive`, {
            method: 'PUT',
            body: JSON.stringify({ archived }),
        });
        return { data, error: null };
    } catch (error: any) {
        return { data: null, error: getErrorMessage(error) };
    }
};

export const updateCommunityVisibility = async (postId: string, visibility: PostVisibility) => {
    try {
        const data = await apiFetch<CommunityPost>(`${CORE_URL()}/api/v1/community/posts/${postId}/visibility`, {
            method: 'PUT',
            body: JSON.stringify({ visibility }),
        });
        return { data, error: null };
    } catch (error: any) {
        return { data: null, error: getErrorMessage(error) };
    }
};
