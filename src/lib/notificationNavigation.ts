import { buildWorkspacePath } from '@/lib/workspaceLinks';
import { buildManagerFastTrackRequestPath } from '@/lib/managerFastTrackRequestNavigation';

type NotificationNavigationData = Record<string, any> | null | undefined;

const readString = (data: NotificationNavigationData, ...keys: string[]) => {
    for (const key of keys) {
        const value = data?.[key];
        if (typeof value === 'string' && value.trim()) {
            return value;
        }
    }

    return '';
};

const readNestedPathId = (path: string, basePath: string) => {
    const pathWithoutQuery = path.split(/[?#]/)[0];
    if (!pathWithoutQuery.startsWith(`${basePath}/`)) {
        return '';
    }

    const rawId = pathWithoutQuery.slice(basePath.length + 1).split('/')[0];
    if (!rawId) {
        return '';
    }

    try {
        return decodeURIComponent(rawId);
    } catch {
        return rawId;
    }
};

const buildSupportPath = (basePath: string, ticketId: string, conversationId: string) => {
    const params = new URLSearchParams({
        ...(ticketId ? { ticket: ticketId } : {}),
        ...(conversationId ? { conversation: conversationId } : {}),
    });
    const query = params.toString();
    return query ? `${basePath}?${query}` : basePath;
};

const buildAdminPropertyRegistryNotificationPath = (
    data: NotificationNavigationData,
    propertyId: string,
    targetPath: string,
) => {
    const propertyTitle = readString(data, 'property_title', 'propertyTitle');
    const resolvedPropertyId = propertyId || readNestedPathId(targetPath, '/admin/properties');
    const search = propertyTitle || resolvedPropertyId;

    if (!search) {
        return '/admin/properties';
    }

    return `/admin/properties?${new URLSearchParams({ search }).toString()}`;
};

const isPathOrNestedPath = (path: string, basePath: string) => (
    path === basePath
    || path.startsWith(`${basePath}?`)
    || path.startsWith(`${basePath}/`)
    || path.startsWith(`${basePath}#`)
);

const WORKSPACE_BASE_PATHS = [
    '/user/dashboard/viewings',
    '/user/dashboard/appointments',
    '/user/applications',
    '/user/dashboard/fast-track',
    '/user/dashboard/case-file',
    '/user/dashboard/contracts',
    '/manager/appointments',
    '/manager/applications',
    '/manager/fast-track',
    '/manager/case-files',
    '/manager/contracts',
] as const;

const LEGACY_ID_KEY_MAP: Record<string, string> = {
    applicationId: 'application',
    application_id: 'application',
    viewingId: 'viewing',
    viewing_id: 'viewing',
    contractId: 'contract',
    contract_id: 'contract',
    caseId: 'case',
    case_id: 'case',
    leadId: 'lead',
    lead_id: 'lead',
    propertyId: 'property',
    property_id: 'property',
    fastTrackId: 'case',
    fast_track_id: 'case',
    invoiceId: 'invoice',
    invoice_id: 'invoice',
    paymentId: 'payment',
    payment_id: 'payment',
    progressionId: 'progression',
    progression_id: 'progression',
    conversationId: 'conversation',
    conversation_id: 'conversation',
    ticketId: 'ticket',
    ticket_id: 'ticket',
};

const normalizeTargetPath = (
    targetPath: string,
    data: NotificationNavigationData,
): string => {
    const [pathWithoutQuery, ...rest] = targetPath.split('?');
    if (!rest.length) {
        return targetPath;
    }

    const queryString = rest.join('?');
    const hashIndex = queryString.indexOf('#');
    const cleanQuery = hashIndex >= 0 ? queryString.slice(0, hashIndex) : queryString;
    const hash = hashIndex >= 0 ? queryString.slice(hashIndex) : '';

    if (!pathWithoutQuery) {
        return targetPath;
    }

    const normalizedPath = pathWithoutQuery.replace(/\/+$/, '');
    const isWorkspacePath = WORKSPACE_BASE_PATHS.some(
        (basePath) => isPathOrNestedPath(normalizedPath, basePath),
    );

    if (!isWorkspacePath) {
        return targetPath;
    }

    let params: URLSearchParams;
    try {
        params = new URLSearchParams(cleanQuery);
    } catch {
        return targetPath;
    }

    const rewritten = new URLSearchParams();
    const seen = new Set<string>();
    params.forEach((value, key) => {
        const canonicalKey = LEGACY_ID_KEY_MAP[key] || key;
        if (!seen.has(canonicalKey)) {
            rewritten.set(canonicalKey, value);
            seen.add(canonicalKey);
        }
    });

    const dataOverrides: Record<string, string> = {
        application: data?.applicationId || data?.application_id || '',
        viewing: data?.viewingId || data?.viewing_id || '',
        contract: data?.contractId || data?.contract_id || '',
        case: data?.caseId || data?.case_id || data?.fastTrackId || data?.fast_track_id || '',
        lead: data?.leadId || data?.lead_id || '',
        property: data?.propertyId || data?.property_id || '',
    };

    Object.entries(dataOverrides).forEach(([key, value]) => {
        if (value && !rewritten.has(key)) {
            rewritten.set(key, value);
        }
    });

    const finalQuery = rewritten.toString();
    return finalQuery ? `${normalizedPath}?${finalQuery}${hash}` : `${normalizedPath}${hash}`;
};

export function getNotificationNavigationPath(
    notification: { type: string; data?: NotificationNavigationData },
    role: string = 'user',
): string | null {
    const notificationRole = role === 'broker' ? 'manager' : role;
    const data = notification.data;
    const targetPath = readString(data, 'target_path', 'targetPath');

    const conversationID = readString(data, 'conversation_id', 'conversationId');
    const ticketId = readString(data, 'ticket_id', 'ticketId');
    const applicationId = readString(data, 'applicationId', 'application_id');
    const viewingId = readString(data, 'viewingId', 'viewing_id');
    const contractId = readString(data, 'contractId', 'contract_id');
    const subjectUserId = readString(data, 'subject_user_id', 'subjectUserId', 'userId', 'user_id');
    const clientId = readString(data, 'client_id', 'clientId');
    const fastTrackCaseId = readString(data, 'fast_track_id', 'fastTrackId', 'caseId', 'case_id');
    const leadId = readString(data, 'leadId', 'lead_id');
    const brokerRequestId = readString(data, 'brokerRequestId', 'broker_request_id');
    const propertyId = readString(data, 'propertyId', 'property_id');
    const userFastTrackPath = buildWorkspacePath('/user/dashboard/fast-track', {
        applicationId,
        caseId: fastTrackCaseId,
        leadId,
        propertyId,
    });
    const managerFastTrackPath = buildWorkspacePath('/manager/fast-track', {
        applicationId,
        caseId: fastTrackCaseId,
        leadId,
        propertyId,
    });
    const userApplicationsPath = buildWorkspacePath('/user/applications', {
        applicationId,
        caseId: fastTrackCaseId,
        leadId,
        propertyId,
    });
    const managerApplicationsPath = buildWorkspacePath('/manager/applications', {
        applicationId,
        caseId: fastTrackCaseId,
        leadId,
        propertyId,
    });
    const userViewingsPath = buildWorkspacePath('/user/dashboard/viewings', {
        applicationId,
        viewingId,
        caseId: fastTrackCaseId,
        leadId,
        propertyId,
    });
    const managerAppointmentsPath = buildWorkspacePath('/manager/appointments', {
        applicationId,
        viewingId,
        caseId: fastTrackCaseId,
        leadId,
        propertyId,
    });
    const userContractsPath = buildWorkspacePath('/user/dashboard/contracts', {
        applicationId,
        contractId,
        caseId: fastTrackCaseId,
        leadId,
        propertyId,
    });
    const managerContractsPath = buildWorkspacePath('/manager/contracts', {
        applicationId,
        contractId,
        caseId: fastTrackCaseId,
        leadId,
        propertyId,
    });
    const supportNotificationTypes = new Set([
        'message_received',
        'support_ticket_created',
        'ticket_response',
        'support_ticket_status_updated',
        'support_ticket_assigned',
    ]);

    if (targetPath) {
        const normalizedTargetPath = normalizeTargetPath(targetPath, data);
        const effectiveTargetPath = normalizedTargetPath || targetPath;

        const isGenericUserHelpTarget = notificationRole === 'user'
            && isPathOrNestedPath(effectiveTargetPath, '/user/dashboard/help')
            && !ticketId
            && !conversationID
            && !supportNotificationTypes.has(notification.type);

        if (isGenericUserHelpTarget) {
            return '/user/dashboard/notifications';
        }

        if (supportNotificationTypes.has(notification.type) && (ticketId || conversationID)) {
            if (notificationRole === 'manager') {
                return buildSupportPath('/manager/help', ticketId, conversationID);
            }
            if (notificationRole === 'admin') {
                return buildSupportPath('/admin/help', ticketId, conversationID);
            }
            return buildSupportPath('/user/dashboard/help', ticketId, conversationID);
        }

        if (notificationRole === 'admin' && readNestedPathId(effectiveTargetPath, '/admin/properties')) {
            return buildAdminPropertyRegistryNotificationPath(data, propertyId, effectiveTargetPath);
        }

        if (
            isPathOrNestedPath(effectiveTargetPath, '/user/dashboard/payments')
            || isPathOrNestedPath(effectiveTargetPath, '/manager/billing')
        ) {
            return notificationRole === 'manager' ? managerContractsPath : userContractsPath;
        }

        return effectiveTargetPath;
    }
    const managerUserVerificationPath = subjectUserId
        ? `/manager/user-verifications?user=${encodeURIComponent(subjectUserId)}`
        : '/manager/user-verifications';
    const adminUserVerificationPath = subjectUserId
        ? `/admin/verifications?entity=user&userId=${encodeURIComponent(subjectUserId)}`
        : '/admin/verifications?entity=user';
    const adminManagerVerificationPath = subjectUserId
        ? `/admin/verifications?entity=manager&managerId=${encodeURIComponent(subjectUserId)}`
        : '/admin/verifications?entity=manager';

    switch (notification.type) {
        case 'user_verification_submitted':
            return notificationRole === 'manager' ? managerUserVerificationPath : adminUserVerificationPath;
        case 'manager_verification_submitted':
            return adminManagerVerificationPath;
        case 'user_verification_reupload_requested':
            return '/user/dashboard/profile';
        case 'manager_verification_reupload_requested':
            return '/manager/verification';
        case 'viewing_confirmed':
        case 'viewing_completed':
        case 'viewing_booked':
        case 'viewing_cancelled':
        case 'viewing_rescheduled':
        case 'appointment_reminder':
            return notificationRole === 'manager' ? managerAppointmentsPath : userViewingsPath;
        case 'application_update':
        case 'application_submitted':
        case 'application_approved':
        case 'application_rejected':
            return notificationRole === 'manager' ? managerApplicationsPath : userApplicationsPath;
        case 'sale_journey_updated':
        case 'sale_journey_completed':
            return notificationRole === 'manager' ? managerFastTrackPath : userFastTrackPath;
        case 'fast_track_requested':
            return notificationRole === 'manager'
                ? buildManagerFastTrackRequestPath({ brokerRequestId, leadId, clientId, propertyId })
                : userFastTrackPath;
        case 'fast_track_started':
        case 'fast_track_updated':
        case 'fast_track_completed':
            return notificationRole === 'manager' ? managerFastTrackPath : userFastTrackPath;
        case 'case_file_document_requested':
        case 'case_file_document_uploaded':
        case 'case_file_document_reviewed':
        case 'case_file_document_reupload_requested':
            return notificationRole === 'manager'
                ? buildWorkspacePath('/manager/case-files', {
                    applicationId,
                    caseId: fastTrackCaseId,
                    leadId,
                    propertyId,
                    contractId,
                })
                : buildWorkspacePath('/user/dashboard/case-file', {
                    applicationId,
                    caseId: fastTrackCaseId,
                    leadId,
                    propertyId,
                    contractId,
                });
        case 'documents_requested':
            return notificationRole === 'manager'
                ? buildWorkspacePath('/manager/leads', { caseId: fastTrackCaseId, leadId, propertyId })
                : userFastTrackPath;
        case 'message_received':
            if (notificationRole === 'manager') {
                return conversationID ? `/manager/messages?conversation=${conversationID}` : '/manager/messages';
            }
            if (notificationRole === 'admin') {
                return buildSupportPath('/admin/help', ticketId, conversationID);
            }
            return conversationID ? `/user/dashboard/messages?conversation=${conversationID}` : '/user/dashboard/messages';
        case 'support_ticket_created':
        case 'ticket_response':
        case 'support_ticket_status_updated':
        case 'support_ticket_assigned':
            if (notificationRole === 'manager') {
                return buildSupportPath('/manager/help', ticketId, conversationID);
            }
            if (notificationRole === 'admin') {
                return buildSupportPath('/admin/help', ticketId, conversationID);
            }
            return buildSupportPath('/user/dashboard/help', ticketId, conversationID);
        case 'property_saved':
        case 'price_drop':
        case 'new_property_match':
            return propertyId ? `/user/properties/${propertyId}` : '/user/saved';
        case 'payment_received':
        case 'payment_reminder':
        case 'payment_failed':
            return notificationRole === 'manager' ? managerContractsPath : userContractsPath;
        case 'contract_update':
            return notificationRole === 'manager' ? managerContractsPath : userContractsPath;
        case 'document_verified':
        case 'profile_verified':
            if (notificationRole === 'manager') {
                return '/manager/verification';
            }
            return fastTrackCaseId || leadId || propertyId ? userFastTrackPath : '/user/dashboard/profile';
        default:
            return notificationRole === 'admin' ? '/admin/notifications' : null;
    }
}
