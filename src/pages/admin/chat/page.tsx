"use client";

import React from 'react';
import { Navigate, useSearchParams } from 'react-router-dom';

export default function AdminChatCompatibilityPage() {
    const [searchParams] = useSearchParams();
    const next = new URLSearchParams(searchParams);
    const query = next.toString();

    return <Navigate replace to={`/admin/help${query ? `?${query}` : ''}`} />;
}
