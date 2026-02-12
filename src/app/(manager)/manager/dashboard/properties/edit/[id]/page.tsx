"use client";

import React from 'react';
import AddPropertyPage from '../../add/page';

export default function EditPropertyPage({ params }: { params: Promise<{ id: string }> }) {
    const resolvedParams = React.use(params);
    return <AddPropertyPage params={resolvedParams} />;
}
