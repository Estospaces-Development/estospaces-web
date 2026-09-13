const toDataUri = (title: string, subtitle: string, accent: string) =>
    `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 400">
            <rect width="640" height="400" fill="#f8fafc" />
            <rect x="24" y="24" width="592" height="352" rx="28" fill="#ffffff" stroke="#e2e8f0" />
            <circle cx="116" cy="112" r="42" fill="${accent}" opacity="0.12" />
            <rect x="176" y="92" width="220" height="18" rx="9" fill="#0f172a" opacity="0.88" />
            <rect x="176" y="126" width="168" height="12" rx="6" fill="#64748b" opacity="0.85" />
            <rect x="72" y="208" width="496" height="92" rx="20" fill="#f8fafc" stroke="#e2e8f0" />
            <rect x="96" y="236" width="240" height="14" rx="7" fill="#94a3b8" opacity="0.9" />
            <rect x="96" y="262" width="180" height="12" rx="6" fill="#cbd5e1" />
            <text x="176" y="218" font-family="Arial, sans-serif" font-size="28" font-weight="700" fill="#0f172a">${title}</text>
            <text x="96" y="332" font-family="Arial, sans-serif" font-size="20" fill="#64748b">${subtitle}</text>
        </svg>
    `)}`;

export const PROPERTY_PLACEHOLDER_IMAGE = `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 400">
        <title>Property media unavailable</title>
        <rect width="640" height="400" fill="#f1f5f9" />
        <g transform="translate(288 132) scale(2.667)" fill="none" stroke="#64748b" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="m2 2 20 20 M9 3h10a2 2 0 0 1 2 2v10 M21 21H5a2 2 0 0 1-2-2V5 M3 16l5-5 M14 14l1-1 6 6" />
            <circle cx="15" cy="8" r="1" />
        </g>
        <text x="320" y="245" text-anchor="middle" font-family="Arial, sans-serif" font-size="34" fill="#64748b">Property media unavailable</text>
    </svg>
`)}`;
export const AGENCY_PLACEHOLDER_IMAGE = toDataUri('Estospaces', 'Agency media unavailable', '#2563eb');
