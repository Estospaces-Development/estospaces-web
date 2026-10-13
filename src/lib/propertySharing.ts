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

/** Why sharing is blocked for a non-public status, for the disabled share control's tooltip. */
export function getShareBlockedReason(status?: string | null): string {
  switch (String(status || "").trim().toLowerCase()) {
    case "pending_approval":
      return "Waiting for admin approval";
    case "rented":
    case "let":
      return "Rented properties can't be shared";
    case "sold":
      return "Sold properties can't be shared";
    case "draft":
      return "Draft properties can't be shared";
    default:
      return "Publish this property before sharing";
  }
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

export type PropertyLinkShareResult = "shared" | "copied" | "cancelled" | "unavailable";

/** Native share sheet when the device has one, else copy the public listing link. */
export async function sharePublicPropertyLink(
  { id, title }: { id: string; title: string },
  nav: Pick<Navigator, "share" | "clipboard"> | undefined = typeof navigator === "undefined" ? undefined : navigator,
  origin: string = typeof window === "undefined" ? "https://app.estospaces.com" : window.location.origin,
): Promise<PropertyLinkShareResult> {
  const url = `${origin}${getPublicPropertySharePath(id)}`;
  if (typeof nav?.share === "function") {
    try {
      await nav.share({ title, text: title, url });
      return "shared";
    } catch (error) {
      if ((error as { name?: string })?.name === "AbortError") {
        return "cancelled";
      }
    }
  }
  if (!nav?.clipboard?.writeText) {
    return "unavailable";
  }
  try {
    await nav.clipboard.writeText(url);
    return "copied";
  } catch {
    return "unavailable";
  }
}
