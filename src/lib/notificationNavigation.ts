import { buildWorkspacePath } from '@/lib/workspaceLinks';

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

export function getNotificationNavigationPath(
    notification: { type: string; data?: NotificationNavigationData },
    role: string = 'user',
): string | null {
    const data = notification.data;
    const targetPath = readString(data, 'target_path', 'targetPath');

    if (targetPath) {
        return targetPath;
    }

    const conversationID = readString(data, 'conversation_id', 'conversationId');
    const applicationId = readString(data, 'applicationId', 'application_id');
    const viewingId = readString(data, 'viewingId', 'viewing_id');
    const contractId = readString(data, 'contractId', 'contract_id');
    const paymentId = readString(data, 'paymentId', 'payment_id');
    const invoiceId = readString(data, 'invoiceId', 'invoice_id');
    const subjectUserId = readString(data, 'subject_user_id', 'subjectUserId', 'userId', 'user_id');
    const fastTrackCaseId = readString(data, 'fast_track_id', 'fastTrackId', 'caseId', 'case_id');
    const leadId = readString(data, 'leadId', 'lead_id');
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
    const userPaymentsPath = buildWorkspacePath('/user/dashboard/payments', {
        applicationId,
        contractId,
        paymentId,
        invoiceId,
        caseId: fastTrackCaseId,
        leadId,
        propertyId,
    });
    const managerPaymentsPath = buildWorkspacePath('/manager/billing', {
        applicationId,
        contractId,
        paymentId,
        invoiceId,
        caseId: fastTrackCaseId,
        leadId,
        propertyId,
    });
    const managerUserVerificationPath = subjectUserId
        ? `/manager/user-verifications?user=${encodeURIComponent(subjectUserId)}`
        : '/manager/user-verifications';
    const adminVerificationPath = subjectUserId
        ? `/admin/verifications?user=${encodeURIComponent(subjectUserId)}`
        : '/admin/verifications';

    switch (notification.type) {
        case 'user_verification_submitted':
            return role === 'manager' ? managerUserVerificationPath : adminVerificationPath;
        case 'manager_verification_submitted':
            return adminVerificationPath;
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
            return role === 'manager' ? managerAppointmentsPath : userViewingsPath;
        case 'application_update':
        case 'application_submitted':
        case 'application_approved':
        case 'application_rejected':
            return role === 'manager' ? managerApplicationsPath : userApplicationsPath;
        case 'fast_track_started':
        case 'fast_track_updated':
        case 'fast_track_completed':
            return role === 'manager' ? managerFastTrackPath : userFastTrackPath;
        case 'documents_requested':
            return role === 'manager'
                ? buildWorkspacePath('/manager/leads', { caseId: fastTrackCaseId, leadId, propertyId })
                : userFastTrackPath;
        case 'message_received':
            if (role === 'manager') {
                return conversationID ? `/manager/messages?conversation=${conversationID}` : '/manager/messages';
            }
            if (role === 'admin') {
                return conversationID ? `/admin/chat?conversation=${conversationID}` : '/admin/chat';
            }
            return conversationID ? `/user/dashboard/messages?conversation=${conversationID}` : '/user/dashboard/messages';
        case 'property_saved':
        case 'price_drop':
        case 'new_property_match':
            return propertyId ? `/user/properties/${propertyId}` : '/user/saved';
        case 'payment_received':
        case 'payment_reminder':
        case 'payment_failed':
            return role === 'manager' ? managerPaymentsPath : userPaymentsPath;
        case 'contract_update':
            return role === 'manager' ? managerContractsPath : userContractsPath;
        case 'document_verified':
        case 'profile_verified':
            if (role === 'manager') {
                return '/manager/verification';
            }
            return fastTrackCaseId || leadId || propertyId ? userFastTrackPath : '/user/dashboard/profile';
        default:
            return role === 'admin' ? '/admin/notifications' : null;
    }
}
