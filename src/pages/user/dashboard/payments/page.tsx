"use client";

import BrandLoader from '@/components/ui/BrandLoader';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
    AlertCircle,
    ArrowLeft,
    Calendar,
    CheckCircle,
    Clock,
    CreditCard,
    Download,
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
    getInvoices,
    getPayments,
    type Invoice,
    type Payment,
} from '@/services/paymentsService';
import { getFastTrackCases, type FastTrackCase } from '@/services/fastTrackService';
import { useToast } from '@/contexts/ToastContext';
import { useWorkflowWorkspaceRefresh } from '@/contexts/WorkspaceSyncContext';
import { WORKSPACE_SYNC_TAGS } from '@/lib/workspaceSync';

type TabType = 'payments' | 'invoices';

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

const getPaymentStatusStyle = (status: string) => {
    switch (status) {
        case 'completed':
            return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
        case 'pending':
            return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400';
        case 'failed':
            return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
        case 'refunded':
            return 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400';
        default:
            return 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300';
    }
};

const getPaymentStatusIcon = (status: string) => {
    switch (status) {
        case 'completed':
            return <CheckCircle size={14} />;
        case 'pending':
            return <Clock size={14} />;
        case 'failed':
            return <AlertCircle size={14} />;
        case 'refunded':
            return <RefreshCw size={14} />;
        default:
            return <AlertCircle size={14} />;
    }
};

const getInvoiceStatusStyle = (status: string) => {
    switch (status) {
        case 'paid':
            return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
        case 'open':
            return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
        case 'draft':
            return 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300';
        case 'uncollectible':
            return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
        case 'void':
            return 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400';
        default:
            return 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300';
    }
};

export default function PaymentsPage() {
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const toast = useToast();
    const [activeTab, setActiveTab] = useState<TabType>('payments');
    const [payments, setPayments] = useState<Payment[]>([]);
    const [invoices, setInvoices] = useState<Invoice[]>([]);
    const [fastTrackCases, setFastTrackCases] = useState<FastTrackCase[]>([]);
    const [isLoading, setIsLoading] = useState(true);
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

    const hasWorkspaceFocusRequest = Boolean(
        workspaceContext.paymentId
        || workspaceContext.invoiceId
        || workspaceContext.applicationId
        || workspaceContext.contractId
        || workspaceContext.caseId
        || workspaceContext.leadId
        || workspaceContext.propertyId,
    );

    useEffect(() => {
        if (workspaceContext.invoiceId && !workspaceContext.paymentId) {
            setActiveTab('invoices');
            return;
        }

        setActiveTab('payments');
    }, [workspaceContext.invoiceId, workspaceContext.paymentId]);

    const fetchData = useCallback(async () => {
        setIsLoading(true);
        setError(null);

        try {
            const [paymentsResult, invoicesResult, fastTrackCasesResult] = await Promise.all([
                getPayments({ suppressErrorToast: true }),
                getInvoices({ suppressErrorToast: true }),
                getFastTrackCases({ suppressErrorToast: true }),
            ]);

            setPayments(Array.isArray(paymentsResult.data) ? paymentsResult.data : []);
            setInvoices(Array.isArray(invoicesResult.data) ? invoicesResult.data : []);
            setFastTrackCases(fastTrackCasesResult.data || []);
        } catch {
            setError('Failed to load payment data');
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        void fetchData();
    }, [fetchData]);

    useWorkflowWorkspaceRefresh({
        tags: [
            WORKSPACE_SYNC_TAGS.PAYMENTS,
            WORKSPACE_SYNC_TAGS.BILLING,
            WORKSPACE_SYNC_TAGS.CONTRACTS,
            WORKSPACE_SYNC_TAGS.FAST_TRACK,
            WORKSPACE_SYNC_TAGS.APPLICATIONS,
        ],
        refresh: fetchData,
    });

    const rawCaseId = workspaceContext.caseId;
    const { caseId: sanitizedCaseId, removedCaseId } = useMemo(
        () => sanitizeWorkspaceCaseId(rawCaseId, fastTrackCases.map((caseItem) => caseItem.caseId)),
        [fastTrackCases, rawCaseId],
    );

    useEffect(() => {
        if (isLoading || !removedCaseId) {
            return;
        }

        if (removedCaseNoticeRef.current !== removedCaseId) {
            removedCaseNoticeRef.current = removedCaseId;
            toast.info(DELETED_FAST_TRACK_CASE_MESSAGE);
        }

        setSearchParams((previous) => stripCaseSearchParam(previous));
    }, [isLoading, removedCaseId, setSearchParams, toast]);

    const { payment: focusedPayment, invoice: focusedInvoice } = resolvePaymentsWorkspaceContext(
        payments,
        invoices,
        {
            ...workspaceContext,
            caseId: sanitizedCaseId,
        },
    );

    const linkedApplicationID = workspaceContext.applicationId || focusedPayment?.application_id || focusedInvoice?.application_id || '';
    const linkedContractID = workspaceContext.contractId || focusedPayment?.contract_id || focusedInvoice?.contract_id || '';
    const linkedFastTrackPath = buildWorkspacePath('/user/dashboard/fast-track', {
        applicationId: linkedApplicationID,
        caseId: sanitizedCaseId,
        leadId: workspaceContext.leadId,
        propertyId: workspaceContext.propertyId,
    });
    const linkedApplicationsPath = buildWorkspacePath('/user/applications', {
        applicationId: linkedApplicationID,
        caseId: sanitizedCaseId,
        leadId: workspaceContext.leadId,
        propertyId: workspaceContext.propertyId,
    });
    const linkedContractsPath = buildWorkspacePath('/user/dashboard/contracts', {
        applicationId: linkedApplicationID,
        contractId: linkedContractID,
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
                || payment.status.includes(query)
                || payment.payment_type?.toLowerCase().includes(query)
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
                || invoice.status.includes(query)
                || invoice.invoice_number?.toLowerCase().includes(query)
                || invoice.payment_type?.toLowerCase().includes(query)
            ))
            .sort((left, right) => {
                if (focusedInvoice?.id === left.id) return -1;
                if (focusedInvoice?.id === right.id) return 1;
                return new Date(right.created_at).getTime() - new Date(left.created_at).getTime();
            });
    }, [focusedInvoice?.id, invoices, searchQuery]);

    const totalPaid = payments
        .filter((payment) => payment.status === 'completed')
        .reduce((sum, payment) => sum + payment.amount, 0);
    const pendingAmount = payments
        .filter((payment) => payment.status === 'pending')
        .reduce((sum, payment) => sum + payment.amount, 0);

    if (isLoading) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-900">
                <BrandLoader className="h-10 w-10 text-orange-500" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-12">
            <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
                <button
                    onClick={() => navigate('/user/dashboard')}
                    className="group mb-6 flex w-fit items-center gap-2 text-gray-500 transition-colors hover:text-orange-500 dark:text-gray-400"
                >
                    <ArrowLeft size={20} className="transition-transform group-hover:-translate-x-1" />
                    <span className="text-sm font-medium">Back to Dashboard</span>
                </button>

                <div className="mb-8 flex flex-col justify-between gap-6 md:flex-row md:items-center">
                    <div>
                        <h1 className="flex items-center gap-3 text-3xl font-bold text-gray-900 dark:text-white">
                            <CreditCard className="text-orange-500" />
                            Payments
                        </h1>
                        <p className="mt-1 text-gray-500 dark:text-gray-400">
                            Invoice-led billing history, recorded payment states, and live journey billing context in one workspace.
                        </p>
                    </div>
                </div>

                {hasWorkspaceFocusRequest ? (
                    <div className="mb-8 rounded-3xl border border-orange-200 bg-orange-50 p-6 shadow-sm dark:border-orange-900/30 dark:bg-orange-950/20">
                        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                            <div>
                                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-orange-500">Live payment workspace</p>
                                <h2 className="mt-2 text-xl font-semibold text-gray-900 dark:text-white">
                                    {focusedPayment
                                        ? `Linked payment ${focusedPayment.status.replace(/_/g, ' ')}`
                                        : focusedInvoice
                                            ? `Linked invoice ${focusedInvoice.status.replace(/_/g, ' ')}`
                                            : 'Journey context preserved'}
                                </h2>
                                <p className="mt-3 text-sm text-gray-600 dark:text-gray-300">
                                    {focusedPayment
                                        ? `${focusedPayment.payment_type?.replace(/_/g, ' ') || 'Payment'} for ${formatAmount(focusedPayment.amount, focusedPayment.currency)} is pinned first so you can review the live record. Estospaces is tracking invoice and payment status for this pilot instead of collecting live client money here.`
                                        : focusedInvoice
                                            ? `Invoice ${focusedInvoice.invoice_number || focusedInvoice.id.slice(0, 8).toUpperCase()} is pinned first for the linked journey.`
                                            : 'This route is carrying the correct journey ids, but no payment or invoice record has been created for them yet.'}
                                </p>
                                {(focusedPayment?.failure_reason || focusedPayment?.due_at) ? (
                                    <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">
                                        {focusedPayment.failure_reason
                                            ? `Reason: ${focusedPayment.failure_reason}`
                                            : `Due: ${formatDate(focusedPayment.due_at)}`}
                                    </p>
                                ) : null}
                            </div>
                            <div className="grid gap-2 sm:grid-cols-3">
                                <button
                                    type="button"
                                    onClick={() => navigate(linkedFastTrackPath)}
                                    className="rounded-xl border border-orange-300 px-4 py-3 text-sm font-semibold text-orange-700 transition-colors hover:bg-orange-100 dark:border-orange-800 dark:text-orange-200 dark:hover:bg-orange-950/30"
                                >
                                    Open fast-track
                                </button>
                                <button
                                    type="button"
                                    onClick={() => navigate(linkedApplicationsPath)}
                                    className="rounded-xl border border-gray-300 px-4 py-3 text-sm font-semibold text-gray-700 transition-colors hover:bg-white dark:border-gray-700 dark:text-gray-200 dark:hover:bg-black"
                                >
                                    Open applications
                                </button>
                                <button
                                    type="button"
                                    onClick={() => navigate(linkedContractsPath)}
                                    className="rounded-xl border border-gray-300 px-4 py-3 text-sm font-semibold text-gray-700 transition-colors hover:bg-white dark:border-gray-700 dark:text-gray-200 dark:hover:bg-black"
                                >
                                    Open contracts
                                </button>
                            </div>
                        </div>
                    </div>
                ) : null}

                <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
                    <div className="rounded-2xl border bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800">
                        <div className="mb-2 flex items-center gap-3">
                            <div className="rounded-xl bg-green-100 p-2 dark:bg-green-900/30">
                                <CheckCircle size={18} className="text-green-600 dark:text-green-400" />
                            </div>
                            <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Paid</span>
                        </div>
                        <p className="text-2xl font-bold text-gray-900 dark:text-white">{formatAmount(totalPaid, 'GBP')}</p>
                    </div>
                    <div className="rounded-2xl border bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800">
                        <div className="mb-2 flex items-center gap-3">
                            <div className="rounded-xl bg-yellow-100 p-2 dark:bg-yellow-900/30">
                                <Clock size={18} className="text-yellow-600 dark:text-yellow-400" />
                            </div>
                            <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Pending</span>
                        </div>
                        <p className="text-2xl font-bold text-gray-900 dark:text-white">{formatAmount(pendingAmount, 'GBP')}</p>
                    </div>
                    <div className="rounded-2xl border bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800">
                        <div className="mb-2 flex items-center gap-3">
                            <div className="rounded-xl bg-blue-100 p-2 dark:bg-blue-900/30">
                                <Receipt size={18} className="text-blue-600 dark:text-blue-400" />
                            </div>
                            <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Invoices</span>
                        </div>
                        <p className="text-2xl font-bold text-gray-900 dark:text-white">{invoices.length}</p>
                    </div>
                </div>

                <div className="mb-6 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
                    <div className="flex items-center rounded-xl border bg-white p-1 shadow-sm dark:border-gray-700 dark:bg-gray-800">
                        <button
                            onClick={() => setActiveTab('payments')}
                            className={`rounded-lg px-4 py-2 text-sm font-medium transition-all ${activeTab === 'payments'
                                ? 'bg-orange-50 text-orange-600 shadow-sm dark:bg-orange-900/40 dark:text-orange-400'
                                : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
                                }`}
                        >
                            <CreditCard size={16} className="mr-1.5 inline -mt-0.5" />
                            Payments
                        </button>
                        <button
                            onClick={() => setActiveTab('invoices')}
                            className={`rounded-lg px-4 py-2 text-sm font-medium transition-all ${activeTab === 'invoices'
                                ? 'bg-orange-50 text-orange-600 shadow-sm dark:bg-orange-900/40 dark:text-orange-400'
                                : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
                                }`}
                        >
                            <FileText size={16} className="mr-1.5 inline -mt-0.5" />
                            Invoices
                        </button>
                    </div>

                    <div className="relative w-full sm:w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                        <input
                            type="text"
                            placeholder="Search..."
                            value={searchQuery}
                            onChange={(event) => setSearchQuery(event.target.value)}
                            className="w-full rounded-xl border bg-white py-2 pl-9 pr-4 text-sm text-gray-900 outline-none transition-all focus:ring-2 focus:ring-orange-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                        />
                    </div>
                </div>

                {error ? (
                    <div className="rounded-2xl border bg-white px-6 py-20 text-center dark:border-gray-700 dark:bg-gray-800">
                        <AlertCircle className="mx-auto mb-3 text-red-400" size={40} />
                        <p className="text-gray-500 dark:text-gray-400">{error}</p>
                        <button
                            onClick={() => void fetchData()}
                            className="mt-4 rounded-xl bg-orange-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-orange-600"
                        >
                            Retry
                        </button>
                    </div>
                ) : activeTab === 'payments' ? (
                    filteredPayments.length > 0 ? (
                        <div className="space-y-3">
                            {filteredPayments.map((payment) => {
                                const isFocused = payment.id === focusedPayment?.id;
                                const isPending = payment.status === 'pending';
                                return (
                                    <div
                                        key={payment.id}
                                        className={`rounded-2xl border bg-white p-5 shadow-sm transition-shadow hover:shadow-md dark:border-gray-700 dark:bg-gray-800 ${isFocused ? 'border-orange-300 ring-2 ring-orange-100 dark:border-orange-700 dark:ring-orange-900/30' : ''}`}
                                    >
                                        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                                            <div className="flex items-start gap-4">
                                                <div className="rounded-xl bg-gray-100 p-3 dark:bg-gray-700">
                                                    <CreditCard size={20} className="text-gray-600 dark:text-gray-300" />
                                                </div>
                                                <div>
                                                    <div className="flex flex-wrap items-center gap-2">
                                                        <p className="font-semibold text-gray-900 dark:text-white">
                                                            {payment.description || 'Payment'}
                                                        </p>
                                                        {isFocused ? (
                                                            <span className="rounded-full bg-orange-50 px-2.5 py-1 text-[11px] font-semibold text-orange-700 dark:bg-orange-900/30 dark:text-orange-300">
                                                                Linked record
                                                            </span>
                                                        ) : null}
                                                    </div>
                                                    <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
                                                        <span className="flex items-center gap-1">
                                                            <Calendar size={12} /> {formatDate(payment.created_at)}
                                                        </span>
                                                        <span>{payment.payment_method || 'Payment method pending'}</span>
                                                        {payment.payment_type ? (
                                                            <span>{payment.payment_type.replace(/_/g, ' ')}</span>
                                                        ) : null}
                                                    </div>
                                                    {(payment.due_at || payment.failure_reason) ? (
                                                        <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                                                            {payment.failure_reason
                                                                ? `Reason: ${payment.failure_reason}`
                                                                : `Due: ${formatDate(payment.due_at)}`}
                                                        </p>
                                                    ) : null}
                                                </div>
                                            </div>
                                            <div className="flex flex-col items-start gap-3 xl:items-end">
                                                <div className="text-left xl:text-right">
                                                    <p className="text-lg font-bold text-gray-900 dark:text-white">
                                                        {formatAmount(payment.amount, payment.currency)}
                                                    </p>
                                                    <span className={`mt-1 inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${getPaymentStatusStyle(payment.status)}`}>
                                                        {getPaymentStatusIcon(payment.status)}
                                                        {payment.status.charAt(0).toUpperCase() + payment.status.slice(1)}
                                                    </span>
                                                </div>
                                                {isPending ? (
                                                    <span className="rounded-xl border border-yellow-200 bg-yellow-50 px-4 py-2 text-sm font-semibold text-yellow-700 dark:border-yellow-900/40 dark:bg-yellow-950/20 dark:text-yellow-300">
                                                        Waiting for staff confirmation
                                                    </span>
                                                ) : null}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="rounded-2xl border bg-white py-20 text-center dark:border-gray-700 dark:bg-gray-800">
                            <div className="mb-4 inline-flex items-center justify-center rounded-full bg-gray-100 p-4 dark:bg-gray-700">
                                <CreditCard className="text-gray-400" size={32} />
                            </div>
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">No payments yet</h3>
                            <p className="mx-auto mt-2 max-w-sm text-gray-500 dark:text-gray-400">
                                Live payment records will appear here once the application, contract, or booking reaches a billing step.
                            </p>
                        </div>
                    )
                ) : filteredInvoices.length > 0 ? (
                    <div className="space-y-3">
                        {filteredInvoices.map((invoice) => {
                            const isFocused = invoice.id === focusedInvoice?.id;
                            const canDownload = Boolean(invoice.pdf_url);
                            return (
                                <div
                                    key={invoice.id}
                                    className={`rounded-2xl border bg-white p-5 shadow-sm transition-shadow hover:shadow-md dark:border-gray-700 dark:bg-gray-800 ${isFocused ? 'border-orange-300 ring-2 ring-orange-100 dark:border-orange-700 dark:ring-orange-900/30' : ''}`}
                                >
                                    <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                                        <div className="flex items-start gap-4">
                                            <div className="rounded-xl bg-gray-100 p-3 dark:bg-gray-700">
                                                <FileText size={20} className="text-gray-600 dark:text-gray-300" />
                                            </div>
                                            <div>
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <p className="font-semibold text-gray-900 dark:text-white">
                                                        Invoice #{invoice.invoice_number || invoice.id.substring(0, 8).toUpperCase()}
                                                    </p>
                                                    {isFocused ? (
                                                        <span className="rounded-full bg-orange-50 px-2.5 py-1 text-[11px] font-semibold text-orange-700 dark:bg-orange-900/30 dark:text-orange-300">
                                                            Linked record
                                                        </span>
                                                    ) : null}
                                                </div>
                                                <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
                                                    <span className="flex items-center gap-1">
                                                        <Calendar size={12} /> Created: {formatDate(invoice.created_at)}
                                                    </span>
                                                    <span>Due: {formatDate(invoice.due_date)}</span>
                                                    {invoice.payment_type ? (
                                                        <span>{invoice.payment_type.replace(/_/g, ' ')}</span>
                                                    ) : null}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <div className="text-right">
                                                <p className="text-lg font-bold text-gray-900 dark:text-white">
                                                    {formatAmount(invoice.total_amount, invoice.currency)}
                                                </p>
                                                <span className={`mt-1 inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${getInvoiceStatusStyle(invoice.status)}`}>
                                                    {invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}
                                                </span>
                                            </div>
                                            <button
                                                type="button"
                                                disabled={!canDownload}
                                                onClick={() => {
                                                    if (invoice.pdf_url) {
                                                        window.open(invoice.pdf_url, '_blank', 'noopener,noreferrer');
                                                    }
                                                }}
                                                className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-orange-50 hover:text-orange-500 disabled:cursor-not-allowed disabled:opacity-40 dark:hover:bg-orange-900/20"
                                                title={canDownload ? 'Download invoice' : 'No downloadable invoice attached'}
                                            >
                                                <Download size={18} />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <div className="rounded-2xl border bg-white py-20 text-center dark:border-gray-700 dark:bg-gray-800">
                        <div className="mb-4 inline-flex items-center justify-center rounded-full bg-gray-100 p-4 dark:bg-gray-700">
                            <FileText className="text-gray-400" size={32} />
                        </div>
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">No invoices yet</h3>
                        <p className="mx-auto mt-2 max-w-sm text-gray-500 dark:text-gray-400">
                            Invoice records will appear here as soon as the linked journey reaches a billing milestone.
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}
