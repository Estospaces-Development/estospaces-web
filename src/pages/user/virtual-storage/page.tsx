import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  CheckCircle2,
  FileCheck2,
  FolderLock,
  Loader2,
  Plus,
  Save,
  ShieldCheck,
  Upload,
  X,
} from "lucide-react";

import UserActivitySubnav from "@/components/layout/UserActivitySubnav";
import { useAuth, type User } from "@/contexts/AuthContext";
import { getRedirectPath } from "@/lib/authUtils";
import { uploadDocument, type UserDocument } from "@/services/leadsService";
import {
  createVirtualStorageCategory,
  declineVirtualStorageSave,
  getVirtualStorageCategories,
  getVirtualStorageDocuments,
  saveDocumentToVirtualStorage,
  type VirtualStorageCategory,
} from "@/services/virtualStorageService";

interface UserVirtualStoragePageContentProps {
  currentUser: User | null;
  onBack?: () => void;
}

const DEFAULT_CATEGORIES: VirtualStorageCategory[] = [
  { id: "template:identity", name: "Identity", slug: "identity", source: "system" },
  { id: "template:address", name: "Address", slug: "address", source: "system" },
  { id: "template:financial", name: "Financial", slug: "financial", source: "system" },
  { id: "template:employment", name: "Employment", slug: "employment", source: "system" },
  { id: "template:reference", name: "Reference", slug: "reference", source: "system" },
  { id: "template:transactional", name: "Transactional", slug: "transactional", source: "system" },
  { id: "template:supporting", name: "Supporting", slug: "supporting", source: "system" },
];

const CATEGORY_UPLOAD_TYPES: Record<string, string> = {
  identity: "identity",
  address: "address",
  financial: "proof_of_funds",
  employment: "employment",
  reference: "reference",
  transactional: "transactional",
  supporting: "supporting_document",
};

const formatLabel = (value: string) =>
  value
    .split(/[_-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");

const categoryUploadType = (category: VirtualStorageCategory | undefined) =>
  CATEGORY_UPLOAD_TYPES[category?.slug || ""] || "supporting_document";

const categoryDocumentCategory = (category: VirtualStorageCategory | undefined) => {
  const slug = category?.slug || "supporting";
  if (CATEGORY_UPLOAD_TYPES[slug]) {
    return slug === "financial" ? "financial" : slug;
  }
  return "supporting";
};

export function UserVirtualStoragePageContent({
  currentUser,
  onBack,
}: UserVirtualStoragePageContentProps) {
  const [categories, setCategories] = useState<VirtualStorageCategory[]>(DEFAULT_CATEGORIES);
  const [documents, setDocuments] = useState<UserDocument[]>([]);
  const [customUnlocked, setCustomUnlocked] = useState(false);
  const [requiredSubmitted, setRequiredSubmitted] = useState<Record<string, boolean>>({
    identity: false,
    address: false,
  });
  const [selectedCategoryId, setSelectedCategoryId] = useState(DEFAULT_CATEGORIES[0].id);
  const [categoryName, setCategoryName] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const selectedCategory = useMemo(
    () => categories.find((category) => category.id === selectedCategoryId) || categories[0],
    [categories, selectedCategoryId],
  );
  const pendingSaveDocuments = documents.filter(
    (document) => document.virtual_storage_state === "pending_user_save",
  );
  const linkedDocuments = documents.filter((document) => (document.linked_entities || []).length > 0);
  const activeDocumentCount = documents.length;

  const loadVault = async () => {
    setLoading(true);
    setErrorMessage("");
    const [categoryResult, documentResult] = await Promise.all([
      getVirtualStorageCategories(),
      getVirtualStorageDocuments(),
    ]);
    if (categoryResult.data) {
      setCategories(categoryResult.data.categories.length > 0 ? categoryResult.data.categories : DEFAULT_CATEGORIES);
      setCustomUnlocked(categoryResult.data.custom_categories_unlocked);
      setRequiredSubmitted(categoryResult.data.required_documents_submitted || {});
    }
    if (documentResult.data) {
      setDocuments(documentResult.data.documents || []);
    }
    const error = categoryResult.error || documentResult.error;
    if (error) {
      setErrorMessage(error);
    }
    setLoading(false);
  };

  useEffect(() => {
    void loadVault();
  }, []);

  const handleCreateCategory = async () => {
    const name = categoryName.trim();
    if (!name) {
      setErrorMessage("Enter a category name.");
      return;
    }
    setSavingKey("category");
    setErrorMessage("");
    const result = await createVirtualStorageCategory({ name });
    setSavingKey(null);
    if (result.error || !result.data) {
      setErrorMessage(result.error || "Unable to create the category right now.");
      return;
    }
    setCategories((previous) => [...previous, result.data as VirtualStorageCategory]);
    setSelectedCategoryId(result.data.id);
    setCategoryName("");
    setStatusMessage("Category created.");
  };

  const handleUpload = async () => {
    if (!selectedFile || !selectedCategory) {
      setErrorMessage("Choose a file and category first.");
      return;
    }
    setSavingKey("upload");
    setErrorMessage("");
    const isStoredCategory = selectedCategory.source !== "system";
    const result = await uploadDocument(categoryUploadType(selectedCategory), selectedFile, {
      categoryId: isStoredCategory ? selectedCategory.id : "",
      documentCategory: categoryDocumentCategory(selectedCategory),
      virtualStorageState: "saved",
      reusable: true,
    });
    setSavingKey(null);
    if (!result.success || result.error || !result.data) {
      setErrorMessage(result.error || "Unable to upload the document right now.");
      return;
    }
    setDocuments((previous) => [result.data as UserDocument, ...previous]);
    setSelectedFile(null);
    setStatusMessage("Document uploaded to Virtual Storage.");
  };

  const handleSavePending = async (document: UserDocument) => {
    setSavingKey(`save:${document.id}`);
    setErrorMessage("");
    const result = await saveDocumentToVirtualStorage(document.id, {});
    setSavingKey(null);
    if (result.error || !result.data) {
      setErrorMessage(result.error || "Unable to save the document right now.");
      return;
    }
    setDocuments((previous) =>
      previous.map((item) => (item.id === document.id ? (result.data as UserDocument) : item)),
    );
    setStatusMessage("Document saved to Virtual Storage.");
  };

  const handleDeclinePending = async (document: UserDocument) => {
    setSavingKey(`decline:${document.id}`);
    setErrorMessage("");
    const result = await declineVirtualStorageSave(document.id);
    setSavingKey(null);
    if (result.error) {
      setErrorMessage(result.error);
      return;
    }
    setDocuments((previous) => previous.filter((item) => item.id !== document.id));
    setStatusMessage("Document kept case-only.");
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20 dark:bg-gray-900">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <button
          type="button"
          onClick={onBack}
          className="mb-6 inline-flex items-center gap-2 text-sm font-bold text-gray-400 transition-colors hover:text-orange-500"
        >
          <span className="rounded-xl p-2 transition-colors hover:bg-orange-50 dark:hover:bg-orange-900/20">
            <ArrowLeft size={18} />
          </span>
          Dashboard
        </button>

        <UserActivitySubnav />

        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-orange-500">
              My Activity
            </p>
            <h1 className="mt-2 text-4xl font-black tracking-tight text-gray-900 dark:text-white">
              Virtual Storage
            </h1>
            <p className="mt-2 max-w-2xl text-sm font-medium leading-6 text-gray-500 dark:text-gray-400">
              Your private document vault for verification files, reusable uploads, and case-linked documents.
            </p>
          </div>
          <div className="inline-flex items-center gap-2 rounded-2xl bg-white px-4 py-2 text-xs font-bold uppercase tracking-widest text-gray-500 shadow-sm dark:bg-gray-800 dark:text-gray-300">
            <FolderLock size={16} className="text-orange-500" />
            Private by default
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-black">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-400">Documents</p>
            <p className="mt-3 text-3xl font-black text-gray-900 dark:text-white">{activeDocumentCount}</p>
          </div>
          <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-black">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-400">Linked</p>
            <p className="mt-3 text-3xl font-black text-gray-900 dark:text-white">{linkedDocuments.length}</p>
          </div>
          <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-black">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-400">Pending save</p>
            <p className="mt-3 text-3xl font-black text-gray-900 dark:text-white">{pendingSaveDocuments.length}</p>
          </div>
          <div className="rounded-2xl border border-orange-100 bg-orange-50 p-5 shadow-sm dark:border-orange-900/30 dark:bg-orange-950/20">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-orange-500">Fast-track limit</p>
            <p className="mt-3 text-3xl font-black text-orange-700 dark:text-orange-200">30</p>
          </div>
        </div>

            {errorMessage ? (
          <div role="alert" className="mt-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700 dark:border-red-900/30 dark:bg-red-950/20 dark:text-red-200">
            {errorMessage}
          </div>
        ) : null}
        {statusMessage ? (
          <div role="status" aria-live="polite" className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700 dark:border-emerald-900/30 dark:bg-emerald-950/20 dark:text-emerald-200">
            {statusMessage}
          </div>
        ) : null}

        <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
          <section className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-black">
            <div className="flex items-center gap-2 text-gray-900 dark:text-white">
              <ShieldCheck className="h-5 w-5 text-orange-500" />
              <h2 className="text-lg font-semibold">Categories</h2>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {categories.map((category) => (
                <button
                  key={category.id}
                  type="button"
                  aria-pressed={selectedCategoryId === category.id}
                  onClick={() => setSelectedCategoryId(category.id)}
                  className={`rounded-full border px-3 py-1.5 text-sm font-semibold transition-colors ${
                    selectedCategoryId === category.id
                      ? "border-orange-200 bg-orange-50 text-orange-700 dark:border-orange-500/30 dark:bg-orange-500/10 dark:text-orange-200"
                      : "border-gray-200 text-gray-600 hover:border-orange-200 hover:text-orange-600 dark:border-zinc-700 dark:text-gray-300"
                  }`}
                >
                  {category.name}
                </button>
              ))}
            </div>

            <div className="mt-6 rounded-2xl border border-gray-100 bg-gray-50 p-4 dark:border-zinc-800 dark:bg-zinc-900/50">
              <div className="flex items-center gap-2">
                {customUnlocked ? (
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                ) : (
                  <ShieldCheck className="h-4 w-4 text-orange-500" />
                )}
                <p className="text-sm font-semibold text-gray-900 dark:text-white">Custom categories</p>
              </div>
              <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                {customUnlocked
                  ? "Identity and Address are submitted, so custom categories are unlocked."
                  : `Submit Identity and Address first. Identity: ${requiredSubmitted.identity ? "done" : "needed"}, Address: ${requiredSubmitted.address ? "done" : "needed"}.`}
              </p>
              <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                <input
                  aria-label="New custom category name"
                  value={categoryName}
                  disabled={!customUnlocked || savingKey === "category"}
                  onChange={(event) => setCategoryName(event.target.value)}
                  className="min-w-0 flex-1 rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 outline-none focus:border-orange-400 disabled:cursor-not-allowed disabled:opacity-60 dark:border-zinc-700 dark:bg-black dark:text-white"
                  placeholder="Category name"
                />
                <button
                  type="button"
                  disabled={!customUnlocked || savingKey === "category"}
                  onClick={() => void handleCreateCategory()}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-orange-500 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {savingKey === "category" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                  Add
                </button>
              </div>
            </div>
          </section>

          <section className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-black">
            <div className="flex items-center gap-2 text-gray-900 dark:text-white">
              <Upload className="h-5 w-5 text-orange-500" />
              <h2 className="text-lg font-semibold">Upload to Virtual Storage</h2>
            </div>
            <div className="mt-4 grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] md:items-end">
              <label htmlFor="virtual-storage-category" className="space-y-2 text-sm">
                <span className="font-medium text-gray-700 dark:text-gray-300">Category</span>
                <select
                  id="virtual-storage-category"
                  value={selectedCategoryId}
                  onChange={(event) => setSelectedCategoryId(event.target.value)}
                  className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-gray-900 outline-none focus:border-orange-400 dark:border-zinc-700 dark:bg-zinc-900 dark:text-white"
                >
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </label>
              <label htmlFor="virtual-storage-file" className="space-y-2 text-sm">
                <span className="font-medium text-gray-700 dark:text-gray-300">File</span>
                <input
                  id="virtual-storage-file"
                  type="file"
                  accept="application/pdf,image/*,.pdf"
                  onChange={(event) => setSelectedFile(event.target.files?.[0] || null)}
                  className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-gray-900 file:mr-3 file:rounded-xl file:border-0 file:bg-orange-50 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-orange-700 dark:border-zinc-700 dark:bg-zinc-900 dark:text-white dark:file:bg-orange-500/10 dark:file:text-orange-200"
                />
              </label>
              <button
                type="button"
                onClick={() => void handleUpload()}
                disabled={!selectedFile || savingKey === "upload"}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-orange-500 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {savingKey === "upload" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                Upload
              </button>
            </div>
          </section>
        </div>

        {pendingSaveDocuments.length > 0 ? (
          <section className="mt-8 rounded-3xl border border-orange-100 bg-white p-6 shadow-sm dark:border-orange-900/30 dark:bg-black">
            <div className="flex items-center gap-2 text-gray-900 dark:text-white">
              <Save className="h-5 w-5 text-orange-500" />
              <h2 className="text-lg font-semibold">Save to Virtual Storage?</h2>
            </div>
            <div className="mt-4 space-y-3">
              {pendingSaveDocuments.map((document) => (
                <div key={document.id} className="flex flex-col gap-3 rounded-2xl border border-gray-100 bg-gray-50 p-4 dark:border-zinc-800 dark:bg-zinc-900/50 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="font-semibold text-gray-900 dark:text-white">{document.file_name}</p>
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                      Uploaded by manager for {formatLabel(document.document_category)}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => void handleSavePending(document)}
                      disabled={savingKey === `save:${document.id}`}
                      className="inline-flex items-center gap-2 rounded-2xl bg-orange-500 px-3 py-2 text-sm font-semibold text-white hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {savingKey === `save:${document.id}` ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                      Save
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleDeclinePending(document)}
                      disabled={savingKey === `decline:${document.id}`}
                      className="inline-flex items-center gap-2 rounded-2xl border border-gray-200 px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-white disabled:cursor-not-allowed disabled:opacity-60 dark:border-zinc-700 dark:text-gray-200 dark:hover:bg-black"
                    >
                      <X className="h-4 w-4" />
                      Keep case-only
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        ) : null}

        <section className="mt-8 rounded-3xl border border-gray-100 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-black">
          <div className="flex items-center gap-2 text-gray-900 dark:text-white">
            <FileCheck2 className="h-5 w-5 text-orange-500" />
            <h2 className="text-lg font-semibold">Stored documents</h2>
          </div>
          <div className="mt-4 space-y-3">
            {loading ? (
              <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading Virtual Storage
              </div>
            ) : documents.length > 0 ? (
              documents.map((document) => (
                <div key={document.id} className="rounded-2xl border border-gray-100 bg-gray-50 p-4 dark:border-zinc-800 dark:bg-zinc-900/50">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-gray-900 dark:text-white">{document.file_name}</p>
                      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                        {formatLabel(document.document_category)} - {formatLabel(document.status)}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <span className="rounded-full border border-gray-200 px-3 py-1 text-xs font-semibold text-gray-600 dark:border-zinc-700 dark:text-gray-300">
                        {formatLabel(document.virtual_storage_state || "saved")}
                      </span>
                      {(document.linked_entities || []).map((entity) => (
                        <span key={`${document.id}:${entity.id}`} className="rounded-full border border-orange-200 bg-orange-50 px-3 py-1 text-xs font-semibold text-orange-700 dark:border-orange-500/30 dark:bg-orange-500/10 dark:text-orange-200">
                          Linked case
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <p className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 px-4 py-5 text-sm text-gray-500 dark:border-zinc-700 dark:bg-zinc-900/40 dark:text-gray-400">
                No documents in Virtual Storage yet.
              </p>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

function UserVirtualStorageWrongRoleState({
  role,
  onOpenDashboard,
}: {
  role?: string;
  onOpenDashboard: () => void;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-6 text-center dark:bg-gray-900">
      <div className="max-w-lg rounded-3xl border border-orange-100 bg-white p-8 shadow-sm dark:border-orange-900/30 dark:bg-gray-800">
        <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-orange-500">Access denied</p>
        <h1 className="mt-3 text-2xl font-black text-gray-900 dark:text-white">
          Virtual Storage is only available to user accounts.
        </h1>
        <p className="mt-3 text-sm leading-6 text-gray-500 dark:text-gray-400">
          You are signed in as {role || "another role"}.
        </p>
        <button
          type="button"
          onClick={onOpenDashboard}
          className="mt-6 rounded-2xl bg-orange-600 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-orange-700"
        >
          Open my dashboard
        </button>
      </div>
    </div>
  );
}

export default function UserVirtualStoragePage() {
  const navigate = useNavigate();
  const { user: currentUser, loading: authLoading, isAuthenticated } = useAuth();

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate("/login", { replace: true });
    }
  }, [authLoading, isAuthenticated, navigate]);

  if (authLoading || (isAuthenticated && !currentUser)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-900">
        <Loader2 className="h-10 w-10 animate-spin text-orange-500" />
      </div>
    );
  }

  if (isAuthenticated && currentUser?.role !== "user") {
    return (
      <UserVirtualStorageWrongRoleState
        role={currentUser?.role}
        onOpenDashboard={() => navigate(getRedirectPath(currentUser?.role), { replace: true })}
      />
    );
  }

  return (
    <UserVirtualStoragePageContent
      currentUser={currentUser}
      onBack={() => navigate("/user/dashboard")}
    />
  );
}
