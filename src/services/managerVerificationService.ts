export type ManagerProfileType = 'broker' | 'company';

export type VerificationStatus =
    | 'incomplete'
    | 'submitted'
    | 'under_review'
    | 'approved'
    | 'rejected'
    | 'verification_required';

export type DocumentStatus =
    | 'pending'
    | 'under_review'
    | 'approved'
    | 'rejected'
    | 'reupload_required';

export type DocumentType =
    | 'government_id'
    | 'broker_license'
    | 'company_registration'
    | 'business_license'
    | 'tax_certificate'
    | 'representative_id'
    | 'address_proof';

export interface ManagerProfile {
    id: string;
    profile_type: ManagerProfileType;
    license_number?: string;
    license_expiry_date?: string;
    association_membership_id?: string;
    company_registration_number?: string;
    tax_id?: string;
    company_address?: string;
    authorized_representative_name?: string;
    authorized_representative_email?: string;
    verification_status: VerificationStatus;
    rejection_reason?: string;
    revision_notes?: string;
    submitted_at?: string;
    approved_at?: string;
    approved_by?: string;
    created_at: string;
    updated_at: string;
}

export interface ManagerDocument {
    id: string;
    manager_id: string;
    document_type: DocumentType;
    document_url: string;
    document_name?: string;
    document_number?: string;
    expiry_date?: string;
    verification_status: DocumentStatus;
    rejection_reason?: string;
    reviewed_by?: string;
    reviewed_at?: string;
    submitted_at: string;
    updated_at: string;
    metadata?: Record<string, unknown>;
}

export interface ManagerVerificationSummary {
    profile: ManagerProfile | null;
    documents: ManagerDocument[];
    requiredDocuments: DocumentType[];
    isComplete: boolean;
    missingDocuments: DocumentType[];
}

const REQUIRED_DOCUMENTS: Record<ManagerProfileType, DocumentType[]> = {
    broker: ['government_id', 'broker_license'],
    company: ['company_registration', 'business_license', 'tax_certificate', 'representative_id'],
};

export const getRequiredDocuments = (type: ManagerProfileType): DocumentType[] => {
    return REQUIRED_DOCUMENTS[type] || [];
};

// MOCK IMPLEMENTATION
export const getManagerProfile = async (userId: string): Promise<{ data: ManagerProfile | null; error: string | null }> => {
    // Return mock approved profile
    return {
        data: {
            id: userId,
            profile_type: 'broker',
            verification_status: 'approved',
            license_number: 'RERA-2024-DEMO-001',
            license_expiry_date: '2025-12-31',
            association_membership_id: 'REAL-ESTATE-ASSOC-001',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
        } as ManagerProfile,
        error: null
    };
};

export const getManagerVerificationSummary = async (userId: string): Promise<{ data: ManagerVerificationSummary | null; error: string | null }> => {
    const profile = (await getManagerProfile(userId)).data;
    const documents: ManagerDocument[] = [
        {
            id: 'doc-1',
            manager_id: userId,
            document_type: 'broker_license',
            document_url: '#',
            document_name: 'Broker License.pdf',
            verification_status: 'approved',
            submitted_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
        },
        {
            id: 'doc-2',
            manager_id: userId,
            document_type: 'government_id',
            document_url: '#',
            document_name: 'Government ID.pdf',
            verification_status: 'approved',
            submitted_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
        }
    ];

    return {
        data: {
            profile,
            documents,
            requiredDocuments: ['government_id', 'broker_license'],
            isComplete: true,
            missingDocuments: []
        },
        error: null
    };
};

export const createOrUpdateManagerProfile = async (userId: string, data: Partial<ManagerProfile>): Promise<{ data: ManagerProfile | null; error: string | null }> => {
    return { data: null, error: 'Not implemented in mock' };
};

export const uploadManagerDocument = async (file: File, managerId: string, documentType: DocumentType): Promise<{ url: string | null; path: string | null; error: string | null }> => {
    return { url: 'mock_url', path: 'mock_path', error: null };
};

export const submitManagerDocument = async (data: any): Promise<{ data: ManagerDocument | null; error: string | null }> => {
    return { data: null, error: null };
};

export const deleteManagerDocument = async (managerId: string, documentType: DocumentType): Promise<{ error: string | null }> => {
    return { error: null };
};

export const submitForVerification = async (managerId: string): Promise<{ data: ManagerProfile | null; error: string | null }> => {
    return { data: null, error: null };
};
