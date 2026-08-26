import ActionSpinner from '@/components/ui/ActionSpinner';
import React, { useRef } from 'react';
import { Paperclip, Send, X } from 'lucide-react';
import type { SupportAttachmentDraft } from '@/services/supportService';

interface SupportComposerProps {
    value: string;
    onChange: (value: string) => void;
    onSubmit: () => void;
    onFilesSelected: (files: FileList | null) => void;
    onRemoveAttachment: (localId: string) => void;
    attachments: SupportAttachmentDraft[];
    disabled?: boolean;
    placeholder?: string;
    submitLabel?: string;
    canSubmit?: boolean;
}

const SUPPORT_ATTACHMENT_ACCEPT = [
    'application/pdf',
    'image/png',
    'image/jpeg',
    'image/webp',
    'text/plain',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    '.pdf',
    '.png',
    '.jpg',
    '.jpeg',
    '.webp',
    '.txt',
    '.doc',
    '.docx',
].join(',');

export function SupportComposer({
    value,
    onChange,
    onSubmit,
    onFilesSelected,
    onRemoveAttachment,
    attachments,
    disabled = false,
    placeholder = 'Write your message',
    submitLabel = 'Send reply',
    canSubmit = true,
}: SupportComposerProps) {
    const fileInputRef = useRef<HTMLInputElement | null>(null);

    return (
        <div className="rounded-[2rem] border border-orange-100 bg-white/95 p-4 shadow-sm dark:border-orange-500/15 dark:bg-gray-900/90">
            {attachments.length > 0 && (
                <div className="mb-4 flex flex-wrap gap-2">
                    {attachments.map((attachment) => (
                        <div
                            key={attachment.local_id}
                            className="inline-flex items-center gap-2 rounded-full border border-orange-200 bg-orange-50 px-3 py-1.5 text-xs font-medium text-orange-700 dark:border-orange-500/20 dark:bg-orange-500/10 dark:text-orange-200"
                        >
                            <span className="max-w-[220px] truncate">{attachment.file_name}</span>
                            <button
                                type="button"
                                onClick={() => onRemoveAttachment(attachment.local_id)}
                                className="rounded-full p-0.5 transition hover:bg-orange-200/60 dark:hover:bg-orange-500/20"
                                aria-label={`Remove ${attachment.file_name}`}
                            >
                                <X className="h-3.5 w-3.5" />
                            </button>
                        </div>
                    ))}
                </div>
            )}

            <textarea
                value={value}
                onChange={(event) => onChange(event.target.value)}
                rows={4}
                placeholder={placeholder}
                aria-label={placeholder}
                minLength={1}
                maxLength={4000}
                className="w-full resize-none rounded-[1.5rem] border border-transparent bg-gray-50 px-4 py-4 text-sm text-gray-900 outline-none transition focus:border-orange-300 focus:bg-white dark:bg-gray-800 dark:text-white dark:focus:border-orange-500/40"
            />

            <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                    <input
                        ref={fileInputRef}
                        type="file"
                        name="support-attachments"
                        aria-label="Attach files to support ticket"
                        multiple
                        accept={SUPPORT_ATTACHMENT_ACCEPT}
                        className="hidden"
                        onChange={(event) => {
                            onFilesSelected(event.target.files);
                            if (fileInputRef.current) {
                                fileInputRef.current.value = '';
                            }
                        }}
                    />
                    <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="inline-flex items-center gap-2 rounded-full border border-orange-200 px-3 py-2 text-sm font-semibold text-orange-700 transition hover:bg-orange-50 dark:border-orange-500/20 dark:text-orange-200 dark:hover:bg-orange-500/10"
                    >
                        <Paperclip className="h-4 w-4" />
                        Add files
                    </button>
                    <p className="text-xs text-gray-500 dark:text-gray-400">PDF, images, contracts, screenshots</p>
                </div>

                <button
                    type="button"
                    disabled={disabled || !canSubmit}
                    onClick={onSubmit}
                    className="inline-flex items-center gap-2 rounded-full bg-orange-500 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-orange-500/20 transition hover:-translate-y-0.5 hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-60"
                >
                    {disabled ? <ActionSpinner className="h-4 w-4" /> : <Send className="h-4 w-4" />}
                    {submitLabel}
                </button>
            </div>
        </div>
    );
}
