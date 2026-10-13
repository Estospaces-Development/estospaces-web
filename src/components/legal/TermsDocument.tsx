import React from 'react';

export const TERMS_VERSION = '2026-10';
export const TERMS_LAST_UPDATED = '13 October 2026';

const sections = [
    {
        title: '1. Acceptance of Terms',
        content: [
            'By accessing and using Estospaces, you accept and agree to be bound by these Terms and Conditions.',
            'If you do not agree with any part of these terms, you must not create an account or use the platform.',
        ],
    },
    {
        title: '2. Provision of Services',
        content: [
            'Estospaces connects property seekers with landlords, property managers, and agents in India and the UK.',
            'For users and managers in India, Estospaces is provided by Estospaces Solutions Private Limited (CIN U68100TN2025PTC179899), registered office 28/50B Therku Veethi, Lakhma Samuthram, Narasingapuram, Attur, Salem 636108, Tamil Nadu, India. For users and managers in the United Kingdom, it is provided by Estospaces Solutions Limited. References to "Estospaces", "we" or "us" mean the company for your country.',
            'Unless explicitly stated, Estospaces does not own, manage, or inspect listed properties and is not a party to rental or purchase agreements between users.',
        ],
    },
    {
        title: '3. Account Responsibilities',
        content: [
            'You must provide accurate, current, and complete information when creating an account.',
            'You are responsible for keeping your password and account access secure.',
            'You must not create an account on behalf of another person without authorization.',
        ],
        bullets: [
            'Use a valid email address you control.',
            'Keep your contact details up to date.',
            'Do not share your login credentials.',
            'Notify Estospaces promptly if you suspect unauthorized access.',
        ],
    },
    {
        title: '4. Acceptable Use',
        content: [
            'You must not use Estospaces for unlawful, fraudulent, abusive, or misleading activity.',
            'You must not upload content or documents that are false, offensive, illegal, or infringe another party’s rights.',
        ],
    },
    {
        title: '5. Property Listings and Third-Party Information',
        content: [
            'Property owners, managers, and agents are responsible for the accuracy of their listings.',
            'Estospaces does not guarantee the accuracy, availability, or suitability of any property information, and users should independently verify important details before entering any agreement.',
        ],
    },
    {
        title: '6. Verification and Documents',
        content: [
            'You may be required to upload identity, address, or other verification documents to use certain features.',
            'By submitting documents, you confirm that they are authentic, current, and belong to you or your authorized business.',
            'Estospaces may review, reject, or request re-upload of documents where necessary for compliance and trust and safety purposes.',
        ],
    },
    {
        title: '7. Payments and Fees',
        content: [
            'Using Estospaces as a property seeker is free. Property managers can use the Free plan or a paid monthly plan (Growth or Premium). Prices, limits and the currency (₹ in India, £ in the UK) are shown before you pay, and prices include tax.',
            'New managers may receive a free trial of a paid plan. No card is taken for the trial and you are not charged automatically when it ends.',
            'Payments are processed by our payment provider, Razorpay. Estospaces does not store your card or bank details.',
            'A paid plan covers the period shown at checkout. You can cancel renewal at any time from the Subscription page; your plan stays active until the end of the period you paid for.',
            'If you think you were charged in error, contact hello@estospaces.com. We review refund requests individually and always give refunds where the law requires them.',
        ],
    },
    {
        title: '8. Privacy and Data Use',
        content: [
            'Your use of Estospaces is also subject to the Privacy Policy.',
            'By creating an account, you acknowledge that Estospaces may process your personal data to operate the service, verify accounts, provide support, and meet legal obligations.',
        ],
    },
    {
        title: '9. Suspension and Termination',
        content: [
            'Estospaces may suspend or terminate accounts that violate these terms, present security risks, or are required to be restricted by law.',
            'Termination may limit access to saved searches, uploaded documents, verification status, and other account data, subject to legal retention requirements.',
        ],
    },
    {
        title: '10. Limitation of Liability',
        content: [
            'To the maximum extent permitted by law, Estospaces is not liable for indirect, incidental, special, consequential, or punitive damages arising from your use of the platform.',
            'Nothing in these terms excludes liability that cannot legally be excluded.',
        ],
    },
    {
        title: '11. Fast Track',
        content: [
            'Fast Track is a time-limited workflow that helps a property seeker and a manager move from selection to handover in one case. Deadlines shown in the workflow are guides to keep the case moving.',
            'Estospaces records the steps of the case but is not a party to any tenancy or sale agreement made through it.',
        ],
    },
    {
        title: '12. Changes to These Terms',
        content: [
            'We may update these terms. We will show the date of the latest version on this page and tell account holders about significant changes before they apply. Continuing to use Estospaces after a change means you accept the updated terms.',
        ],
    },
    {
        title: '13. Governing Law',
        content: [
            'If you use Estospaces in India, these terms are governed by the laws of India. If you use Estospaces in the United Kingdom, these terms are governed by the laws of England and Wales. This does not remove any rights you have under the consumer laws of the place where you live.',
        ],
    },
    {
        title: '14. Contact',
        content: [
            'Questions about these terms: legal@estospaces.com. Help with your account: hello@estospaces.com.',
        ],
    },
] as const;

type TermsDocumentProps = {
    compact?: boolean;
};

export default function TermsDocument({ compact = false }: TermsDocumentProps) {
    return (
        <div className={compact ? 'space-y-6' : 'space-y-8'}>
            {sections.map((section) => (
                <section key={section.title}>
                    <h2 className="text-xl font-semibold text-gray-900 mb-4">{section.title}</h2>
                    <div className="space-y-3 text-gray-600 leading-relaxed">
                        {section.content.map((paragraph) => (
                            <p key={paragraph}>{paragraph}</p>
                        ))}
                    </div>
                    {(section as any).bullets && (
                        <ul className="list-disc list-inside text-gray-600 space-y-2 ml-4 mt-4">
                        {(section as any).bullets.map((bullet: string) => (
                                <li key={bullet}>{bullet}</li>
                            ))}
                        </ul>
                    )}
                </section>
            ))}
        </div>
    );
}
