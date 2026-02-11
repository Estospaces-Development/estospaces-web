"use client";

import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { PostTag, PostVisibility } from '../../mocks/communityPosts';

interface CreatePostModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (content: string, tag: PostTag, visibility: PostVisibility) => void;
}

const CreatePostModal: React.FC<CreatePostModalProps> = ({ isOpen, onClose, onSubmit }) => {
    const [content, setContent] = useState('');
    const [tag, setTag] = useState<PostTag>('info');
    const [visibility, setVisibility] = useState<PostVisibility>('all');
    const [errors, setErrors] = useState<{ content?: string; tag?: string }>({});

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const newErrors: { content?: string; tag?: string } = {};
        if (!content.trim()) newErrors.content = 'Content is required';
        if (!tag) newErrors.tag = 'Tag is required';

        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors);
            return;
        }

        onSubmit(content, tag, visibility);
        setContent('');
        setTag('info');
        setVisibility('all');
        setErrors({});
        onClose();
    };

    const handleClose = () => {
        setContent('');
        setTag('info');
        setVisibility('all');
        setErrors({});
        onClose();
    };

    if (!isOpen) return null;

    return createPortal(
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[9999] flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto border border-gray-200 dark:border-zinc-800 animate-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-zinc-800">
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Create New Post</h2>
                    <button onClick={handleClose} className="p-2 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-lg transition-colors">
                        <X className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                    <div>
                        <label htmlFor="content" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Content <span className="text-red-500">*</span>
                        </label>
                        <textarea
                            id="content"
                            value={content}
                            onChange={(e) => setContent(e.target.value)}
                            placeholder="Share updates, deals, or important information with the community..."
                            rows={6}
                            className={`w-full px-4 py-3 rounded-lg border ${errors.content ? 'border-red-500' : 'border-gray-300 dark:border-zinc-700'} bg-white dark:bg-zinc-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500`}
                        />
                        {errors.content && <p className="mt-1 text-sm text-red-500">{errors.content}</p>}
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
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
                                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${tag === tagOption.value
                                        ? 'bg-indigo-600 text-white shadow-md'
                                        : 'bg-gray-100 dark:bg-zinc-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-zinc-700'
                                        }`}
                                >
                                    {tagOption.label}
                                </button>
                            ))}
                        </div>
                        {errors.tag && <p className="mt-1 text-sm text-red-500">{errors.tag}</p>}
                    </div>

                    <div>
                        <label htmlFor="visibility" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Visibility</label>
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

                    <div className="flex items-center gap-3 pt-4">
                        <button type="submit" className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-3 px-6 rounded-lg transition-colors duration-200 shadow-md hover:shadow-lg">
                            Post to Community
                        </button>
                        <button type="button" onClick={handleClose} className="px-6 py-3 bg-gray-200 dark:bg-zinc-800 text-gray-700 dark:text-gray-300 font-medium rounded-lg hover:bg-gray-300 dark:hover:bg-zinc-700 transition-colors duration-200">
                            Cancel
                        </button>
                    </div>
                </form>
            </div>
        </div>,
        document.body
    );
};

export default CreatePostModal;
