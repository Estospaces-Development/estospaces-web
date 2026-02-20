import React from 'react';
import { Filter, SortAsc } from 'lucide-react';
import { PostTag, AuthorRole } from '../../mocks/communityPosts';

export type SortOption = 'latest' | 'most_active' | 'pinned_first';

interface CommunityFilterBarProps {
    selectedTag: PostTag | 'all';
    selectedRole: AuthorRole | 'all';
    sortBy: SortOption;
    onTagChange: (tag: PostTag | 'all') => void;
    onRoleChange: (role: AuthorRole | 'all') => void;
    onSortChange: (sort: SortOption) => void;
}

const CommunityFilterBar: React.FC<CommunityFilterBarProps> = ({
    selectedTag,
    selectedRole,
    sortBy,
    onTagChange,
    onRoleChange,
    onSortChange,
}) => {
    const tags: Array<{ value: PostTag | 'all'; label: string }> = [
        { value: 'all', label: 'All Tags' },
        { value: 'urgent', label: 'Urgent' },
        { value: 'deal', label: 'Deal' },
        { value: 'announcement', label: 'Announcement' },
        { value: 'info', label: 'Info' },
    ];

    const roles: Array<{ value: AuthorRole | 'all'; label: string }> = [
        { value: 'all', label: 'All Roles' },
        { value: 'manager', label: 'Managers' },
        { value: 'broker', label: 'Brokers' },
    ];

    const sortOptions: Array<{ value: SortOption; label: string }> = [
        { value: 'latest', label: 'Latest' },
        { value: 'most_active', label: 'Most Active' },
        { value: 'pinned_first', label: 'Pinned First' },
    ];

    return (
        <div className="bg-white dark:bg-black rounded-xl p-4 shadow-sm border border-gray-200 dark:border-zinc-800">
            <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
                {/* Tag Filter */}
                <div className="flex items-center gap-3 flex-wrap">
                    <div className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                        <Filter className="w-4 h-4" />
                        <span>Filter:</span>
                    </div>
                    <div className="flex gap-2 flex-wrap">
                        {tags.map((tag) => (
                            <button
                                key={tag.value}
                                onClick={() => onTagChange(tag.value)}
                                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 ${selectedTag === tag.value
                                    ? 'bg-indigo-600 text-white shadow-md'
                                    : 'bg-gray-100 dark:bg-zinc-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-zinc-700'
                                    }`}
                            >
                                {tag.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Role & Sort */}
                <div className="flex items-center gap-2">
                    <select
                        value={selectedRole}
                        onChange={(e) => onRoleChange(e.target.value as AuthorRole | 'all')}
                        className="px-3 py-2 rounded-lg border border-gray-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-sm text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                        {roles.map((role) => (
                            <option key={role.value} value={role.value}>{role.label}</option>
                        ))}
                    </select>

                    <div className="flex items-center gap-2">
                        <SortAsc className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                        <select
                            value={sortBy}
                            onChange={(e) => onSortChange(e.target.value as SortOption)}
                            className="px-3 py-2 rounded-lg border border-gray-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-sm text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        >
                            {sortOptions.map((option) => (
                                <option key={option.value} value={option.value}>{option.label}</option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CommunityFilterBar;
