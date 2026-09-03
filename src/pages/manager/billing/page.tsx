"use client";

import BrandLoadingScreen from '@/components/ui/BrandLoadingScreen';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
    AlertCircle,
    ArrowLeft,
    CheckCircle2,
    CreditCard,
    FileText,
    Receipt,
    RefreshCw,
    Search,
} from 'lucide-react';
import { buildWorkspacePath, resolvePaymentsWorkspaceContext } from '@/lib/workspaceLinks';
import {
    DELETED_FAST_TRACK_CASE_MESSAGE,
    sanitizeWorkspaceCaseId,
    stripCaseSearchParam,
} from '@/lib/fastTrackCaseContext';
import {
    getManagerInvoices,
    getManagerPayments,
    type Invoice,
    type Payment,
} from '@/services/paymentsService';
import { getFastTrackCases, type FastTrackCase } from '@/services/fastTrackService';
import { useToast } from '@/contexts/ToastContext';
import { useWorkflowWorkspaceRefresh } from '@/contexts/WorkspaceSyncContext';
import { WORKSPACE_SYNC_TAGS } from '@/lib/workspaceSync';

type Tab = 'payments' | 'invoices';

const formatDate = (value?: string | null) => (
    value
        ? new Date(value).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
        : 'Not scheduled'
);

const formatAmount = (amount: number, currency: string) => (
    new Intl.NumberFormat('en-GB', {
        style: 'currency',
        currency: currency || 'GBP',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(amount || 0)
);

const paymentTone = (payment: Payment) => {
    if (payment.workflow_item_code === 'deposit_protection') {
        return 'Deposit compliance task';
    }
    if (payment.workflow_item_code === 'first_rent') {
        return 'First-rent activation task';
    }
    if (payment.payment_type?.includes('deposit') || payment.payment_type?.includes('rent')) {
        return 'Rent journey billing';
    }
    if (payment.payment_type?.includes('offer') || payment.payment_type?.includes('sale')) {
        return 'Buy journey payment history';
    }
    return 'Linked billing record';
};

export default function ManagerBillingPage() {
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const toast = useToast();
    const [activeTab, setActiveTab] = useState<Tab>('payments');
    const [payments, setPayments] = useState<Payment[]>([]);
    const [invoices, setInvoices] = useState<Invoice[]>([]);
    const [fastTrackCases, setFastTrackCases] = useState<FastTrackCase[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const removedCaseNoticeRef = useRef<string | null>(null);

    const workspaceContext = useMemo(() => ({
        paymentId: searchParams.get('payment'),
        invoiceId: searchParams.get('invoice'),
        applicationId: searchParams.get('application'),
        contractId: searchParams.get('contract'),
        caseId: searchParams.get('case'),
        leadId: searchParams.get('lead'),
        propertyId: searchParams.get('property'),
    }), [searchParams]);

    useEffect(() => {
        if (workspaceContext.invoiceId && !workspaceContext.paymentId) {
            setActiveTab('invoices');
            return;
        }
        setActiveTab('payments');
    }, [workspaceContext.invoiceId, workspaceContext.paymentId]);

    const loadData = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const [paymentsResult, invoicesResult, fastTrackCasesResult] = await Promise.all([
                getManagerPayments(),
                getManagerInvoices(),
                getFastTrackCases({ suppressErrorToast: true }),
            ]);
            setPayments(paymentsResult.data || []);
            setInvoices(invoicesResult.data || []);
            setFastTrackCases(fastTrackCasesResult.data || []);
        } catch {
            setError('Unable to load manager billing right now.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        void loadData();
    }, [loadData]);

    useWorkflowWorkspaceRefresh({
        tags: [
            WORKSPACE_SYNC_TAGS.PAYMENTS,
            WORKSPACE_SYNC_TAGS.BILLING,
            WORKSPACE_SYNC_TAGS.CONTRACTS,
            WORKSPACE_SYNC_TAGS.FAST_TRACK,
            WORKSPACE_SYNC_TAGS.APPLICATIONS,
        ],
        refresh: loadData,
    });

    const rawCaseId = workspaceContext.caseId;
    const { caseId: sanitizedCaseId, removedCaseId } = useMemo(
        () => sanitizeWorkspaceCaseId(rawCaseId, fastTrackCases.map((caseItem) => caseItem.caseId)),
        [fastTrackCases, rawCaseId],
    );

    useEffect(() => {
        if (loading || !removedCaseId) {
            return;
        }

        if (removedCaseNoticeRef.current !== removedCaseId) {
            removedCaseNoticeRef.current = removedCaseId;
            toast.info(DELETED_FAST_TRACK_CASE_MESSAGE);
        }

        setSearchParams((previous) => stripCaseSearchParam(previous));
    }, [loading, removedCaseId, setSearchParams, toast]);

    const { payment: focusedPayment, invoice: focusedInvoice } = resolvePaymentsWorkspaceContext(
        payments,
        invoices,
        {
            ...workspaceContext,
            caseId: sanitizedCaseId,
        },
    );

    const linkedApplicationId = workspaceContext.applicationId || focusedPayment?.application_id || focusedInvoice?.application_id || '';
    const linkedContractId = workspaceContext.contractId || focusedPayment?.contract_id || focusedInvoice?.contract_id || '';
    const openFastTrack = buildWorkspacePath('/manager/fast-track', {
        applicationId: linkedApplicationId,
        caseId: sanitizedCaseId,
        leadId: workspaceContext.leadId,
        propertyId: workspaceContext.propertyId,
    });
    const openApplications = buildWorkspacePath('/manager/applications', {
        applicationId: linkedApplicationId,
        caseId: sanitizedCaseId,
        leadId: workspaceContext.leadId,
        propertyId: workspaceContext.propertyId,
    });
    const openContracts = buildWorkspacePath('/manager/contracts', {
        applicationId: linkedApplicationId,
        contractId: linkedContractId,
        caseId: sanitizedCaseId,
        leadId: workspaceContext.leadId,
        propertyId: workspaceContext.propertyId,
    });

    const filteredPayments = useMemo(() => {
        const query = searchQuery.trim().toLowerCase();
        return payments
            .filter((payment) => (
                !query
                || payment.description?.toLowerCase().includes(query)
                || payment.payment_type?.toLowerCase().includes(query)
                || payment.status.toLowerCase().includes(query)
            ))
            .sort((left, right) => {
                if (focusedPayment?.id === left.id) return -1;
                if (focusedPayment?.id === right.id) return 1;
                return new Date(right.created_at).getTime() - new Date(left.created_at).getTime();
            });
    }, [focusedPayment?.id, payments, searchQuery]);

    const filteredInvoices = useMemo(() => {
        const query = searchQuery.trim().toLowerCase();
        return invoices
            .filter((invoice) => (
                !query
                || invoice.invoice_number?.toLowerCase().includes(query)
                || invoice.payment_type?.toLowerCase().includes(query)
                || invoice.status.toLowerCase().includes(query)
            ))
            .sort((left, right) => {
                if (focusedInvoice?.id === left.id) return -1;
                if (focusedInvoice?.id === right.id) return 1;
                return new Date(right.created_at).getTime() - new Date(left.created_at).getTime();
            });
    }, [focusedInvoice?.id, invoices, searchQuery]);

    const rentLinkedPayments = payments.filter((payment) => payment.payment_type?.includes('rent') || payment.payment_type?.includes('deposit')).length;
    const refundedPayments = payments.filter((payment) => payment.status === 'refunded').length;

    if (loading) {
        return <BrandLoadingScreen variant="section" label="Loading billing workspace..." />;
    }

    return (
        <div className="min-h-screen bg-gray-50 pb-12 dark:bg-gray-900">
            <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
                <button
                    onClick={() => navigate('/manager/dashboard')}
                    className="group mb-6 flex items-center gap-2 text-sm font-medium text-gray-500 transition-colors hover:text-orange-500 dark:text-gray-400"
                >
                    <ArrowLeft size={18} className="transition-transform group-hover:-translate-x-1" />
                    Back to Dashboard
                </button>

                <div className="mb-8 flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
                    <div>
                        <h1 className="flex items-center gap-3 text-3xl font-black text-gray-900 dark:text-white">
                            <CreditCard className="text-orange-500" />
                            Manager Billing
                        </h1>
                        <p className="mt-2 max-w-2xl text-sm font-medium text-gray-500 dark:text-gray-400">
                            Review live payment and invoice records linked to the journeys you own. Rent payments stay labelled as deposits or rent, while buy cases only surface truthful payment history.
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={() => void loadData()}
                        className="inline-flex items-center gap-2 rounded-2xl border border-gray-300 px-4 py-3 text-sm font-semibold text-gray-700 transition-colors hover:bg-white dark:border-gray-700 dark:text-gray-200 dark:hover:bg-black"
                    >
                        <RefreshCw className="h-4 w-4" />
                        Refresh
                    </button>
                </div>

                {(focusedPayment || focusedInvoice) ? (
                    <div className="mb-8 rounded-[2rem] border border-orange-200 bg-orange-50 p-6 dark:border-orange-900/30 dark:bg-orange-950/20">
                        <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
                            <div>
                                <p className="text-[10px] font-black uppercase tracking-[0.25em] text-orange-500">Live billing workspace</p>
                                <h2 className="mt-2 text-2xl font-black text-gray-900 dark:text-white">
                                    {focusedPayment
                                        ? `${paymentTone(focusedPayment)} pinned first`
                                        : `Invoice ${focusedInvoice?.invoice_number || focusedInvoice?.id.slice(0, 8).toUpperCase()} pinned first`}
                                </h2>
                                <p className="mt-3 text-sm font-medium leading-6 text-gray-600 dark:text-gray-300">
                                    {focusedPayment
                                        ? `${focusedPayment.description || 'Payment'} is the active linked billing record for this case.`
                                        : 'The invoice linked from the live journey is pinned first so you can audit the latest billing context without searching.'}
                                </p>
                            </div>
                            <div className="grid gap-2 sm:grid-cols-3">
                                <button type="button" onClick={() => navigate(openFastTrack)} className="rounded-xl border border-orange-300 px-4 py-3 text-sm font-semibold text-orange-700 transition-colors hover:bg-orange-100 dark:border-orange-800 dark:text-orange-200 dark:hover:bg-orange-950/30">
                                    Open fast-track
                                </button>
                                <button type="button" onClick={() => navigate(openApplications)} className="rounded-xl border border-gray-300 px-4 py-3 text-sm font-semibold text-gray-700 transition-colors hover:bg-white dark:border-gray-700 dark:text-gray-200 dark:hover:bg-black">
                                    Open applications
                                </button>
                                <button type="button" onClick={() => navigate(openContracts)} className="rounded-xl border border-gray-300 px-4 py-3 text-sm font-semibold text-gray-700 transition-colors hover:bg-white dark:border-gray-700 dark:text-gray-200 dark:hover:bg-black">
                                    Open contracts
                                </button>
                            </div>
                        </div>
                    </div>
                ) : null}

                <div className="mb-8 grid gap-4 md:grid-cols-3">
                    <div className="rounded-2xl border bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800">
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Payments</p>
                        <p className="mt-3 text-3xl font-black text-gray-900 dark:text-white">{payments.length}</p>
                    </div>
                    <div className="rounded-2xl border bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800">
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Rent-linked</p>
                        <p className="mt-3 text-3xl font-black text-gray-900 dark:text-white">{rentLinkedPayments}</p>
                    </div>
                    <div className="rounded-2xl border bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800">
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Refund visibility</p>
                        <p className="mt-3 text-3xl font-black text-gray-900 dark:text-white">{refundedPayments}</p>
                    </div>
                </div>

                <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center rounded-xl border bg-white p-1 shadow-sm dark:border-gray-700 dark:bg-gray-800">
                        <button
                            type="button"
                            onClick={() => setActiveTab('payments')}
                            className={`rounded-lg px-4 py-2 text-sm font-semibold transition-all ${activeTab === 'payments' ? 'bg-orange-50 text-orange-600 shadow-sm dark:bg-orange-900/30 dark:text-orange-300' : 'text-gray-500 dark:text-gray-400'}`}
                        >
                            Payments
                        </button>
                        <button
                            type="button"
                            onClick={() => setActiveTab('invoices')}
                            className={`rounded-lg px-4 py-2 text-sm font-semibold transition-all ${activeTab === 'invoices' ? 'bg-orange-50 text-orange-600 shadow-sm dark:bg-orange-900/30 dark:text-orange-300' : 'text-gray-500 dark:text-gray-400'}`}
                        >
                            Invoices
                        </button>
                    </div>

                    <div className="relative w-full sm:w-72">
                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(event) => setSearchQuery(event.target.value)}
                            placeholder="Search billing records..."
                            className="w-full rounded-xl border bg-white py-3 pl-9 pr-4 text-sm text-gray-900 outline-none transition focus:ring-2 focus:ring-orange-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                        />
                    </div>
                </div>

                {error ? (
                    <div className="rounded-2xl border bg-white px-6 py-16 text-center shadow-sm dark:border-gray-700 dark:bg-gray-800">
                        <AlertCircle className="mx-auto mb-3 h-10 w-10 text-red-400" />
                        <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{error}</p>
                    </div>
                ) : activeTab === 'payments' ? (
                    filteredPayments.length > 0 ? (
                        <div className="space-y-3">
                            {filteredPayments.map((payment) => {
                                const isFocused = payment.id === focusedPayment?.id;
                                return (
                                    <div key={payment.id} className={`rounded-2xl border bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800 ${isFocused ? 'border-orange-300 ring-2 ring-orange-100 dark:border-orange-700 dark:ring-orange-900/30' : ''}`}>
                                        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                                            <div className="flex items-start gap-4">
                                                <div className="rounded-xl bg-gray-100 p-3 dark:bg-gray-700">
                                                    <CreditCard className="h-5 w-5 text-gray-600 dark:text-gray-300" />
                                                </div>
                                                <div>
                                                    <div className="flex flex-wrap items-center gap-2">
                                                        <p className="font-semibold text-gray-900 dark:text-white">{payment.description || 'Payment'}</p>
                                                        {isFocused ? (
                                                            <span className="rounded-full bg-orange-50 px-2.5 py-1 text-[11px] font-semibold text-orange-700 dark:bg-orange-900/30 dark:text-orange-300">
                                                                Linked record
                                                            </span>
                                                        ) : null}
                                                    </div>
                                                    <p className="mt-1 text-xs font-semibold uppercase tracking-[0.2em] text-gray-400">
                                                        {paymentTone(payment)}
                                                    </p>
                                                    <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
                                                        <span>{formatDate(payment.created_at)}</span>
                                                        {payment.payment_type ? <span>{payment.payment_type.replace(/_/g, ' ')}</span> : null}
                                                        {payment.workflow_item_code ? <span>{payment.workflow_item_code.replace(/_/g, ' ')}</span> : null}
                                                        {payment.payment_method ? <span>{payment.payment_method}</span> : null}
                                                    </div>
                                                    {payment.failure_reason ? (
                                                        <p className="mt-2 text-xs font-medium text-red-500">{payment.failure_reason}</p>
                                                    ) : null}
                                                    {payment.compliance_status_reason ? (
                                                        <p className="mt-2 text-xs font-medium text-blue-600 dark:text-blue-300">{payment.compliance_status_reason}</p>
                                                    ) : null}
                                                    {payment.compliance_deadlines?.length ? (
                                                        <div className="mt-2 flex flex-wrap gap-2">
                                                            {payment.compliance_deadlines.slice(0, 2).map((deadline) => (
                                                                <span key={deadline.code} className="rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 text-[11px] font-semibold text-blue-700 dark:border-blue-900/30 dark:bg-blue-950/20 dark:text-blue-300">
                                                                    {deadline.label}: {formatDate(deadline.due_at)}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    ) : null}
                                                    {payment.status === 'refunded' ? (
                                                        <p className="mt-2 text-xs font-medium text-purple-500">
                                                            Refunded {payment.refund_amount ? formatAmount(payment.refund_amount, payment.currency) : 'in full'} on {formatDate(payment.refunded_at)}
                                                        </p>
                                                    ) : null}
                                                </div>
                                            </div>
                                            <div className="text-left xl:text-right">
                                                <p className="text-lg font-bold text-gray-900 dark:text-white">{formatAmount(payment.amount, payment.currency)}</p>
                                                <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-gray-100 px-2.5 py-1 text-xs font-semibold text-gray-700 dark:bg-gray-700 dark:text-gray-200">
                                                    <CheckCircle2 className="h-3.5 w-3.5" />
                                                    {payment.status.replace(/_/g, ' ')}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="rounded-2xl border bg-white py-20 text-center shadow-sm dark:border-gray-700 dark:bg-gray-800">
                            <CreditCard className="mx-auto mb-4 h-10 w-10 text-gray-300" />
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">No manager payment records yet</h3>
                            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                                Payments linked to your live applications and contracts will appear here.
                            </p>
                        </div>
                    )
                ) : filteredInvoices.length > 0 ? (
                    <div className="space-y-3">
                        {filteredInvoices.map((invoice) => {
                            const isFocused = invoice.id === focusedInvoice?.id;
                            return (
                                <div key={invoice.id} className={`rounded-2xl border bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800 ${isFocused ? 'border-orange-300 ring-2 ring-orange-100 dark:border-orange-700 dark:ring-orange-900/30' : ''}`}>
                                    <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                                        <div className="flex items-start gap-4">
                                            <div className="rounded-xl bg-gray-100 p-3 dark:bg-gray-700">
                                                <Receipt className="h-5 w-5 text-gray-600 dark:text-gray-300" />
                                            </div>
                                            <div>
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <p className="font-semibold text-gray-900 dark:text-white">
                                                        Invoice #{invoice.invoice_number || invoice.id.slice(0, 8).toUpperCase()}
                                                    </p>
                                                    {isFocused ? (
                                                        <span className="rounded-full bg-orange-50 px-2.5 py-1 text-[11px] font-semibold text-orange-700 dark:bg-orange-900/30 dark:text-orange-300">
                                                            Linked record
                                                        </span>
                                                    ) : null}
                                                </div>
                                                <p className="mt-2 text-xs font-semibold uppercase tracking-[0.2em] text-gray-400">
                                                    {invoice.payment_type?.includes('rent') || invoice.payment_type?.includes('deposit')
                                                        ? 'Rent invoice'
                                                        : invoice.payment_type?.includes('sale')
                                                            ? 'Buy payment history'
                                                            : 'Linked invoice'}
                                                </p>
                                                <div className="mt-2 flex flex-wrap gap-3 text-xs text-gray-500 dark:text-gray-400">
                                                    <span>Issued {formatDate(invoice.issued_date || invoice.created_at)}</span>
                                                    <span>Due {formatDate(invoice.due_date)}</span>
                                                    {invoice.workflow_item_code ? <span>{invoice.workflow_item_code.replace(/_/g, ' ')}</span> : null}
                                                </div>
                                                {invoice.compliance_status_reason ? (
                                                    <p className="mt-2 text-xs font-medium text-blue-600 dark:text-blue-300">{invoice.compliance_status_reason}</p>
                                                ) : null}
                                                {invoice.compliance_deadlines?.length ? (
                                                    <div className="mt-2 flex flex-wrap gap-2">
                                                        {invoice.compliance_deadlines.slice(0, 2).map((deadline) => (
                                                            <span key={deadline.code} className="rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 text-[11px] font-semibold text-blue-700 dark:border-blue-900/30 dark:bg-blue-950/20 dark:text-blue-300">
                                                                {deadline.label}: {formatDate(deadline.due_at)}
                                                            </span>
                                                        ))}
                                                    </div>
                                                ) : null}
                                            </div>
                                        </div>
                                        <div className="text-left xl:text-right">
                                            <p className="text-lg font-bold text-gray-900 dark:text-white">
                                                {formatAmount(invoice.total_amount, invoice.currency)}
                                            </p>
                                            <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-gray-100 px-2.5 py-1 text-xs font-semibold text-gray-700 dark:bg-gray-700 dark:text-gray-200">
                                                <FileText className="h-3.5 w-3.5" />
                                                {invoice.status.replace(/_/g, ' ')}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <div className="rounded-2xl border bg-white py-20 text-center shadow-sm dark:border-gray-700 dark:bg-gray-800">
                        <Receipt className="mx-auto mb-4 h-10 w-10 text-gray-300" />
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">No invoices yet</h3>
                        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                            Linked invoices will appear here once the owned journey reaches a billing milestone.
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}
