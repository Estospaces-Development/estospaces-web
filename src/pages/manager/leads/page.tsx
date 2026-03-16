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
    FileSpreadsheet,
    Calendar,
    ArrowUpRight
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
                // error handled
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
        <div className="space-y-8 font-outfit pb-20 animate-in fade-in duration-700">
            {/* Page Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <div className="mb-4">
                        <BackButton />
                    </div>
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Leads & Clients</h1>
                    <p className="text-gray-500 dark:text-gray-400 font-medium">Manage and nurture your property relationships</p>
                </div>
                <button
                    onClick={handleAddLead}
                    className="flex items-center gap-2 px-5 py-3 bg-orange-500 hover:bg-orange-600 text-white rounded-xl font-bold text-sm transition-all shadow-lg shadow-orange-500/20 active:scale-95"
                >
                    <Plus className="w-5 h-5" />
                    <span>Add New Lead</span>
                </button>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
                {[
                    { title: "New Leads", value: newLeadsCount, icon: UserPlus, color: "blue" },
                    { title: "In Progress", value: inProgressCount, icon: Clock, color: "orange" },
                    { title: "Approved", value: approvedCount, icon: CheckCircle, color: "green" },
                    { title: "Rejected", value: rejectedCount, icon: XCircle, color: "red" },
                    { title: "Total Clients", value: totalClientsCount, icon: Users, color: "purple" }
                ].map((stat, i) => (
                    <div key={i} className="bg-white dark:bg-black rounded-2xl p-5 border border-gray-100 dark:border-gray-800 shadow-sm hover:shadow-md transition-shadow">
                        <div className={`p-2 w-fit rounded-lg bg-${stat.color}-500/10 mb-3`}>
                            <stat.icon className={`w-5 h-5 text-${stat.color}-500`} />
                        </div>
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">{stat.title}</p>
                        <h3 className="text-2xl font-black text-gray-900 dark:text-white">{stat.value}</h3>
                    </div>
                ))}
            </div>

            {/* Search and Table Container */}
            <div className="bg-white dark:bg-black rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden text-sm">
                <div className="p-6 border-b border-gray-50 dark:border-gray-900 space-y-4">
                    <div className="flex flex-col md:flex-row gap-4">
                        <div className="flex-1 relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Search by name, email or property..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-10 pr-4 py-3 bg-gray-50 dark:bg-gray-900 border-none dark:text-white rounded-xl focus:ring-2 focus:ring-orange-500/20 transition-all font-medium"
                            />
                        </div>
                        <div className="flex gap-2">
                           <div className="relative">
                                <button
                                    onClick={() => setShowFilters(!showFilters)}
                                    className="flex items-center gap-2 px-4 py-3 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-all font-bold"
                                >
                                    <Filter className="w-4 h-4" />
                                    <span>Filters</span>
                                </button>
                                {showFilters && (
                                    <div className="absolute top-full right-0 mt-2 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl shadow-xl p-6 z-30 min-w-[280px] animate-in fade-in zoom-in duration-200">
                                        <div className="space-y-5">
                                            <div>
                                                <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Status</label>
                                                <select
                                                    value={statusFilter}
                                                    onChange={(e) => setStatusFilter(e.target.value)}
                                                    className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-900 border-none dark:text-white rounded-xl focus:ring-2 focus:ring-orange-500/20 font-medium cursor-pointer"
                                                >
                                                    <option value="all">All Status</option>
                                                    <option value="New Lead">New Lead</option>
                                                    <option value="In Progress">In Progress</option>
                                                    <option value="Approved">Approved</option>
                                                    <option value="Rejected">Rejected</option>
                                                </select>
                                            </div>
                                            <div>
                                                <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Score</label>
                                                <select
                                                    value={scoreFilter}
                                                    onChange={(e) => setScoreFilter(e.target.value)}
                                                    className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-900 border-none dark:text-white rounded-xl focus:ring-2 focus:ring-orange-500/20 font-medium cursor-pointer"
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
                                                className="w-full py-2 text-sm font-bold text-orange-500 hover:text-orange-600 transition-colors"
                                            >
                                                Reset All Filters
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                            <div className="relative">
                                <button
                                    onClick={() => setShowExportMenu(!showExportMenu)}
                                    className="flex items-center gap-2 px-4 py-3 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-all font-bold"
                                >
                                    <Download className="w-4 h-4" />
                                    <span>Export</span>
                                    {selectedLeads.length > 0 && (
                                        <span className="bg-orange-500 text-white text-[10px] px-1.5 py-0.5 rounded-full font-black">
                                            {selectedLeads.length}
                                        </span>
                                    )}
                                </button>
                                {showExportMenu && (
                                    <div className="absolute top-full right-0 mt-2 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl shadow-xl z-30 min-w-[220px] overflow-hidden animate-in fade-in zoom-in duration-200">
                                        <button
                                            onClick={() => handleExport('pdf')}
                                            className="w-full flex items-center gap-3 px-6 py-4 text-left text-sm font-bold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                                        >
                                            <FileDown className="w-5 h-5 text-red-500" />
                                            Export as PDF
                                        </button>
                                        <button
                                            onClick={() => handleExport('excel')}
                                            className="w-full flex items-center gap-3 px-6 py-4 text-left text-sm font-bold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors border-t border-gray-50 dark:border-gray-900"
                                        >
                                            <FileSpreadsheet className="w-5 h-5 text-green-500" />
                                            Export as Excel
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    {filteredLeads.length > 0 ? (
                        <table className="w-full text-left">
                            <thead>
                                <tr className="bg-gray-50 dark:bg-gray-900/50">
                                    <th className="px-6 py-4">
                                        <input
                                            type="checkbox"
                                            checked={selectedLeads.length === filteredLeads.length && filteredLeads.length > 0}
                                            onChange={toggleSelectAll}
                                            className="w-4 h-4 rounded border-gray-300 text-orange-500 focus:ring-orange-500 cursor-pointer transition-all"
                                        />
                                    </th>
                                    <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Client Name</th>
                                    <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Property Interested</th>
                                    <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Status</th>
                                    <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Score</th>
                                    <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50 dark:divide-gray-900">
                                {filteredLeads.map((lead) => (
                                    <tr key={lead.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-900/30 transition-colors group">
                                        <td className="px-6 py-5">
                                            <input
                                                type="checkbox"
                                                checked={selectedLeads.includes(lead.id)}
                                                onChange={() => toggleSelectLead(lead.id)}
                                                className="w-4 h-4 rounded border-gray-300 text-orange-500 focus:ring-orange-500 cursor-pointer transition-all"
                                            />
                                        </td>
                                        <td className="px-6 py-5">
                                            <div>
                                                <div className="text-sm font-bold text-gray-900 dark:text-white group-hover:text-orange-500 transition-colors">{lead.name}</div>
                                                <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{lead.email}</div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-5">
                                            <div className="text-sm font-medium text-gray-700 dark:text-gray-300 line-clamp-1">{lead.propertyInterested}</div>
                                        </td>
                                        <td className="px-6 py-5">
                                            <span className={`px-3 py-1 text-[10px] font-black uppercase tracking-wider rounded-lg ${
                                                lead.status === 'New Lead' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-400' :
                                                lead.status === 'In Progress' ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-400' :
                                                lead.status === 'Approved' ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400' :
                                                'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-400'
                                            }`}>
                                                {lead.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-5">
                                            <div className="flex items-center gap-2">
                                                <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-[10px] font-bold text-gray-600 dark:text-gray-400">
                                                    {lead.score}
                                                </div>
                                                <div className="flex-1 max-w-[60px] bg-gray-100 dark:bg-gray-800 rounded-full h-1 overflow-hidden">
                                                    <div 
                                                        className={`h-full rounded-full ${lead.score && lead.score > 80 ? 'bg-green-500' : 'bg-orange-500'}`} 
                                                        style={{ width: `${lead.score}%` }}
                                                    ></div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-5">
                                            <div className="flex items-center gap-1">
                                                <button onClick={() => setShowViewModal(lead.id)} className="p-2 text-gray-400 hover:text-blue-500 hover:bg-blue-500/10 rounded-lg transition-all" title="View"><Eye size={18}/></button>
                                                <button onClick={() => handleEditLead(lead)} className="p-2 text-gray-400 hover:text-green-500 hover:bg-green-500/10 rounded-lg transition-all" title="Edit"><Edit size={18}/></button>
                                                <button onClick={() => handleShare(lead)} className="p-2 text-gray-400 hover:text-purple-500 hover:bg-purple-500/10 rounded-lg transition-all" title="Share"><Share2 size={18}/></button>
                                                <button onClick={() => setShowDeleteConfirm(lead.id)} className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all" title="Delete"><Trash2 size={18}/></button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    ) : (
                        <div className="py-32 flex flex-col items-center justify-center text-center px-6">
                            <div className="w-24 h-24 bg-gray-50 dark:bg-gray-900 rounded-full flex items-center justify-center mb-6 border border-gray-100 dark:border-gray-800">
                                <Users size={48} className="text-gray-200 dark:text-gray-700" />
                            </div>
                            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">No leads found</h3>
                            <p className="text-gray-500 dark:text-gray-400 max-w-sm font-medium leading-relaxed">
                                {searchQuery || statusFilter !== 'all' || scoreFilter !== 'all'
                                    ? "We couldn't find any leads matching your current search or filters. Try broadening your criteria."
                                    : "You haven't added any leads yet. Start by creating your first lead to begin tracking property inquiries."}
                            </p>
                            {(searchQuery || statusFilter !== 'all' || scoreFilter !== 'all') && (
                                <button
                                    onClick={() => {
                                        setSearchQuery('');
                                        setStatusFilter('all');
                                        setScoreFilter('all');
                                    }}
                                    className="mt-8 px-6 py-2.5 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-xl font-bold hover:bg-gray-200 dark:hover:bg-gray-700 transition-all"
                                >
                                    Reset all search filters
                                </button>
                            )}
                        </div>
                    )}
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
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-[100] p-4 animate-in fade-in duration-300">
                        <div className="bg-white dark:bg-gray-900 rounded-3xl max-w-lg w-full p-8 border border-white/20 shadow-2xl animate-in zoom-in-95 duration-300">
                            <div className="flex items-center justify-between mb-8">
                                <h3 className="text-2xl font-black text-gray-900 dark:text-white">Lead Details</h3>
                                <button
                                    onClick={() => setShowViewModal(null)}
                                    className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-all"
                                >
                                    <XCircle className="w-6 h-6" />
                                </button>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-8">
                                <div className="space-y-6">
                                    <div>
                                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Company / Name</p>
                                        <p className="text-sm font-bold text-gray-900 dark:text-white">{lead.name}</p>
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Email Address</p>
                                        <p className="text-sm font-bold text-gray-900 dark:text-white">{lead.email}</p>
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Phone Number</p>
                                        <p className="text-sm font-bold text-gray-900 dark:text-white">{lead.phone || "—"}</p>
                                    </div>
                                </div>
                                <div className="space-y-6">
                                    <div>
                                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Status</p>
                                        <span className={`px-3 py-1 text-[10px] font-black uppercase tracking-wider rounded-lg ${
                                            lead.status === 'New Lead' ? 'bg-blue-100 text-blue-800' :
                                            lead.status === 'In Progress' ? 'bg-orange-100 text-orange-800' :
                                            lead.status === 'Approved' ? 'bg-green-100 text-green-800' :
                                            'bg-red-100 text-red-800'
                                        }`}>
                                            {lead.status}
                                        </span>
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Lead Score</p>
                                        <div className="flex items-center gap-2">
                                            <div className="w-10 h-10 rounded-xl bg-gray-50 dark:bg-gray-800 flex items-center justify-center text-sm font-black text-orange-500">
                                                {lead.score}
                                            </div>
                                            <p className="text-xs font-bold text-gray-500 font-medium">Hot Lead</p>
                                        </div>
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Budget Range</p>
                                        <p className="text-sm font-bold text-gray-900 dark:text-white">{lead.budget || "—"}</p>
                                    </div>
                                </div>
                                <div className="col-span-2 p-6 bg-gray-50 dark:bg-gray-800/50 rounded-2xl border border-gray-100 dark:border-gray-800">
                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Property Interest</p>
                                    <p className="text-sm font-bold text-gray-900 dark:text-white leading-relaxed">{lead.propertyInterested}</p>
                                </div>
                            </div>

                            <div className="flex gap-4 mt-10">
                                <button
                                    onClick={() => { if (typeof window !== 'undefined' && lead.phone) window.location.href = `tel:${lead.phone}`; }}
                                    className="flex-1 py-3 bg-orange-500 hover:bg-orange-600 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-orange-500/20"
                                >
                                    <Phone size={18} />
                                    <span>Call Client</span>
                                </button>
                                <button
                                    onClick={() => setShowViewModal(null)}
                                    className="px-8 py-3 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-xl font-bold hover:bg-gray-200 dark:hover:bg-gray-700 transition-all font-bold"
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
                <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-[100] p-4">
                    <div className="bg-white dark:bg-gray-900 rounded-3xl max-w-sm w-full p-8 border border-white/20 shadow-2xl text-center">
                        <div className="w-20 h-20 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center mx-auto mb-6">
                            <Trash2 size={40} className="text-red-500" />
                        </div>
                        <h3 className="text-2xl font-black text-gray-900 dark:text-white mb-3">Delete Lead?</h3>
                        <p className="text-gray-500 dark:text-gray-400 mb-8 font-medium">
                            This action will permanently remove all client data. This cannot be undone.
                        </p>
                        <div className="flex gap-4">
                            <button
                                onClick={() => setShowDeleteConfirm(null)}
                                className="flex-1 py-4 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-2xl font-bold hover:bg-gray-200 dark:hover:bg-gray-700 transition-all"
                            >
                                Keep Lead
                            </button>
                            <button
                                onClick={() => handleDeleteLead(showDeleteConfirm)}
                                className="flex-1 py-4 bg-red-600 hover:bg-red-700 text-white rounded-2xl font-bold transition-all shadow-lg shadow-red-500/20"
                            >
                                Yes, Delete
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
