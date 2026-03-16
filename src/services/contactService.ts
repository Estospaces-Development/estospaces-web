/**
 * Contact Service
 * The develop stack does not expose a public contact endpoint, so we fall back
 * to a mailto draft instead of posting to a dead API route.
 */

const CONTACT_EMAIL = 'hello@estospaces.com';

export interface ContactSubmission {
    name: string;
    email: string;
    subject: string;
    message: string;
}

export interface ContactSubmissionResult {
    delivery: 'mailto';
    mailtoUrl: string;
}

export function buildContactMailtoUrl(data: ContactSubmission): string {
    const normalizedSubject = data.subject.trim() || 'General enquiry';
    const body = [
        `Name: ${data.name.trim()}`,
        `Email: ${data.email.trim()}`,
        '',
        data.message.trim(),
    ].join('\n');

    return `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(`[Estospaces] ${normalizedSubject}`)}&body=${encodeURIComponent(body)}`;
}

/**
 * Submit a public contact form by opening an email draft.
 */
export async function submitContactForm(data: ContactSubmission): Promise<ContactSubmissionResult> {
    const mailtoUrl = buildContactMailtoUrl(data);

    if (typeof window !== 'undefined') {
        window.location.href = mailtoUrl;
    }

    return {
        delivery: 'mailto',
        mailtoUrl,
    };
}

export const contactService = {
    submitContactForm,
};
