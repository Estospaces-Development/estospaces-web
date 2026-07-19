import type { UserDocument } from '@/services/leadsService';

export function deduplicateDocuments(documents: UserDocument[]): UserDocument[] {
    const seen = new Map<string, UserDocument>();
    for (const doc of documents) {
        const key = `${doc.document_category}:${doc.file_name}:${doc.file_size}`;
        const existing = seen.get(key);
        if (!existing) {
            seen.set(key, doc);
        } else if (new Date(doc.created_at) > new Date(existing.created_at)) {
            seen.set(key, doc);
        }
    }
    return Array.from(seen.values());
}

export function isDuplicateDocument(documents: UserDocument[], file: File, documentType: string): boolean {
    const normalizedType = documentType.toLowerCase().replace(/[_\s]+/g, '_');
    for (const doc of documents) {
        if (doc.document_category.toLowerCase().replace(/[_\s]+/g, '_') !== normalizedType) continue;
        if (doc.file_name.toLowerCase() === file.name.toLowerCase() && doc.file_size === file.size) {
            return true;
        }
    }
    return false;
}
