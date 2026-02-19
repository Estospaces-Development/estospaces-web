/// <reference types="vite/client" />

interface ImportMetaEnv {
    readonly VITE_CORE_SERVICE_URL: string;
    readonly VITE_BOOKING_SERVICE_URL: string;
    readonly VITE_NOTIFICATION_SERVICE_URL: string;
    readonly VITE_PAYMENT_SERVICE_URL: string;
    readonly VITE_SEARCH_SERVICE_URL: string;
    readonly VITE_MEDIA_SERVICE_URL: string;
    readonly VITE_SUPABASE_URL: string;
    readonly VITE_SUPABASE_ANON_KEY: string;
}

interface ImportMeta {
    readonly env: ImportMetaEnv;
}
