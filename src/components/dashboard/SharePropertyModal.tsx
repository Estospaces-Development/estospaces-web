"use client";

import type { Property } from "@/contexts/PropertyContext";

import ShareModal from "./ShareModal";

interface SharePropertyModalProps {
  isOpen: boolean;
  onClose: () => void;
  property: Property | null;
  onShare?: (platform: string) => void;
}

const SharePropertyModal = ({
  isOpen,
  onClose,
  property,
  onShare,
}: SharePropertyModalProps) => {
  if (!isOpen || !property) {
    return null;
  }

  const price =
    property.priceString ||
    (property.price?.amount
      ? `${property.price.currency} ${property.price.amount}`
      : "Price on request");

  return (
    <ShareModal
      property={{
        id: property.id,
        title: property.title,
        price,
      }}
      onClose={onClose}
      onShare={onShare}
    />
  );
};

export default SharePropertyModal;
