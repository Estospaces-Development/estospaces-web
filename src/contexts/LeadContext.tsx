"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, ReactNode } from 'react';
import { getUserLeads, getBrokerLeads, createManualLead, updateLead as updateLeadService, deleteLead as deleteLeadService, Lead, CreateManualLeadRequest, UpdateLeadRequest } from '../services/leadsService';
import { useAuth } from './AuthContext';
import { usePublishWorkspaceSync, useWorkspaceRefresh } from './WorkspaceSyncContext';
import { WORKSPACE_SYNC_TAGS } from '@/lib/workspaceSync';

// Re-export Lead type
export type { Lead } from '../services/leadsService';

interface LeadContextType {
    leads: Lead[];
    refetch: () => Promise<void>;
    addLead: (lead: Omit<Lead, 'id' | 'created_at' | 'updated_at'>) => Promise<Lead>;
    updateLead: (id: string, lead: Partial<Lead>) => Promise<void>;
    deleteLead: (id: string) => Promise<void>;
    getLead: (id: string) => Lead | undefined;
}

const LeadContext = createContext<LeadContextType | undefined>(undefined);

export const useLeads = () => {
    const context = useContext(LeadContext);
    if (!context) {
        throw new Error('useLeads must be used within LeadProvider');
    }
    return context;
};

export const LeadProvider = ({ children }: { children: ReactNode }) => {
    const { user } = useAuth();
    const publishWorkspaceSync = usePublishWorkspaceSync();
    const [leads, setLeads] = useState<Lead[]>([]);
    const [isInitialized, setIsInitialized] = useState(false);
    const syncTags = useMemo(() => [
        WORKSPACE_SYNC_TAGS.LEADS,
        WORKSPACE_SYNC_TAGS.CLIENTS,
        WORKSPACE_SYNC_TAGS.BROKER_REQUESTS,
        WORKSPACE_SYNC_TAGS.FAST_TRACK,
        WORKSPACE_SYNC_TAGS.VERIFICATIONS,
    ], []);

    const fetchLeads = useCallback(async () => {
        try {
            const result = user?.role === 'manager' || user?.role === 'admin'
                ? await getBrokerLeads()
                : await getUserLeads();
            if (result.data) {
                setLeads(result.data.map((lead) => ({
                    ...lead,
                    name: lead.name || lead.email || 'Property enquiry',
                    propertyInterested: lead.propertyInterested || lead.property_name || lead.property?.title || 'Property enquiry',
                })));
            }
        } catch (error) {
        } finally {
            setIsInitialized(true);
        }
    }, [user?.role]);

    useEffect(() => {
        void fetchLeads();
    }, [fetchLeads]);

    useWorkspaceRefresh({
        tags: syncTags,
        refresh: fetchLeads,
        enabled: isInitialized,
    });

    const addLead = async (leadData: Omit<Lead, 'id' | 'created_at' | 'updated_at'>): Promise<Lead> => {
        try {
            if (!leadData.name?.trim()) {
                throw new Error('Lead name is required');
            }
            if (!leadData.email?.trim()) {
                throw new Error('Lead email is required');
            }
            if (!leadData.propertyInterested?.trim()) {
                throw new Error('Property interest is required');
            }

            const req: CreateManualLeadRequest = {
                name: leadData.name,
                email: leadData.email,
                phone: leadData.phone,
                property_interested: leadData.propertyInterested,
                status: leadData.status,
                score: leadData.score,
                budget: leadData.budget,
                last_contact: leadData.lastContact
            };

            const result = await createManualLead(req);
            if (result.data) {
                setLeads((prev) => [result.data!, ...prev]);
                publishWorkspaceSync({
                    key: `lead:create:${result.data.id}`,
                    source: 'mutation',
                    tags: syncTags,
                    reason: 'lead-created',
                    ids: { leadId: result.data.id },
                });
                return result.data;
            } else {
                throw new Error(result.error || 'Failed to create lead');
            }
        } catch (error) {
            throw error;
        }
    };

    const updateLead = async (id: string, leadData: Partial<Lead>) => {
        try {
            const req: UpdateLeadRequest = {
                name: leadData.name,
                email: leadData.email,
                phone: leadData.phone,
                property_interested: leadData.propertyInterested,
                status: leadData.status,
                score: leadData.score,
                budget: leadData.budget,
                last_contact: leadData.lastContact
            };

            const result = await updateLeadService(id, req);
            if (result.data) {
                setLeads((prev) =>
                    prev.map((lead) =>
                        lead.id === id ? result.data! : lead
                    )
                );
                publishWorkspaceSync({
                    key: `lead:update:${id}`,
                    source: 'mutation',
                    tags: syncTags,
                    reason: 'lead-updated',
                    ids: { leadId: id },
                });
            } else {
            }
        } catch (error) {
        }
    };

    const deleteLead = async (id: string) => {
        try {
            const result = await deleteLeadService(id);
            if (result.success) {
                setLeads((prev) => prev.filter((lead) => lead.id !== id));
                publishWorkspaceSync({
                    key: `lead:delete:${id}`,
                    source: 'mutation',
                    tags: syncTags,
                    reason: 'lead-deleted',
                    ids: { leadId: id },
                });
            } else {
            }
        } catch (error) {
        }
    };

    const getLead = (id: string): Lead | undefined => {
        return leads.find((lead) => lead.id === id);
    };

    return (
        <LeadContext.Provider
            value={{
                leads,
                refetch: fetchLeads,
                addLead,
                updateLead,
                deleteLead,
                getLead,
            }}
        >
            {children}
        </LeadContext.Provider>
    );
};
