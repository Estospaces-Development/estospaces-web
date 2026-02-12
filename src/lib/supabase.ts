
// Mock Supabase client for UI-only mode
// This replaces the actual @supabase/supabase-js client to allow building without the dependency

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// Advanced mock to handle chaining
const createMockClient = () => {
    return {
        auth: {
            getUser: async () => ({ data: { user: null }, error: null }),
            getSession: async () => ({ data: { session: null }, error: null }),
            signInWithPassword: async () => ({ data: {}, error: { message: 'Supabase is disabled in UI-only mode' } }),
            signOut: async () => ({ error: null }),
            onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => { } } } }),
            signUp: async () => ({ data: {}, error: { message: 'Supabase is disabled' } }),
        },
        from: (table: string) => {
            const queryBuilder = {
                select: (columns?: string, options?: { count?: 'exact' | 'planned' | 'estimated', head?: boolean }) => queryBuilder,
                insert: (data: any) => Promise.resolve({ data: null, error: null }),
                update: (data: any) => queryBuilder,
                delete: () => queryBuilder,
                eq: (column: string, value: any) => queryBuilder,
                neq: (column: string, value: any) => queryBuilder,
                gt: (column: string, value: any) => queryBuilder,
                lt: (column: string, value: any) => queryBuilder,
                gte: (column: string, value: any) => queryBuilder,
                lte: (column: string, value: any) => queryBuilder,
                like: (column: string, value: any) => queryBuilder,
                ilike: (column: string, value: any) => queryBuilder,
                is: (column: string, value: any) => queryBuilder,
                in: (column: string, value: any) => queryBuilder,
                contains: (column: string, value: any) => queryBuilder,
                containedBy: (column: string, value: any) => queryBuilder,
                rangeGt: (column: string, value: any) => queryBuilder,
                rangeLt: (column: string, value: any) => queryBuilder,
                rangeGte: (column: string, value: any) => queryBuilder,
                rangeLte: (column: string, value: any) => queryBuilder,
                rangeAdjacent: (column: string, value: any) => queryBuilder,
                overlaps: (column: string, value: any) => queryBuilder,
                textSearch: (column: string, value: any) => queryBuilder,
                match: (column: string, value: any) => queryBuilder,
                not: (column: string, operator: string, value: any) => queryBuilder,
                or: (filters: string) => queryBuilder,
                filter: (column: string, operator: string, value: any) => queryBuilder,
                order: (column: string, options?: any) => queryBuilder,
                limit: (count: number) => queryBuilder,
                range: (from: number, to: number) => queryBuilder,
                abortSignal: (signal: AbortSignal) => queryBuilder,
                single: async () => ({ data: null, error: null }),
                maybeSingle: async () => ({ data: null, error: null }),
                csv: async () => ({ data: null, error: null }),
                then: (onfulfilled?: ((value: any) => any) | null, onrejected?: ((reason: any) => any) | null) => Promise.resolve({ data: [], error: null }).then(onfulfilled, onrejected),
            };
            return queryBuilder;
        },
        storage: {
            from: (bucket: string) => ({
                upload: async (path: string, file: any) => ({ data: null, error: null }),
                download: async (path: string) => ({ data: null, error: null }),
                list: async (path?: string) => ({ data: [], error: null }),
                getPublicUrl: (path: string) => ({ data: { publicUrl: '' } }),
                remove: async (paths: string[]) => ({ data: [], error: null }),
            })
        },
        functions: {
            invoke: async (functionName: string, options?: any) => ({ data: null, error: null }),
        },
        realtime: {
            channel: (topic: string) => ({
                on: () => ({ subscribe: () => { } }),
                subscribe: () => { },
                unsubscribe: () => { },
            })
        }
    };
};

export const supabase = createMockClient();

// Explicitly export specific types that might be used elsewhere to avoid import errors
// If other files import specific types, we might need to export empy interfaces/types
// However, since we removed the import from `supabase-js`, we can't export types FROM it.
// Files importing types from `@supabase/supabase-js` directly will still fail, but we found none.

export const isSupabaseAvailable = false;
