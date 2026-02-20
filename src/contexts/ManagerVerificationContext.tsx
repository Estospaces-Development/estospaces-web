"use client";

import { createContext, useContext, useEffect, useState, useCallback, ReactNode, useRef } from 'react';
import { useAuth } from './AuthContext';
import * as managerVerificationService from '../services/managerVerificationService';
import type {
    ManagerProfile,
    ManagerDocument,
    VerificationStatus,
    ManagerProfileType,
    ManagerDocumentType
} from '../services/managerVerificationService';

// ============================================================================
// Types
// ============================================================================

interface ManagerVerificationContextValue {
    // State
    managerProfile: ManagerProfile | null;
    documents: ManagerDocument[];
    verificationStatus: VerificationStatus | null;
    isVerified: boolean;
    isLoading: boolean;
    error: string | null;

    // Computed
    requiredDocuments: ManagerDocumentType[];
    missingDocuments: ManagerDocumentType[];
    isComplete: boolean;
    canSubmit: boolean;

    // Actions
    refetch: () => Promise<void>;
    createProfile: (profileType: ManagerProfileType) => Promise<{ error: string | null }>;
    updateProfile: (data: Partial<ManagerProfile>) => Promise<{ error: string | null }>;
    uploadDocument: (file: File, documentType: ManagerDocumentType, metadata?: {
        documentNumber?: string;
        expiryDate?: string;
    }) => Promise<{ error: string | null }>;
    deleteDocument: (documentType: ManagerDocumentType) => Promise<{ error: string | null }>;
    submitForVerification: () => Promise<{ error: string | null }>;

    // Helpers
    getDocumentByType: (type: ManagerDocumentType) => ManagerDocument | undefined;
    getDocumentStatus: (type: ManagerDocumentType) => 'not_uploaded' | 'pending' | 'approved' | 'rejected' | 'reupload_required';
}

const ManagerVerificationContext = createContext<ManagerVerificationContextValue | null>(null);

export const ManagerVerificationProvider = ({ children }: { children: ReactNode }) => {
    const { user, isAuthenticated } = useAuth(); // Removed getRole as it might not be in the new AuthContext yet

    // State
    const [managerProfile, setManagerProfile] = useState<ManagerProfile | null>(null);
    const [documents, setDocuments] = useState<ManagerDocument[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Refs
    const mountedRef = useRef(true);
    const fetchingRef = useRef(false);

    // ========================================================================
    // Computed Values
    // ========================================================================

    const verificationStatus = managerProfile?.verification_status || null;
    const isVerified = verificationStatus === 'approved';

    const requiredDocuments = managerProfile
        ? managerVerificationService.getRequiredDocuments(managerProfile.profile_type)
        : [];

    const uploadedManagerDocumentTypes = documents.map(d => d.document_type);
    const missingDocuments = requiredDocuments.filter(
        d => !uploadedManagerDocumentTypes.includes(d)
    );

    const isComplete = missingDocuments.length === 0 && managerProfile !== null;
    const canSubmit = isComplete &&
        verificationStatus !== 'submitted' &&
        verificationStatus !== 'under_review' &&
        verificationStatus !== 'approved';

    // ========================================================================
    // Fetch Data
    // ========================================================================

    const fetchData = useCallback(async () => {
        if (!user?.id || !isAuthenticated || fetchingRef.current) return;

        fetchingRef.current = true;
        setIsLoading(true);
        setError(null);

        try {
            const result = await managerVerificationService.getManagerVerificationSummary(user.id);

            if (!mountedRef.current) return;

            if (result.error) {
                setError(result.error);
            } else if (result.data) {
                setManagerProfile(result.data.profile);
                setDocuments(result.data.documents);
            }
        } catch (err) {
            if (mountedRef.current) {
                setError((err as Error).message);
            }
        } finally {
            if (mountedRef.current) {
                setIsLoading(false);
                fetchingRef.current = false;
            }
        }
    }, [user?.id, isAuthenticated]);

    // Initial fetch
    useEffect(() => {
        mountedRef.current = true;
        fetchData();

        return () => {
            mountedRef.current = false;
        };
    }, [fetchData]);

    // ========================================================================
    // Actions
    // ========================================================================

    const refetch = useCallback(async () => {
        fetchingRef.current = false;
        await fetchData();
    }, [fetchData]);

    const createProfile = useCallback(async (
        profileType: ManagerProfileType
    ): Promise<{ error: string | null }> => {
        if (!user?.id) return { error: 'Not authenticated' };
        const result = await managerVerificationService.createOrUpdateManagerProfile(user.id, {
            profile_type: profileType,
            verification_status: 'incomplete',
        });
        if (result.error) return { error: result.error };
        if (result.data && mountedRef.current) setManagerProfile(result.data);
        return { error: null };
    }, [user?.id]);

    const updateProfile = useCallback(async (
        data: Partial<ManagerProfile>
    ): Promise<{ error: string | null }> => {
        if (!user?.id) return { error: 'Not authenticated' };
        const result = await managerVerificationService.createOrUpdateManagerProfile(user.id, data);
        if (result.error) return { error: result.error };
        if (result.data && mountedRef.current) setManagerProfile(result.data);
        return { error: null };
    }, [user?.id]);

    const uploadDocument = useCallback(async (
        file: File,
        documentType: ManagerDocumentType,
        metadata?: { documentNumber?: string; expiryDate?: string }
    ): Promise<{ error: string | null }> => {
        if (!user?.id) return { error: 'Not authenticated' };
        const result = await managerVerificationService.uploadManagerDocument(file, user.id, documentType);
        if (result.error) return { error: result.error };

        // Mock submit logic for now
        await refetch();
        return { error: null };
    }, [user?.id, refetch]);

    const deleteDocument = useCallback(async (
        documentType: ManagerDocumentType
    ): Promise<{ error: string | null }> => {
        if (!user?.id) return { error: 'Not authenticated' };
        const result = await managerVerificationService.deleteManagerDocument(user.id, documentType);
        if (result.error) return { error: result.error };
        await refetch();
        return { error: null };
    }, [user?.id, refetch]);

    const submitForVerification = useCallback(async (): Promise<{ error: string | null }> => {
        if (!user?.id) return { error: 'Not authenticated' };
        const result = await managerVerificationService.submitForVerification(user.id);
        if (result.error) return { error: result.error };
        if (result.data && mountedRef.current) setManagerProfile(result.data);
        return { error: null };
    }, [user?.id]);

    // ========================================================================
    // Helpers
    // ========================================================================

    const getDocumentByType = useCallback((type: ManagerDocumentType): ManagerDocument | undefined => {
        return documents.find(d => d.document_type === type);
    }, [documents]);

    const getDocumentStatus = useCallback((
        type: ManagerDocumentType
    ): 'not_uploaded' | 'pending' | 'approved' | 'rejected' | 'reupload_required' => {
        const doc = documents.find(d => d.document_type === type);
        if (!doc) return 'not_uploaded';
        switch (doc.verification_status) {
            case 'approved': return 'approved';
            case 'rejected': return 'rejected';
            case 'reupload_required': return 'reupload_required';
            default: return 'pending';
        }
    }, [documents]);

    const value = {
        managerProfile, documents, verificationStatus, isVerified, isLoading, error,
        requiredDocuments, missingDocuments, isComplete, canSubmit,
        refetch, createProfile, updateProfile, uploadDocument, deleteDocument, submitForVerification,
        getDocumentByType, getDocumentStatus,
    };

    return (
        <ManagerVerificationContext.Provider value={value}>
            {children}
        </ManagerVerificationContext.Provider>
    );
};

export const useManagerVerification = () => {
    const context = useContext(ManagerVerificationContext);
    if (!context) {
        throw new Error('useManagerVerification must be used within a ManagerVerificationProvider');
    }
    return context;
};

export default ManagerVerificationContext;
