import { supabase } from '@/lib/supabase';

interface UserPropertyFilters {
    status?: string | null;
    page?: number;
    limit?: number;
    sortBy?: string;
    order?: 'asc' | 'desc';
}

export const getUserProperties = async ({
    status = null,
    page = 1,
    limit = 10,
    sortBy = 'created_at',
    order = 'desc'
}: UserPropertyFilters = {}) => {
    try {
        let query = supabase
            .from('properties')
            .select('*', { count: 'exact' });

        // Apply filters
        if (status) {
            query = query.eq('status', status);
        }

        // Apply sorting
        if (sortBy) {
            query = query.order(sortBy, { ascending: order === 'asc' });
        }

        // Apply pagination
        const from = (page - 1) * limit;
        const to = from + limit - 1;
        query = query.range(from, to);

        const { data, error, count } = await query;

        if (error) throw error;

        return {
            data,
            pagination: {
                page,
                limit,
                totalCount: count || 0,
                totalPages: Math.ceil((count || 0) / limit),
                hasNextPage: (count || 0) > to + 1,
                hasPreviousPage: page > 1
            },
            error: null
        };
    } catch (error) {
        console.error('Error fetching user properties:', error);
        return {
            data: null,
            pagination: null,
            error: {
                message: (error as Error).message || 'Failed to fetch properties'
            }
        };
    }
};
