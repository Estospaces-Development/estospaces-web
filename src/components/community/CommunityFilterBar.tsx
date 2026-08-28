import React from 'react';
import { Filter, SortAsc } from 'lucide-react';
import { PostTag, AuthorRole } from '@/services/communityService';

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
        <div className="min-w-0 rounded-xl border border-gray-100 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-black">
            <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
                {/* Tag Filter */}
                <div className="flex min-w-0 flex-wrap items-center gap-3">
                    <div className="flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-gray-200">
                        <Filter className="w-4 h-4" />
                        <span>Filter:</span>
                    </div>
                    <div className="flex min-w-0 flex-wrap gap-2">
                        {tags.map((tag) => (
                            <button
                                key={tag.value}
                                onClick={() => onTagChange(tag.value)}
                                aria-pressed={selectedTag === tag.value}
                                aria-label={`Filter community posts by ${tag.label}`}
                                className={`min-h-11 rounded-lg px-3 py-1.5 text-xs font-medium transition-all duration-200 ${selectedTag === tag.value
                                    ? 'bg-indigo-800 text-white shadow-md'
                                    : 'bg-gray-100 dark:bg-zinc-800 text-gray-900 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-zinc-700'
                                    }`}
                            >
                                {tag.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Role & Sort */}
                <div className="grid w-full min-w-0 grid-cols-1 gap-2 min-[360px]:grid-cols-2 lg:flex lg:w-auto lg:items-center">
                    <select
                        aria-label="Filter community posts by author role"
                        value={selectedRole}
                        onChange={(e) => onRoleChange(e.target.value as AuthorRole | 'all')}
                        className="min-h-11 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-gray-200"
                    >
                        {roles.map((role) => (
                            <option key={role.value} value={role.value}>{role.label}</option>
                        ))}
                    </select>

                    <div className="flex min-w-0 items-center gap-2">
                        <SortAsc className="w-4 h-4 text-gray-800 dark:text-gray-300" />
                        <select
                            aria-label="Sort community posts"
                            value={sortBy}
                            onChange={(e) => onSortChange(e.target.value as SortOption)}
                            className="min-h-11 min-w-0 flex-1 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-gray-200"
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
