"use client";

import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { PostTag, PostVisibility } from '@/services/communityService';

interface CreatePostModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (title: string, content: string, tag: PostTag, visibility: PostVisibility) => void;
}

const CreatePostModal: React.FC<CreatePostModalProps> = ({ isOpen, onClose, onSubmit }) => {
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [tag, setTag] = useState<PostTag>('info');
    const [visibility, setVisibility] = useState<PostVisibility>('all');
    const [errors, setErrors] = useState<{ title?: string; content?: string; tag?: string }>({});

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const newErrors: { title?: string; content?: string; tag?: string } = {};
        if (!title.trim()) newErrors.title = 'Title is required';
        if (!content.trim()) newErrors.content = 'Content is required';
        if (!tag) newErrors.tag = 'Tag is required';

        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors);
            return;
        }

        onSubmit(title.trim(), content.trim(), tag, visibility);
        setTitle('');
        setContent('');
        setTag('info');
        setVisibility('all');
        setErrors({});
        onClose();
    };

    const handleClose = () => {
        setTitle('');
        setContent('');
        setTag('info');
        setVisibility('all');
        setErrors({});
        onClose();
    };

    if (!isOpen) return null;

    return createPortal(
        <div className="fixed inset-0 z-[9999] overflow-y-auto bg-black/50 p-3 backdrop-blur-sm animate-in fade-in duration-200 sm:p-4">
            <div className="flex min-h-full items-start justify-center py-4 sm:items-center">
            <div
                role="dialog"
                aria-modal="true"
                aria-labelledby="create-post-title"
                className="flex max-h-[calc(100vh-2rem)] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-2xl animate-in zoom-in-95 duration-200 dark:border-zinc-800 dark:bg-zinc-900"
            >
                {/* Header */}
                <div className="flex shrink-0 items-center justify-between border-b border-gray-100 p-5 dark:border-zinc-800 sm:p-6">
                    <h2 id="create-post-title" className="text-2xl font-bold text-gray-900 dark:text-white">Create New Post</h2>
                    <button type="button" aria-label="Close create post" onClick={handleClose} className="p-2 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-lg transition-colors">
                        <X className="w-5 h-5 text-gray-800 dark:text-gray-300" />
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
                    <div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-5 sm:p-6">
                    <div>
                        <label htmlFor="post-title" className="block text-sm font-semibold text-gray-900 dark:text-gray-200 mb-2">
                            Title <span className="text-red-500">*</span>
                        </label>
                        <input
                            id="post-title"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="Add a clear post title"
                            maxLength={120}
                            aria-invalid={errors.title ? 'true' : 'false'}
                            aria-describedby={errors.title ? 'post-title-error' : undefined}
                            className={`w-full rounded-lg border px-4 py-3 text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-zinc-800 dark:text-white dark:placeholder-gray-400 ${errors.title ? 'border-red-500' : 'border-gray-300 dark:border-zinc-700'}`}
                        />
                        {errors.title && <p id="post-title-error" role="alert" className="mt-1 text-sm font-medium text-red-700 dark:text-red-300">{errors.title}</p>}
                    </div>
                    <div>
                        <label htmlFor="content" className="block text-sm font-semibold text-gray-900 dark:text-gray-200 mb-2">
                            Content <span className="text-red-500">*</span>
                        </label>
                        <textarea
                            id="content"
                            value={content}
                            onChange={(e) => setContent(e.target.value)}
                            placeholder="Share updates, deals, or important information with the community..."
                            rows={5}
                            maxLength={4000}
                            aria-invalid={errors.content ? 'true' : 'false'}
                            aria-describedby={errors.content ? 'post-content-error' : undefined}
                            className={`w-full px-4 py-3 rounded-lg border ${errors.content ? 'border-red-500' : 'border-gray-300 dark:border-zinc-700'} bg-white dark:bg-zinc-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500`}
                        />
                        {errors.content && <p id="post-content-error" role="alert" className="mt-1 text-sm font-medium text-red-700 dark:text-red-300">{errors.content}</p>}
                    </div>

                    <div>
                        <label className="block text-sm font-semibold text-gray-900 dark:text-gray-200 mb-2">
                            Tag <span className="text-red-500">*</span>
                        </label>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                            {([
                                { value: 'urgent' as PostTag, label: 'Urgent' },
                                { value: 'deal' as PostTag, label: 'Deal' },
                                { value: 'announcement' as PostTag, label: 'Announcement' },
                                { value: 'info' as PostTag, label: 'Info' },
                            ]).map((tagOption) => (
                                <button
                                    key={tagOption.value}
                                    type="button"
                                    onClick={() => setTag(tagOption.value)}
                                    aria-pressed={tag === tagOption.value}
                                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${tag === tagOption.value
                                        ? 'bg-indigo-800 text-white shadow-md'
                                        : 'bg-gray-100 dark:bg-zinc-800 text-gray-900 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-zinc-700'
                                        }`}
                                >
                                    {tagOption.label}
                                </button>
                            ))}
                        </div>
                        {errors.tag && <p role="alert" className="mt-1 text-sm font-medium text-red-700 dark:text-red-300">{errors.tag}</p>}
                    </div>

                    <div>
                        <label htmlFor="visibility" className="block text-sm font-semibold text-gray-900 dark:text-gray-200 mb-2">Visibility</label>
                        <select
                            id="visibility"
                            value={visibility}
                            onChange={(e) => setVisibility(e.target.value as PostVisibility)}
                            className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        >
                            <option value="all">All (Managers & Brokers)</option>
                            <option value="managers">Managers Only</option>
                            <option value="brokers">Brokers Only</option>
                        </select>
                    </div>
                    </div>

                    <div className="flex shrink-0 flex-col-reverse gap-3 border-t border-gray-100 p-4 dark:border-zinc-800 sm:flex-row sm:items-center sm:justify-end">
                        <button type="button" onClick={handleClose} className="px-6 py-3 bg-gray-200 dark:bg-zinc-800 text-gray-900 dark:text-gray-200 font-medium rounded-lg hover:bg-gray-300 dark:hover:bg-zinc-700 transition-colors duration-200">
                            Cancel
                        </button>
                        <button type="submit" className="bg-indigo-800 hover:bg-indigo-900 text-white font-semibold py-3 px-6 rounded-lg transition-colors duration-200 shadow-md hover:shadow-lg">
                            Post to Community
                        </button>
                    </div>
                </form>
            </div>
            </div>
        </div>,
        document.body
    );
};

export default CreatePostModal;
