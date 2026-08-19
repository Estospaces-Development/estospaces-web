import { useEffect, useState } from 'react';
import { Download, FileText, Image as ImageIcon } from 'lucide-react';

import BrandLoader from '@/components/ui/BrandLoader';
import { getSupportAttachmentAccessUrl, type MessageAttachment } from '@/services/messagesService';

interface SupportAttachmentPreviewProps {
    attachment: MessageAttachment;
    emphasized?: boolean;
    onOpenAttachment?: (attachmentId: string) => void;
}

export const isSupportImageAttachment = (
    attachment: Pick<MessageAttachment, 'mime_type' | 'file_name' | 'file_url'>,
) => {
    if (attachment.mime_type?.trim().toLowerCase().startsWith('image/')) return true;

    const path = `${attachment.file_name} ${attachment.file_url}`.toLowerCase().split(/[?#]/, 1)[0];
    return /\.(?:avif|bmp|gif|jpe?g|png|webp)(?:\s|$)/.test(path);
};

export function SupportAttachmentPreview({
    attachment,
    emphasized = false,
    onOpenAttachment,
}: SupportAttachmentPreviewProps) {
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [previewFailed, setPreviewFailed] = useState(false);
    const isImage = isSupportImageAttachment(attachment);
    const canOpen = Boolean(attachment.id && onOpenAttachment);

    useEffect(() => {
        if (!isImage || !attachment.id) {
            setPreviewUrl(null);
            setPreviewFailed(false);
            return;
        }

        let active = true;
        setPreviewUrl(null);
        setPreviewFailed(false);

        void getSupportAttachmentAccessUrl(attachment.id)
            .then((response) => {
                if (!active) return;
                if (!response.access_url) {
                    setPreviewFailed(true);
                    return;
                }
                setPreviewUrl(response.access_url);
            })
            .catch(() => {
                if (active) setPreviewFailed(true);
            });

        return () => {
            active = false;
        };
    }, [attachment.id, isImage]);

    const buttonTone = emphasized
        ? 'bg-white/20 text-white hover:bg-white/25'
        : 'bg-orange-50 text-orange-700 hover:bg-orange-100 dark:bg-orange-500/10 dark:text-orange-200 dark:hover:bg-orange-500/20';

    if (!isImage) {
        return (
            <button
                type="button"
                onClick={() => attachment.id && onOpenAttachment?.(attachment.id)}
                disabled={!canOpen}
                className={`inline-flex min-h-11 max-w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-xs font-semibold transition ${buttonTone} disabled:cursor-not-allowed disabled:opacity-70`}
            >
                <FileText className="h-4 w-4 shrink-0" />
                <span className="min-w-0 truncate">{attachment.file_name}</span>
                <Download className="h-4 w-4 shrink-0" />
            </button>
        );
    }

    return (
        <div className={`w-full min-w-0 overflow-hidden rounded-2xl border ${emphasized ? 'border-white/20 bg-black/10' : 'border-orange-100 bg-orange-50/60 dark:border-orange-500/20 dark:bg-orange-500/5'}`}>
            <button
                type="button"
                onClick={() => attachment.id && onOpenAttachment?.(attachment.id)}
                disabled={!canOpen}
                className="block min-h-11 w-full text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-orange-500 disabled:cursor-not-allowed"
                aria-label={`Open image ${attachment.file_name}`}
            >
                {previewUrl && !previewFailed ? (
                    <img
                        src={previewUrl}
                        alt={attachment.file_name}
                        loading="lazy"
                        referrerPolicy="no-referrer"
                        onError={() => setPreviewFailed(true)}
                        className="max-h-72 w-full bg-gray-100 object-contain dark:bg-gray-950"
                    />
                ) : (
                    <span className={`flex min-h-32 w-full items-center justify-center gap-2 px-4 text-sm ${emphasized ? 'text-orange-50' : 'text-gray-500 dark:text-gray-300'}`}>
                        {previewFailed ? <ImageIcon className="h-5 w-5" /> : <BrandLoader size={22} />}
                        {previewFailed ? 'Preview unavailable — open image' : 'Loading secure preview'}
                    </span>
                )}
                <span className={`flex min-h-11 items-center gap-2 px-3 py-2 text-xs font-semibold ${emphasized ? 'text-white' : 'text-orange-700 dark:text-orange-200'}`}>
                    <ImageIcon className="h-4 w-4 shrink-0" />
                    <span className="min-w-0 flex-1 truncate">{attachment.file_name}</span>
                    <Download className="h-4 w-4 shrink-0" />
                </span>
            </button>
        </div>
    );
}
