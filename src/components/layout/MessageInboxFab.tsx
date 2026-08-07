"use client";

import { MessageSquare } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useMessages } from '@/contexts/MessagesContext';

export function shouldHideMessageInboxFab(pathname: string) {
    return pathname.startsWith('/user/dashboard/messages')
        || pathname.startsWith('/user/dashboard/fast-track')
        || pathname.startsWith('/user/dashboard/help')
        || pathname === '/user/applications'
        || pathname.startsWith('/user/properties/');
}

export default function MessageInboxFab() {
    const navigate = useNavigate();
    const location = useLocation();
    const { totalUnreadCount } = useMessages();
    const hideOnContextualWorkspace = shouldHideMessageInboxFab(location.pathname);

    if (hideOnContextualWorkspace) {
        return null;
    }

    return (
        <button
            type="button"
            onClick={() => navigate('/user/dashboard/messages')}
            className="fixed bottom-6 right-6 z-40 inline-flex items-center gap-3 rounded-full bg-orange-500 px-5 py-3 text-sm font-semibold text-white shadow-sm transition-all hover:scale-[1.02] hover:bg-orange-600 hover:shadow-xl hover:shadow-orange-500/30"
            aria-label="Open messages"
        >
            <div className="relative">
                <MessageSquare className="h-5 w-5" />
                {totalUnreadCount > 0 && (
                    <span className="absolute -right-2 -top-2 inline-flex min-h-5 min-w-5 items-center justify-center rounded-full bg-white px-1 text-[10px] font-bold text-orange-600">
                        {totalUnreadCount > 99 ? '99+' : totalUnreadCount}
                    </span>
                )}
            </div>
            <span>{totalUnreadCount > 0 ? 'Open Messages' : 'Messages'}</span>
        </button>
    );
}
