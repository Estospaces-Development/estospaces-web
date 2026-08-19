"use client";

import React, { useEffect, useRef, useState } from "react";
import {
  Check,
  Copy,
  Facebook,
  Linkedin,
  Mail,
  MessageCircle,
  Share2,
  Twitter,
  X,
} from "lucide-react";

import {
  buildPropertyShareTargets,
  getPublicPropertySharePath,
} from "@/lib/propertySharing";

interface ShareModalProps {
  property: {
    id: string;
    title: string;
    price?: string;
  };
  onClose: () => void;
  onShare?: (platform: string) => void;
}

const ShareModal: React.FC<ShareModalProps> = ({
  property,
  onClose,
  onShare,
}) => {
  const [copyStatus, setCopyStatus] = useState<"idle" | "copied" | "error">(
    "idle",
  );
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  const shareUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}${getPublicPropertySharePath(property.id)}`
      : `https://app.estospaces.com${getPublicPropertySharePath(property.id)}`;
  const targets = buildPropertyShareTargets({
    title: property.title,
    price: property.price || "Price on request",
    url: shareUrl,
  });

  useEffect(() => {
    const returnFocusTo = document.activeElement as HTMLElement | null;
    closeButtonRef.current?.focus();
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
        return;
      }
      if (event.key !== "Tab") {
        return;
      }
      const focusable = Array.from(
        dialogRef.current?.querySelectorAll<HTMLElement>(
          'button:not([disabled]), input:not([disabled]), a[href]',
        ) || [],
      );
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (!first || !last) {
        return;
      }
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      returnFocusTo?.focus();
    };
  }, [onClose]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopyStatus("copied");
      onShare?.("copy");
      window.setTimeout(() => setCopyStatus("idle"), 2000);
    } catch {
      setCopyStatus("error");
    }
  };

  const openShareTarget = (platform: keyof typeof targets) => {
    const target = targets[platform];
    if (platform === "email") {
      window.location.href = target;
    } else {
      window.open(target, "_blank", "noopener,noreferrer");
    }
    onShare?.(platform);
  };

  const shareOptions = [
    { name: "Email", id: "email" as const, icon: Mail, color: "text-gray-700", bg: "bg-gray-100" },
    { name: "WhatsApp", id: "whatsapp" as const, icon: MessageCircle, color: "text-green-700", bg: "bg-green-100" },
    { name: "Twitter / X", id: "twitter" as const, icon: Twitter, color: "text-sky-700", bg: "bg-sky-50" },
    { name: "Facebook", id: "facebook" as const, icon: Facebook, color: "text-blue-700", bg: "bg-blue-100" },
    { name: "LinkedIn", id: "linkedin" as const, icon: Linkedin, color: "text-blue-800", bg: "bg-blue-50" },
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-gray-950/70 p-3 backdrop-blur-sm sm:p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="share-property-title"
        aria-describedby="share-property-description"
        className="relative max-h-[calc(100dvh-1.5rem)] w-full max-w-md overflow-y-auto rounded-[1.75rem] border border-orange-100 bg-white p-5 shadow-[0_28px_90px_-28px_rgba(0,0,0,0.65)] sm:p-6 dark:border-orange-500/15 dark:bg-gray-900"
      >
        <button
          ref={closeButtonRef}
          type="button"
          onClick={onClose}
          aria-label="Close share property dialog"
          className="absolute right-4 top-4 rounded-lg p-2 text-gray-500 transition hover:bg-gray-100 hover:text-gray-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 dark:hover:bg-gray-800 dark:hover:text-white"
        >
          <X size={20} />
        </button>

        <div className="mb-6">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl border border-orange-200/80 bg-gradient-to-br from-orange-50 to-orange-100 shadow-sm dark:border-orange-500/20 dark:from-orange-950/70 dark:to-gray-900">
            <Share2 className="text-orange-700 dark:text-orange-300" size={24} />
          </div>
          <h2 id="share-property-title" className="text-xl font-bold text-gray-900 dark:text-white">
            Share this property
          </h2>
          <p id="share-property-description" className="mt-1 text-sm text-gray-600 dark:text-gray-300">
            Share the public listing for {property.title}.
          </p>
        </div>

        <div className="mb-6">
          <label htmlFor="share-property-link" className="mb-2 block text-sm font-semibold text-gray-700 dark:text-gray-300">
            Public property link
          </label>
          <div className="flex items-center gap-2 rounded-xl border border-gray-200 bg-gray-50 p-2 dark:border-gray-700 dark:bg-gray-800">
            <input
              id="share-property-link"
              type="text"
              readOnly
              value={shareUrl}
              className="min-w-0 flex-1 bg-transparent px-2 text-sm text-gray-700 outline-none dark:text-gray-200"
            />
            <button
              type="button"
              onClick={() => void handleCopy()}
              aria-label={copyStatus === "copied" ? "Property link copied" : "Copy property link"}
              className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-orange-600 px-3 text-sm font-semibold text-white transition hover:bg-orange-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2"
            >
              {copyStatus === "copied" ? <Check size={16} /> : <Copy size={16} />}
              {copyStatus === "copied" ? "Copied" : "Copy"}
            </button>
          </div>
          <p className="mt-2 text-xs text-gray-500 dark:text-gray-400" aria-live="polite">
            {copyStatus === "copied"
              ? "Public property link copied."
              : copyStatus === "error"
                ? "Copy failed. Select the public link and copy it manually."
                : "Anyone with this link can view the published listing."}
          </p>
        </div>

        <div className="grid grid-cols-3 gap-2 sm:grid-cols-5 sm:gap-3">
          {shareOptions.map((option) => (
            <button
              type="button"
              key={option.id}
              onClick={() => openShareTarget(option.id)}
              aria-label={`Share property via ${option.name}`}
              className="group flex min-h-20 min-w-0 flex-col items-center justify-center gap-2 rounded-2xl border border-transparent p-2 text-center transition hover:border-orange-100 hover:bg-orange-50/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 dark:hover:border-orange-500/15 dark:hover:bg-orange-950/20"
            >
              <span className={`flex h-11 w-11 items-center justify-center rounded-full ${option.bg} ${option.color}`}>
                <option.icon size={20} />
              </span>
              <span className="max-w-full break-words text-[11px] font-medium leading-tight text-gray-600 dark:text-gray-300">
                {option.name}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ShareModal;
