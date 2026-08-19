"use client";

import BrandLoader from '@/components/ui/BrandLoader';

import React, { useRef, useState } from 'react';
import { FileText, Image as ImageIcon, Paperclip, Send, Smile, X } from 'lucide-react';
import { useMessages } from '@/contexts/MessagesContext';
import EmojiPicker from '@/components/ui/EmojiPicker';
import { uploadMediaFile } from '@/services/mediaService';
import type { MessageAttachment } from '@/services/messagesService';

interface MessageInputProps {
    conversationId: string;
    onSend?: (id: string, text: string, attachments: any[]) => void;
}

const MAX_ATTACHMENTS = 5;
const MESSAGE_ATTACHMENT_ACCEPT = '.jpg,.jpeg,.png,.webp,.gif,.pdf,.doc,.docx,.xls,.xlsx,.txt,.csv,.rtf,.mp4,.webm,.mov';

export default function MessageInput({ conversationId, onSend }: MessageInputProps) {
    const [message, setMessage] = useState('');
    const [pendingFiles, setPendingFiles] = useState<File[]>([]);
    const [isEmojiPickerOpen, setIsEmojiPickerOpen] = useState(false);
    const [isSending, setIsSending] = useState(false);
    const [composerError, setComposerError] = useState<string | null>(null);
    const { sendMessage } = useMessages();
    const fileInputRef = useRef<HTMLInputElement | null>(null);

    const handleSelectFiles = (event: React.ChangeEvent<HTMLInputElement>) => {
        const nextFiles = Array.from(event.target.files || []);
        event.currentTarget.value = '';
        if (nextFiles.length === 0) {
            return;
        }

        setComposerError(null);
        setPendingFiles((previous) => {
            const existingKeys = new Set(previous.map((file) => `${file.name}-${file.size}-${file.lastModified}`));
            const merged = [...previous];

            nextFiles.forEach((file) => {
                const key = `${file.name}-${file.size}-${file.lastModified}`;
                if (!existingKeys.has(key) && merged.length < MAX_ATTACHMENTS) {
                    merged.push(file);
                    existingKeys.add(key);
                }
            });

            return merged;
        });
    };

    const removePendingFile = (fileToRemove: File) => {
        setPendingFiles((previous) => previous.filter((file) => file !== fileToRemove));
    };

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!message.trim() && pendingFiles.length === 0) {
            return;
        }

        setIsSending(true);
        setComposerError(null);

        try {
            let attachments: MessageAttachment[] = [];
            if (pendingFiles.length > 0) {
                const uploadedFiles = await Promise.all(
                    pendingFiles.map((file) => uploadMediaFile(file, 'message', conversationId, file.name)),
                );

                attachments = uploadedFiles.map((uploadedFile) => ({
                    id: uploadedFile.id,
                    file_url: uploadedFile.file_url,
                    file_name: uploadedFile.original_name || uploadedFile.file_name,
                    mime_type: uploadedFile.mime_type,
                    file_size: uploadedFile.file_size,
                    storage_path: uploadedFile.storage_path,
                }));
            }

            if (onSend) {
                await Promise.resolve(onSend(conversationId, message, attachments));
            } else {
                await sendMessage(conversationId, message, attachments);
            }

            setMessage('');
            setPendingFiles([]);
            setIsEmojiPickerOpen(false);
        } catch (error: any) {
            setComposerError(error?.message || 'Unable to send the message right now.');
        } finally {
            setIsSending(false);
        }
    };

    return (
        <div className="p-4 bg-white dark:bg-gray-800 border-t dark:border-gray-700">
            <input
                ref={fileInputRef}
                type="file"
                name="message-attachments"
                aria-label="Attach files to message"
                multiple
                accept={MESSAGE_ATTACHMENT_ACCEPT}
                className="hidden"
                onChange={handleSelectFiles}
            />
            {pendingFiles.length > 0 && (
                <div className="mb-3 flex flex-wrap gap-2">
                    {pendingFiles.map((file) => {
                        const isImage = file.type.startsWith('image/');
                        return (
                            <div
                                key={`${file.name}-${file.size}-${file.lastModified}`}
                                className="inline-flex max-w-full items-center gap-2 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200"
                            >
                                {isImage ? <ImageIcon size={16} /> : <FileText size={16} />}
                                <span className="max-w-[180px] truncate">{file.name}</span>
                                <button
                                    type="button"
                                    onClick={() => removePendingFile(file)}
                                    className="rounded-full p-1 text-gray-400 transition-colors hover:bg-gray-200 hover:text-gray-700 dark:hover:bg-gray-700 dark:hover:text-white"
                                    aria-label={`Remove ${file.name}`}
                                >
                                    <X size={14} />
                                </button>
                            </div>
                        );
                    })}
                </div>
            )}
            <form onSubmit={handleSend} className="flex items-center gap-2">
                <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isSending || pendingFiles.length >= MAX_ATTACHMENTS}
                    className="p-2 text-gray-400 hover:text-orange-500 transition-colors"
                    aria-label="Attach files"
                >
                    <Paperclip size={20} />
                </button>

                <div className="flex-1 relative">
                    <input
                        type="text"
                        placeholder="Type your message..."
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        className="w-full pl-4 pr-10 py-2.5 bg-gray-50 dark:bg-gray-900 border dark:border-gray-700 rounded-xl outline-none focus:ring-2 focus:ring-orange-500 transition-all text-sm text-gray-900 dark:text-white"
                    />
                    <button
                        type="button"
                        onClick={() => setIsEmojiPickerOpen((current) => !current)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-orange-500"
                        aria-label="Open emoji picker"
                    >
                        <Smile size={18} />
                    </button>
                    <EmojiPicker
                        isOpen={isEmojiPickerOpen}
                        onClose={() => setIsEmojiPickerOpen(false)}
                        onEmojiSelect={(emoji) => setMessage((current) => `${current}${emoji}`)}
                    />
                </div>

                <button
                    type="submit"
                    disabled={isSending || (!message.trim() && pendingFiles.length === 0)}
                    className="p-2.5 bg-orange-500 text-white rounded-xl shadow-lg shadow-orange-500/20 hover:bg-orange-600 disabled:opacity-50 disabled:shadow-none transition-all active:scale-95"
                    aria-label="Send message"
                >
                    {isSending ? <BrandLoader size={20} className="" /> : <Send size={20} />}
                </button>
            </form>
            <div className="mt-2 flex items-center justify-between gap-3 text-xs text-gray-500 dark:text-gray-400">
                <span>{pendingFiles.length > 0 ? `${pendingFiles.length}/${MAX_ATTACHMENTS} files attached` : 'Images, PDFs, Word docs, spreadsheets, text files, and videos can be sent here.'}</span>
                {composerError ? <span className="text-red-500">{composerError}</span> : null}
            </div>
        </div>
    );
}
