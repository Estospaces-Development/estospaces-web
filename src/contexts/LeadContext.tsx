"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { getUserLeads, Lead } from '../services/leadsService';

// Re-export Lead type
export type { Lead } from '../services/leadsService';

interface LeadContextType {
    leads: Lead[];
    addLead: (lead: Omit<Lead, 'id' | 'created_at' | 'updated_at'>) => Promise<Lead>;
    updateLead: (id: string, lead: Partial<Lead>) => void;
    deleteLead: (id: string) => void;
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
                // Try to load from localStorage first
                const savedLeads = localStorage.getItem('leads');
                if (savedLeads) {
                    setLeads(JSON.parse(savedLeads));
                } else {
                    // If no local storage, load from service
                    const result = await getUserLeads();
                    if (result.data) {
                        setLeads(result.data);
                    }
                }
            } catch (error) {
                console.error('Error fetching leads:', error);
            } finally {
                setIsInitialized(true);
            }
        };

        fetchLeads();
    }, []);

    // Save leads to localStorage whenever they change
    useEffect(() => {
        if (isInitialized) {
            localStorage.setItem('leads', JSON.stringify(leads));
        }
    }, [leads, isInitialized]);

    const addLead = async (leadData: Omit<Lead, 'id' | 'created_at' | 'updated_at'>): Promise<Lead> => {
        const newLead: Lead = {
            ...leadData,
            id: Date.now().toString(),
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
        };
        setLeads((prev) => [...prev, newLead]);

        // Send notification log here if needed

        return newLead;
    };

    const updateLead = (id: string, leadData: Partial<Lead>) => {
        setLeads((prev) =>
            prev.map((lead) =>
                lead.id === id
                    ? { ...lead, ...leadData, updated_at: new Date().toISOString() }
                    : lead
            )
        );
    };

    const deleteLead = (id: string) => {
        setLeads((prev) => prev.filter((lead) => lead.id !== id));
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
