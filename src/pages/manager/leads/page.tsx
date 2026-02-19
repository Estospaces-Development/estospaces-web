"use client";

import { useState, Suspense } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import StatCard from '@/components/dashboard/StatCard';
import AddLeadModal from '@/components/dashboard/AddLeadModal';
import BackButton from '@/components/ui/BackButton';
import { useLeads, Lead } from '@/contexts/LeadContext';
import {
    UserPlus,
    Clock,
    CheckCircle,
    XCircle,
    Users,
    Plus,
    Filter,
    Search,
    Eye,
    Edit,
    Trash2,
    Mail,
    Phone,
    Download,
    Share2,
    FileDown,
    FileSpreadsheet
} from 'lucide-react';
import { exportToPDF, exportToExcel } from '@/lib/exportUtils';
import Toast from '@/components/ui/Toast';

function LeadsContent() {
    const navigate = useNavigate();
    const { leads, addLead, updateLead, deleteLead } = useLeads();
    const [searchQuery, setSearchQuery] = useState('');
    const [showAddLeadModal, setShowAddLeadModal] = useState(false);
    const [editingLead, setEditingLead] = useState<Lead | null>(null);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
    const [showViewModal, setShowViewModal] = useState<string | null>(null);
    const [showFilters, setShowFilters] = useState(false);
    const [showExportMenu, setShowExportMenu] = useState(false);
    const [selectedLeads, setSelectedLeads] = useState<string[]>([]);
    const [statusFilter, setStatusFilter] = useState('all');
    const [scoreFilter, setScoreFilter] = useState('all');
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error'; visible: boolean }>({
        message: '',
        type: 'success',
        visible: false,
    });

    const showToast = (message: string, type: 'success' | 'error' = 'success') => {
        setToast({ message, type, visible: true });
    };

    const filteredLeads = leads.filter((lead) => {
        const matchesSearch =
            (lead.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
            (lead.email || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
            (lead.propertyInterested || '').toLowerCase().includes(searchQuery.toLowerCase());

        const matchesStatus = statusFilter === 'all' || lead.status === statusFilter;

        const matchesScore = scoreFilter === 'all' ||
            (scoreFilter === 'high' && (lead.score || 0) >= 90) ||
            (scoreFilter === 'medium' && (lead.score || 0) >= 70 && (lead.score || 0) < 90) ||
            (scoreFilter === 'low' && (lead.score || 0) < 70);

        return matchesSearch && matchesStatus && matchesScore;
    });

    const handleAddLead = () => {
        setEditingLead(null);
        setShowAddLeadModal(true);
    };

    const handleEditLead = (lead: Lead) => {
        setEditingLead(lead);
        setShowAddLeadModal(true);
    };

    const handleSaveLead = async (leadData: Omit<Lead, 'id' | 'created_at' | 'updated_at'>) => {
        try {
            if (editingLead) {
                updateLead(editingLead.id, leadData);
                showToast('Lead updated successfully', 'success');
            } else {
                await addLead(leadData);
                showToast('Lead created successfully', 'success');
            }
            setShowAddLeadModal(false);
            setEditingLead(null);
        } catch (error) {
            showToast('Failed to save lead', 'error');
        }
    };

    const handleDeleteLead = (id: string) => {
        deleteLead(id);
        setShowDeleteConfirm(null);
        setSelectedLeads(prev => prev.filter(lid => lid !== id));
        showToast('Lead deleted successfully', 'success');
    };

    const handleExport = (format: 'pdf' | 'excel') => {
        const leadsToExport = selectedLeads.length > 0
            ? leads.filter(l => selectedLeads.includes(l.id))
            : filteredLeads;

        // Convert to export format
        const exportData = {
            title: 'Leads Export',
            headers: ['Name', 'Email', 'Property Interested', 'Status', 'Score', 'Budget', 'Last Contact'],
            rows: leadsToExport.map(lead => [
                lead.name || '',
                lead.email || '',
                lead.propertyInterested || '',
                lead.status,
                lead.score || 0,
                lead.budget || '',
                lead.lastContact || '',
            ]),
        };

        if (format === 'pdf') {
            exportToPDF(exportData, `leads_${new Date().toISOString().split('T')[0]}`);
        } else {
            exportToExcel(exportData, `leads_${new Date().toISOString().split('T')[0]}`);
        }
        setShowExportMenu(false);
        setSelectedLeads([]);
        showToast('Export started successfully', 'success');
    };

    const handleShare = async (lead: Lead) => {
        const shareData = {
            title: `Lead: ${lead.name}`,
            text: `Lead Details\nName: ${lead.name}\nEmail: ${lead.email}\nProperty: ${lead.propertyInterested}\nStatus: ${lead.status}`,
            url: typeof window !== 'undefined' ? window.location.href : '',
        };

        if (typeof navigator !== 'undefined' && navigator.share) {
            try {
                await navigator.share(shareData);
            } catch (err) {
                console.log('Error sharing:', err);
            }
        } else {
            // Fallback
            if (typeof navigator !== 'undefined' && navigator.clipboard) {
                navigator.clipboard.writeText(shareData.text);
                showToast('Lead details copied to clipboard!', 'success');
            }
        }
    };

    const toggleSelectLead = (id: string) => {
        setSelectedLeads(prev =>
            prev.includes(id) ? prev.filter(lid => lid !== id) : [...prev, id]
        );
    };

    const toggleSelectAll = () => {
        if (selectedLeads.length === filteredLeads.length) {
            setSelectedLeads([]);
        } else {
            setSelectedLeads(filteredLeads.map(lead => lead.id));
        }
    };

    // Calculate summary statistics
    const newLeadsCount = leads.filter(l => l.status === 'New Lead').length;
    const inProgressCount = leads.filter(l => l.status === 'In Progress').length;
    const approvedCount = leads.filter(l => l.status === 'Approved').length;
    const rejectedCount = leads.filter(l => l.status === 'Rejected').length;
    const totalClientsCount = approvedCount;

    return (
        <div className="space-y-6 font-sans">
            {/* Page Header */}
            <div>
                <div className="mb-4">
                    <BackButton />
                </div>
                <h1 className="text-2xl font-bold text-gray-800 dark:text-white mb-1">Leads & Clients</h1>
                <p className="text-gray-600 dark:text-gray-400">Manage your leads and clients relationships</p>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                <StatCard
                    title="New Leads"
                    value={newLeadsCount.toString()}
                    change=""
                    icon={UserPlus}
                    iconColor="bg-blue-500"
                    trendColor="text-blue-500"
                />
                <StatCard
                    title="In Progress"
                    value={inProgressCount.toString()}
                    change=""
                    icon={Clock}
                    iconColor="bg-yellow-500"
                    trendColor="text-yellow-500"
                />
                <StatCard
                    title="Approved"
                    value={approvedCount.toString()}
                    change=""
                    icon={CheckCircle}
                    iconColor="bg-green-500"
                    trendColor="text-green-500"
                />
                <StatCard
                    title="Rejected"
                    value={rejectedCount.toString()}
                    change=""
                    icon={XCircle}
                    iconColor="bg-red-500"
                    trendColor="text-red-500"
                />
                <StatCard
                    title="Total Clients"
                    value={totalClientsCount.toString()}
                    change=""
                    icon={Users}
                    iconColor="bg-purple-500"
                    trendColor="text-purple-500"
                />
            </div>

            {/* Search and Actions */}
            <div className="bg-white dark:bg-black rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 p-4">
                <div className="flex flex-col md:flex-row gap-4">
                    <div className="flex-1 relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search Leads"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                        />
                    </div>
                    <div className="relative">
                        <button
                            onClick={() => setShowFilters(!showFilters)}
                            className="flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                        >
                            <Filter className="w-4 h-4" />
                            <span className="text-sm font-medium">More Filters</span>
                        </button>
                        {showFilters && (
                            <div className="absolute top-full right-0 mt-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-4 z-10 min-w-[250px]">
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Status</label>
                                        <select
                                            value={statusFilter}
                                            onChange={(e) => setStatusFilter(e.target.value)}
                                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg text-sm"
                                        >
                                            <option value="all">All Status</option>
                                            <option value="New Lead">New Lead</option>
                                            <option value="In Progress">In Progress</option>
                                            <option value="Approved">Approved</option>
                                            <option value="Rejected">Rejected</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Score</label>
                                        <select
                                            value={scoreFilter}
                                            onChange={(e) => setScoreFilter(e.target.value)}
                                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg text-sm"
                                        >
                                            <option value="all">All Scores</option>
                                            <option value="high">High (90+)</option>
                                            <option value="medium">Medium (70-89)</option>
                                            <option value="low">Low (&lt;70)</option>
                                        </select>
                                    </div>
                                    <button
                                        onClick={() => {
                                            setStatusFilter('all');
                                            setScoreFilter('all');
                                            setShowFilters(false);
                                        }}
                                        className="w-full px-3 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
                                    >
                                        Clear Filters
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                    <div className="relative">
                        <button
                            onClick={() => setShowExportMenu(!showExportMenu)}
                            className="flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                        >
                            <Download className="w-4 h-4" />
                            <span className="text-sm font-medium">Export</span>
                            {selectedLeads.length > 0 && (
                                <span className="bg-primary text-white text-xs px-2 py-0.5 rounded-full">
                                    {selectedLeads.length}
                                </span>
                            )}
                        </button>
                        {showExportMenu && (
                            <div className="absolute top-full right-0 mt-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-10 min-w-[180px]">
                                <button
                                    onClick={() => handleExport('pdf')}
                                    className="w-full flex items-center gap-2 px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                                >
                                    <FileDown className="w-4 h-4" />
                                    Export as PDF
                                </button>
                                <button
                                    onClick={() => handleExport('excel')}
                                    className="w-full flex items-center gap-2 px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                                >
                                    <FileSpreadsheet className="w-4 h-4" />
                                    Export as Excel
                                </button>
                            </div>
                        )}
                    </div>
                    <button
                        onClick={handleAddLead}
                        className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary/90 text-white rounded-lg transition-colors"
                    >
                        <Plus className="w-4 h-4" />
                        <span className="text-sm font-medium">Add New Lead</span>
                    </button>
                </div>
            </div>

            {/* Leads Overview Table */}
            <div className="bg-white dark:bg-black rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 overflow-hidden">
                <div className="p-4 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
                    <h2 className="text-lg font-semibold text-gray-800 dark:text-white">Leads Overview</h2>
                    {selectedLeads.length > 0 && (
                        <span className="text-sm text-gray-600 dark:text-gray-400">
                            {selectedLeads.length} selected
                        </span>
                    )}
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-gray-50 dark:bg-gray-900">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                    <input
                                        type="checkbox"
                                        checked={selectedLeads.length === filteredLeads.length && filteredLeads.length > 0}
                                        onChange={toggleSelectAll}
                                        className="rounded border-gray-300 text-primary focus:ring-primary"
                                    />
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Leads</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Property Interested</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Score</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Budget</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Last Contact</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Action</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white dark:bg-black divide-y divide-gray-200 dark:divide-gray-800">
                            {filteredLeads.map((lead) => (
                                <tr key={lead.id} className="hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors">
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <input
                                            type="checkbox"
                                            checked={selectedLeads.includes(lead.id)}
                                            onChange={() => toggleSelectLead(lead.id)}
                                            className="rounded border-gray-300 text-primary focus:ring-primary"
                                        />
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div>
                                            <div className="text-sm font-medium text-gray-900 dark:text-white">{lead.name}</div>
                                            <div className="text-sm text-gray-500 dark:text-gray-400">{lead.email}</div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm text-gray-900 dark:text-white">{lead.propertyInterested}</div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${lead.status === 'New Lead' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-400' :
                                            lead.status === 'In Progress' ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-400' :
                                                lead.status === 'Approved' ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400' :
                                                    'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-400'
                                            }`}>
                                            {lead.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm text-gray-900 dark:text-white">{lead.score}</div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm text-gray-900 dark:text-white">{lead.budget}</div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm text-gray-500 dark:text-gray-400">{lead.lastContact}</div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={() => setShowViewModal(lead.id)}
                                                className="text-blue-600 dark:text-blue-400 hover:text-blue-900 dark:hover:text-blue-300"
                                                title="View"
                                            >
                                                <Eye className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => handleEditLead(lead)}
                                                className="text-green-600 dark:text-green-400 hover:text-green-900 dark:hover:text-green-300"
                                                title="Edit"
                                            >
                                                <Edit className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => { if (typeof window !== 'undefined') window.location.href = `mailto:${lead.email}`; }}
                                                className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
                                                title="Email"
                                            >
                                                <Mail className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => { if (typeof window !== 'undefined' && lead.phone) window.location.href = `tel:${lead.phone}`; }}
                                                className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
                                                title="Call"
                                            >
                                                <Phone className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => handleShare(lead)}
                                                className="text-purple-600 dark:text-purple-400 hover:text-purple-900 dark:hover:text-purple-300"
                                                title="Share"
                                            >
                                                <Share2 className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => setShowDeleteConfirm(lead.id)}
                                                className="text-red-600 dark:text-red-400 hover:text-red-900 dark:hover:text-red-300"
                                                title="Delete"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Add/Edit Lead Modal */}
            <AddLeadModal
                isOpen={showAddLeadModal}
                onClose={() => {
                    setShowAddLeadModal(false);
                    setEditingLead(null);
                }}
                onSave={handleSaveLead}
                existingLead={editingLead}
            />

            {/* View Lead Modal */}
            {showViewModal && typeof document !== 'undefined' && (() => {
                const lead = leads.find(l => l.id === showViewModal);
                if (!lead) return null;
                return createPortal(
                    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
                        <div className="bg-white dark:bg-gray-800 rounded-lg max-w-md w-full p-6 border border-gray-200 dark:border-gray-700 shadow-xl">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-lg font-semibold text-gray-800 dark:text-white">Lead Details</h3>
                                <button
                                    onClick={() => setShowViewModal(null)}
                                    className="p-1 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                                >
                                    <XCircle className="w-5 h-5" />
                                </button>
                            </div>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Name</label>
                                    <p className="text-sm text-gray-900 dark:text-white">{lead.name}</p>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email</label>
                                    <p className="text-sm text-gray-900 dark:text-white">{lead.email}</p>
                                </div>
                                {lead.phone && (
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Phone</label>
                                        <p className="text-sm text-gray-900 dark:text-white">{lead.phone}</p>
                                    </div>
                                )}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Property Interested</label>
                                    <p className="text-sm text-gray-900 dark:text-white">{lead.propertyInterested}</p>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Status</label>
                                    <span className={`inline-block px-2 py-1 text-xs font-medium rounded-full ${lead.status === 'New Lead' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-400' :
                                        lead.status === 'In Progress' ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-400' :
                                            lead.status === 'Approved' ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400' :
                                                'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-400'
                                        }`}>
                                        {lead.status}
                                    </span>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Score</label>
                                    <p className="text-sm text-gray-900 dark:text-white">{lead.score}</p>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Budget</label>
                                    <p className="text-sm text-gray-900 dark:text-white">{lead.budget}</p>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Last Contact</label>
                                    <p className="text-sm text-gray-900 dark:text-white">{lead.lastContact}</p>
                                </div>
                            </div>
                            <div className="flex gap-3 justify-end mt-6">
                                <button
                                    onClick={() => setShowViewModal(null)}
                                    className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                                >
                                    Close
                                </button>
                            </div>
                        </div>
                    </div>,
                    document.body
                );
            })()}

            {/* Delete Confirmation Modal */}
            {showDeleteConfirm && typeof document !== 'undefined' && createPortal(
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
                    <div className="bg-white dark:bg-gray-800 rounded-lg max-w-md w-full p-6 border border-gray-200 dark:border-gray-700 shadow-xl">
                        <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-4">Delete Lead</h3>
                        <p className="text-gray-600 dark:text-gray-400 mb-6">
                            Are you sure you want to delete this lead? This action cannot be undone.
                        </p>
                        <div className="flex gap-3 justify-end">
                            <button
                                onClick={() => setShowDeleteConfirm(null)}
                                className="px-6 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => handleDeleteLead(showDeleteConfirm)}
                                className="px-6 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors shadow-lg shadow-red-500/20"
                            >
                                Delete
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}

            <Toast
                id="leads-toast"
                message={toast.message}
                type={toast.type}
                isVisible={toast.visible}
                onClose={() => setToast(prev => ({ ...prev, visible: false }))}
            />
        </div>
    );
}

export default function LeadsPage() {
    return (
        <Suspense fallback={<div className="h-48 flex items-center justify-center font-bold">Loading Leads...</div>}>
            <LeadsContent />
        </Suspense>
    );
}

