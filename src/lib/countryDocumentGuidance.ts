import { LAUNCH_COUNTRY_CODE, UK_COUNTRY_CODE, type SupportedLaunchCountryCode } from "@/lib/launchLocale";

export type CountryDocumentKind = "identity" | "address";

export interface CountryDocumentGuidance {
  market: SupportedLaunchCountryCode;
  marketLabel: string;
  identityShort: string;
  addressShort: string;
  identityDetail: string;
  addressDetail: string;
  firstTimeSummary: string;
  rightToRentNote?: string;
}

const INDIA_DOCUMENT_GUIDANCE: CountryDocumentGuidance = {
  market: LAUNCH_COUNTRY_CODE,
  marketLabel: "India",
  identityShort: "Aadhaar, PAN/Form 60, passport, voter ID, or driving licence",
  addressShort: "Utility bill, bank statement, rent agreement, property tax receipt, or government address proof",
  identityDetail: "Identity proof for India: Aadhaar proof, PAN card or Form 60, passport, voter ID, driving licence, NREGA job card, or NPR letter. Prefer masked Aadhaar unless full-number verification is requested.",
  addressDetail: "Address proof for India: recent utility bill, bank statement, rent agreement, property tax receipt, Aadhaar address proof, or another government address document.",
  firstTimeSummary: "Upload identity and address proof for India together for admin review.",
};

const UK_DOCUMENT_GUIDANCE: CountryDocumentGuidance = {
  market: UK_COUNTRY_CODE,
  marketLabel: "England / UK",
  identityShort: "British or Irish passport, driving licence, BRP/BRC, or right-to-rent share code",
  addressShort: "Council tax bill, utility bill, bank statement, tenancy agreement, or HMRC/NHS/government letter",
  identityDetail: "Identity proof for England / UK: British or Irish passport, photocard driving licence, biometric residence permit/card where applicable, UKVI eVisa or right-to-rent share code, or an eligible immigration document.",
  addressDetail: "Address proof for England / UK: recent council tax bill, utility bill, bank or building society statement, tenancy agreement, HMRC/NHS/local council letter, or another dated official address document.",
  firstTimeSummary: "Upload identity and address proof for England / UK together for admin review.",
  rightToRentNote: "For renting in England, right-to-rent evidence may be required separately. British or Irish citizens can use passport/citizenship evidence; other users may need a share code or eligible immigration document.",
};

export const getCountryDocumentGuidance = (
  market?: SupportedLaunchCountryCode | null,
): CountryDocumentGuidance => (market === UK_COUNTRY_CODE ? UK_DOCUMENT_GUIDANCE : INDIA_DOCUMENT_GUIDANCE);

export const getCountryDocumentGuidanceText = (
  market: SupportedLaunchCountryCode | null | undefined,
  kind: CountryDocumentKind,
): string => {
  const guidance = getCountryDocumentGuidance(market);
  return kind === "identity" ? guidance.identityDetail : guidance.addressDetail;
};
