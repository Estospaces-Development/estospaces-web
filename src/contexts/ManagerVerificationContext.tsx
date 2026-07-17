"use client";

import { createContext, useContext, useEffect, useState, useCallback, ReactNode, useRef, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from './AuthContext';
import * as managerVerificationService from '../services/managerVerificationService';
import { getManagerPropertySubmissionBlocker } from '../lib/managerPropertySubmission';
import { usePublishWorkspaceSync, useWorkspaceRefresh } from './WorkspaceSyncContext';
import { WORKSPACE_SYNC_TAGS } from '@/lib/workspaceSync';
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
    propertySubmissionBlocker: string | null;
    isPropertySubmissionReady: boolean;

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
    const { pathname } = useLocation();
    const publishWorkspaceSync = usePublishWorkspaceSync();

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

    const missingDocuments = requiredDocuments.filter(
        (type) => {
            const latestDocument = documents.find((document) => document.document_type === type);
            if (!latestDocument) {
                return true;
            }

            return latestDocument.verification_status === 'rejected' ||
                latestDocument.verification_status === 'reupload_required';
        },
    );

    const isComplete = missingDocuments.length === 0 && managerProfile !== null;
    const canSubmit = isComplete &&
        verificationStatus !== 'submitted' &&
        verificationStatus !== 'under_review' &&
        verificationStatus !== 'approved';
    const propertySubmissionBlocker = getManagerPropertySubmissionBlocker(managerProfile);
    const isPropertySubmissionReady = propertySubmissionBlocker === null;
    const shouldFetchVerificationSummary = useMemo(
        () => pathname.startsWith('/manager'),
        [pathname],
    );
    const syncTags = [
        WORKSPACE_SYNC_TAGS.VERIFICATIONS,
        WORKSPACE_SYNC_TAGS.MANAGER_VERIFICATION,
        WORKSPACE_SYNC_TAGS.MANAGER_PROPERTIES,
    ];

    // ========================================================================
    // Fetch Data
    // ========================================================================

    const fetchData = useCallback(async () => {
        if (!user?.id || !isAuthenticated || fetchingRef.current || !shouldFetchVerificationSummary) {
            if (!shouldFetchVerificationSummary && mountedRef.current) {
                setIsLoading(false);
                setError(null);
            }
            return;
        }

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
    }, [isAuthenticated, shouldFetchVerificationSummary, user?.id]);

    // Initial fetch
    useEffect(() => {
        mountedRef.current = true;
        if (shouldFetchVerificationSummary) {
            void fetchData();
        } else {
            setIsLoading(false);
            setError(null);
        }

        return () => {
            mountedRef.current = false;
        };
    }, [fetchData, shouldFetchVerificationSummary]);

    useWorkspaceRefresh({
        tags: syncTags,
        refresh: fetchData,
        enabled: isAuthenticated && Boolean(user?.id) && shouldFetchVerificationSummary,
    });

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
        const result = await managerVerificationService.createManagerProfile(user.id, {
            profile_type: profileType,
            verification_status: 'incomplete',
        });
        if (result.error) return { error: result.error };
        if (result.data && mountedRef.current) {
            setManagerProfile(result.data);
            publishWorkspaceSync({
                key: `manager-verification:create-profile:${user.id}`,
                source: 'mutation',
                tags: syncTags,
                reason: 'manager-profile-created',
            });
        }
        return { error: null };
    }, [publishWorkspaceSync, syncTags, user?.id]);

    const updateProfile = useCallback(async (
        data: Partial<ManagerProfile>
    ): Promise<{ error: string | null }> => {
        if (!user?.id) return { error: 'Not authenticated' };
        const result = await managerVerificationService.updateManagerProfile(user.id, data);
        if (result.error) return { error: result.error };
        if (result.data && mountedRef.current) {
            setManagerProfile(result.data);
            publishWorkspaceSync({
                key: `manager-verification:update-profile:${user.id}`,
                source: 'mutation',
                tags: syncTags,
                reason: 'manager-profile-updated',
            });
        }
        return { error: null };
    }, [publishWorkspaceSync, syncTags, user?.id]);

    const uploadDocument = useCallback(async (
        file: File,
        documentType: ManagerDocumentType,
        metadata?: { documentNumber?: string; expiryDate?: string }
    ): Promise<{ error: string | null }> => {
        if (!user?.id) return { error: 'Not authenticated' };
        const result = await managerVerificationService.uploadManagerDocument(file, user.id, documentType);
        if (result.error) return { error: result.error };

        await refetch();
        publishWorkspaceSync({
            key: `manager-verification:upload:${user.id}:${documentType}`,
            source: 'mutation',
            tags: syncTags,
            reason: 'manager-document-uploaded',
        });
        return { error: null };
    }, [publishWorkspaceSync, refetch, syncTags, user?.id]);

    const deleteDocument = useCallback(async (
        documentType: ManagerDocumentType
    ): Promise<{ error: string | null }> => {
        if (!user?.id) return { error: 'Not authenticated' };
        const result = await managerVerificationService.deleteManagerDocument(user.id, documentType);
        if (result.error) return { error: result.error };
        await refetch();
        publishWorkspaceSync({
            key: `manager-verification:delete:${user.id}:${documentType}`,
            source: 'mutation',
            tags: syncTags,
            reason: 'manager-document-deleted',
        });
        return { error: null };
    }, [publishWorkspaceSync, refetch, syncTags, user?.id]);

    const submitForVerification = useCallback(async (): Promise<{ error: string | null }> => {
        if (!user?.id) return { error: 'Not authenticated' };
        const result = await managerVerificationService.submitForVerification(user.id);
        if (result.error) return { error: result.error };
        if (result.data && mountedRef.current) {
            setManagerProfile(result.data);
            publishWorkspaceSync({
                key: `manager-verification:submit:${user.id}`,
                source: 'mutation',
                tags: syncTags,
                reason: 'manager-verification-submitted',
            });
        }
        return { error: null };
    }, [publishWorkspaceSync, syncTags, user?.id]);

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
        requiredDocuments, missingDocuments, isComplete, canSubmit, propertySubmissionBlocker, isPropertySubmissionReady,
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
