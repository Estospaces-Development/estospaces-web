"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { getUserLeads, createManualLead, updateLead as updateLeadService, deleteLead as deleteLeadService, Lead, CreateManualLeadRequest, UpdateLeadRequest } from '../services/leadsService';

// Re-export Lead type
export type { Lead } from '../services/leadsService';

interface LeadContextType {
    leads: Lead[];
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
    const [leads, setLeads] = useState<Lead[]>([]);
    const [isInitialized, setIsInitialized] = useState(false);

    // Load leads from service
    useEffect(() => {
        const fetchLeads = async () => {
            try {
                const result = await getUserLeads();
                if (result.data) {
                    setLeads(result.data);
                }
            } catch (error) {
                console.error('Error fetching leads:', error);
            } finally {
                setIsInitialized(true);
            }
        };

        fetchLeads();
    }, []);

    const addLead = async (leadData: Omit<Lead, 'id' | 'created_at' | 'updated_at'>): Promise<Lead> => {
        try {
            const req: CreateManualLeadRequest = {
                name: leadData.name || 'Unknown',
                email: leadData.email || 'no-email@example.com',
                phone: leadData.phone,
                property_interested: leadData.propertyInterested || 'General Inquiry',
                status: leadData.status,
                score: leadData.score,
                budget: leadData.budget,
                last_contact: leadData.lastContact
            };

            const result = await createManualLead(req);
            if (result.data) {
                setLeads((prev) => [result.data!, ...prev]);
                return result.data;
            } else {
                throw new Error(result.error || 'Failed to create lead');
            }
        } catch (error) {
            console.error('Error adding lead:', error);
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
            } else {
                console.error('Failed to update lead:', result.error);
            }
        } catch (error) {
            console.error('Error updating lead:', error);
        }
    };

    const deleteLead = async (id: string) => {
        try {
            const result = await deleteLeadService(id);
            if (result.success) {
                setLeads((prev) => prev.filter((lead) => lead.id !== id));
            } else {
                console.error('Failed to delete lead:', result.error);
            }
        } catch (error) {
            console.error('Error deleting lead:', error);
        }
    };

    const getLead = (id: string): Lead | undefined => {
        return leads.find((lead) => lead.id === id);
    };

    return (
        <LeadContext.Provider
            value={{
                leads,
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
