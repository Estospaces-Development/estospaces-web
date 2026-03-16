/**
 * Contact Service
 * Handles public contact form submissions.
 */

import { apiFetch, getServiceUrl } from '@/lib/apiUtils';

const CORE_URL = () => getServiceUrl('core');

export interface ContactSubmission {
    name: string;
    email: string;
    subject: string;
    message: string;
}

/**
 * Submit a public contact form
 */
export async function submitContactForm(data: ContactSubmission): Promise<void> {
    await apiFetch(`${CORE_URL()}/api/v1/public/contact`, {
        method: 'POST',
        body: JSON.stringify(data),
    });
}

export const contactService = {
    submitContactForm,
};
