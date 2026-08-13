const PUBLIC_PROPERTY_STATUSES = new Set([
  "active",
  "available",
  "coming_soon",
  "online",
  "published",
  "under_contract",
  "under_offer",
]);

export interface PropertyShareTargets {
  email: string;
  facebook: string;
  linkedin: string;
  twitter: string;
  whatsapp: string;
}

export function isPropertyPubliclyShareable(status?: string | null): boolean {
  return PUBLIC_PROPERTY_STATUSES.has(String(status || "").trim().toLowerCase());
}

export function getPublicPropertySharePath(propertyId: string): string {
  return `/user/properties/${encodeURIComponent(propertyId.trim())}`;
}

export function buildPropertyShareTargets({
  title,
  price,
  url,
}: {
  title: string;
  price: string;
  url: string;
}): PropertyShareTargets {
  const summary = `${title} - ${price}`;
  const message = `${summary}\n${url}`;

  return {
    email: `mailto:?subject=${encodeURIComponent(`${title} - Property Listing`)}&body=${encodeURIComponent(`View this property on Estospaces:\n\n${message}`)}`,
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
    linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`,
    twitter: `https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(summary)}`,
    whatsapp: `https://wa.me/?text=${encodeURIComponent(message)}`,
  };
}
