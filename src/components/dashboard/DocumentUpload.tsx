"use client";

import React, { useState, useRef } from 'react';
import {
    Upload,
    X,
    FileText,
    Image as ImageIcon,
    CheckCircle,
    XCircle,
    Clock,
    Download,
    Trash2,
    Edit
} from 'lucide-react';

interface DocumentUploadProps {
    documents: any[];
    onUpload: (doc: any) => void;
    onDelete: (id: string) => void;
    onReplace: (id: string) => void;
    maxSize?: number;
}

const DocumentUpload: React.FC<DocumentUploadProps> = ({
    documents = [],
    onUpload,
    onDelete,
    onReplace,
    maxSize = 10 * 1024 * 1024
}) => {
    const [dragActive, setDragActive] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleDrag = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === 'dragenter' || e.type === 'dragover') {
            setDragActive(true);
        } else if (e.type === 'dragleave') {
            setDragActive(false);
        }
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);

        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            handleFiles(Array.from(e.dataTransfer.files));
        }
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            handleFiles(Array.from(e.target.files));
        }
    };

    const handleFiles = (files: File[]) => {
        const validFiles = files.filter((file) => {
            if (file.size > maxSize) {
                alert(`File ${file.name} is too large. Maximum size is ${(maxSize / (1024 * 1024)).toFixed(0)}MB.`);
                return false;
            }
            const validTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];
            if (!validTypes.includes(file.type)) {
                alert(`File ${file.name} has an invalid type. Please upload PDF or image files.`);
                return false;
            }
            return true;
        });

        validFiles.forEach((file) => {
            const document = {
                id: `doc-${Date.now()}-${Math.random()}`,
                name: file.name,
                type: file.type,
                size: file.size,
                file: file,
                status: 'pending',
                uploadedAt: new Date().toISOString(),
                url: URL.createObjectURL(file),
            };
            onUpload(document);
        });
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'approved': return <CheckCircle size={16} className="text-green-500" />;
            case 'rejected': return <XCircle size={16} className="text-red-500" />;
            default: return <Clock size={16} className="text-orange-500" />;
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'approved': return 'bg-green-50 dark:bg-green-900/10';
            case 'rejected': return 'bg-red-50 dark:bg-red-900/10';
            default: return 'bg-white dark:bg-gray-800 hover:shadow-md transition-all';
        }
    };

    const formatFileSize = (bytes: number) => {
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
        return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    };

    return (
        <div className="space-y-6">
            <div
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`rounded-3xl p-10 text-center transition-all cursor-pointer group ${dragActive
                    ? 'bg-orange-50 dark:bg-orange-900/20 shadow-inner'
                    : 'bg-gray-50/50 dark:bg-gray-900/20 hover:bg-gray-100 dark:hover:bg-gray-800'
                    }`}
            >
                <div className="w-16 h-16 bg-white dark:bg-gray-800 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-sm group-hover:scale-110 transition-transform">
                    <Upload className={`transition-colors ${dragActive ? 'text-orange-500' : 'text-gray-400'}`} size={28} />
                </div>
                <p className="text-sm font-bold text-gray-900 dark:text-white">
                    Drop files here, or <span className="text-orange-600 dark:text-orange-400">browse</span>
                </p>
                <p className="text-[10px] uppercase font-bold tracking-widest text-gray-400 mt-2">
                    PDF, JPG, PNG up to 10MB
                </p>
                <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={handleFileSelect}
                    className="hidden"
                />
            </div>

            {documents.length > 0 && (
                <div className="space-y-3">
                    {documents.map((doc) => (
                        <div
                            key={doc.id}
                            className={`flex items-center gap-4 p-4 rounded-2xl ${getStatusColor(doc.status)} shadow-sm`}
                        >
                            <div className="w-10 h-10 bg-gray-100 dark:bg-gray-700 rounded-xl flex items-center justify-center">
                                {doc.type.startsWith('image/') ? <ImageIcon size={20} className="text-gray-500" /> : <FileText size={20} className="text-gray-500" />}
                            </div>

                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                    <p className="font-bold text-gray-900 dark:text-white truncate text-sm">
                                        {doc.name}
                                    </p>
                                    {getStatusIcon(doc.status)}
                                </div>
                                <div className="flex items-center gap-3 mt-0.5">
                                    <span className="text-[10px] font-bold text-gray-400">{(doc.size / 1024).toFixed(0)} KB</span>
                                    <span className="w-1 h-1 bg-gray-300 dark:bg-gray-600 rounded-full"></span>
                                    <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">
                                        {doc.status === 'approved' ? 'Verified' : 'Reviewing'}
                                    </span>
                                </div>
                            </div>

                            <div className="flex items-center gap-1">
                                {doc.url && (
                                    <a
                                        href={doc.url}
                                        download={doc.name}
                                        className="p-2 text-gray-400 hover:text-orange-500 hover:bg-orange-50 dark:hover:bg-orange-900/20 rounded-lg transition-all"
                                    >
                                        <Download size={18} />
                                    </a>
                                )}
                                <button
                                    onClick={() => onDelete(doc.id)}
                                    className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all"
                                >
                                    <Trash2 size={18} />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default DocumentUpload;
