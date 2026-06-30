import { LAUNCH_CURRENCY_CODE } from "@/lib/launchLocale";

export interface SaleOfferPropertyInput {
  id?: string;
  listing_type?: string;
  manager_id?: string | null;
  currency?: string | null;
  country?: string | null;
}

export interface SaleOfferLeadInput {
  id?: string;
  matched_broker_id?: string | null;
  broker_id?: string | null;
}

export interface SaleOfferFastTrackCaseInput {
  id?: string;
  leadId?: string;
  managerId?: string;
}

export interface SaleOfferPayload {
  property_id: string;
  manager_id: string;
  lead_id?: string;
  fast_track_case_id?: string;
  amount: number;
  currency?: string;
  property_country?: string;
  notes?: string;
}

export const MAX_SALE_OFFER_NOTES_LENGTH = 1000;

const cleanId = (value?: string | null) => String(value || "").trim();
const cleanOfferText = (value: string) => value.trim().replace(/\s+/g, " ");

export const isSaleOfferListingType = (value?: string | null) => {
  const normalized = cleanId(value).toLowerCase();
  return normalized === "sale" || normalized === "buy";
};

export const parseSaleOfferAmount = (value: string | number): number | null => {
  if (typeof value === "number") {
    return Number.isFinite(value) && value > 0 ? value : null;
  }

  const normalized = value
    .trim()
    .replace(/,/g, "")
    .replace(/^[A-Z]{3}\s*/i, "")
    .replace(/[£$€]/g, "")
    .trim();

  if (!/^\d+(\.\d+)?$/.test(normalized)) {
    return null;
  }

  const amount = Number(normalized);
  return Number.isFinite(amount) && amount > 0 ? amount : null;
};

export const resolveSaleOfferManagerId = (
  property: SaleOfferPropertyInput | null,
  lead: SaleOfferLeadInput | null,
  fastTrackCase: SaleOfferFastTrackCaseInput | null,
) => (
  cleanId(lead?.matched_broker_id)
  || cleanId(lead?.broker_id)
  || cleanId(fastTrackCase?.managerId)
  || cleanId(property?.manager_id)
);

export const buildSaleOfferPayload = ({
  property,
  lead = null,
  fastTrackCase = null,
  amount,
  notes = "",
}: {
  property: SaleOfferPropertyInput | null;
  lead?: SaleOfferLeadInput | null;
  fastTrackCase?: SaleOfferFastTrackCaseInput | null;
  amount: string | number;
  notes?: string;
}): { payload: SaleOfferPayload | null; error: string | null } => {
  const propertyId = cleanId(property?.id);
  if (!propertyId) {
    return { payload: null, error: "Property details are still loading." };
  }

  if (!isSaleOfferListingType(property?.listing_type)) {
    return { payload: null, error: "Offers are only available for sale listings." };
  }

  const managerId = resolveSaleOfferManagerId(property, lead, fastTrackCase);
  if (!managerId) {
    return {
      payload: null,
      error: "This property does not have an assigned broker or manager yet. Please try again shortly.",
    };
  }

  const parsedAmount = parseSaleOfferAmount(amount);
  if (!parsedAmount) {
    return { payload: null, error: "Enter a valid offer amount." };
  }

  const leadId = cleanId(lead?.id) || cleanId(fastTrackCase?.leadId);
  const fastTrackCaseId = cleanId(fastTrackCase?.id);
  const offerNotes = cleanOfferText(notes);
  if (offerNotes.length > MAX_SALE_OFFER_NOTES_LENGTH) {
    return { payload: null, error: "Offer notes must be 1000 characters or fewer." };
  }

  const currency = cleanId(property?.currency) || LAUNCH_CURRENCY_CODE;
  const propertyCountry = cleanId(property?.country);

  return {
    payload: {
      property_id: propertyId,
      manager_id: managerId,
      ...(leadId ? { lead_id: leadId } : {}),
      ...(fastTrackCaseId ? { fast_track_case_id: fastTrackCaseId } : {}),
      amount: parsedAmount,
      currency,
      ...(propertyCountry ? { property_country: propertyCountry } : {}),
      ...(offerNotes ? { notes: offerNotes } : {}),
    },
    error: null,
  };
};
