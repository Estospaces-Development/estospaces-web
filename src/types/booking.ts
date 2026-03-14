/**
 * Booking & Contract Shared Types
 */

export type ContractStatus = 
    | 'draft'
    | 'sent'
    | 'pending_user_signature'
    | 'pending_manager_signature'
    | 'signed'
    | 'active'
    | 'expired'
    | 'terminated';

export interface Contract {
    id: string;
    property_id: string;
    manager_id: string;
    user_id: string;
    template_id?: string;
    title?: string;
    content?: string;
    contract_type?: string;
    start_date?: string;
    end_date?: string;
    monthly_rent?: number;
    deposit_amount?: number;
    terms_and_conditions?: string;
    contract_pdf_url?: string;
    status: ContractStatus;
    signed_at?: string;
    user_signed_at?: string;
    manager_signed_at?: string;
    expires_at?: string;
    created_at: string;
    updated_at: string;
    // UI-mapped fields
    name?: string;
    property?: string;
    type?: string;
    date?: string;
}

export interface ContractTemplate {
    id: string;
    name: string;
    description: string;
    content: string;
    type: string;
    is_mandatory: boolean;
    created_at: string;
}
