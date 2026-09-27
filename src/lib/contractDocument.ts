import { normalizeContractStatus } from "@/lib/contractStatus";
import type { Contract } from "@/types/booking";

type ContractDocumentSource = Pick<
  Contract,
  | "id"
  | "status"
  | "property_id"
  | "contract_type"
  | "title"
  | "content"
  | "terms_and_conditions"
  | "contract_pdf_url"
  | "start_date"
  | "end_date"
  | "monthly_rent"
  | "deposit_amount"
  | "user_signed_at"
  | "manager_signed_at"
>;

/**
 * The booking service stores the agreement body in `terms_and_conditions`;
 * older or template-based records may use `content`. Prefer whichever is
 * populated so the user sees the same text the manager sees.
 */
export function getContractBodyText(contract: Partial<ContractDocumentSource> | null | undefined): string {
  const content = typeof contract?.content === "string" ? contract.content.trim() : "";
  if (content) return content;
  const terms = typeof contract?.terms_and_conditions === "string" ? contract.terms_and_conditions.trim() : "";
  return terms;
}

export function isContractFullySigned(contract: Partial<ContractDocumentSource>): boolean {
  return Boolean(contract.user_signed_at && contract.manager_signed_at)
    || normalizeContractStatus(contract.status) === "active";
}

/**
 * A stored PDF is always downloadable. Without one, the printable copy is only
 * offered once both parties have signed, so an unsigned draft is never saved
 * as if it were the executed agreement.
 */
export function canDownloadContract(contract: Partial<ContractDocumentSource>): boolean {
  if (typeof contract.contract_pdf_url === "string" && contract.contract_pdf_url.trim()) return true;
  return isContractFullySigned(contract);
}

export const CONTRACT_DOWNLOAD_UNAVAILABLE_MESSAGE =
  "Download is available once you and the manager have both signed.";

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const formatDate = (value?: string | null) => {
  if (!value) return "TBC";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "TBC" : date.toLocaleDateString("en-GB");
};

const titleCase = (value: string) => value.replace(/_/g, " ").replace(/\b\w/g, (character) => character.toUpperCase());

export interface ContractDocumentOptions {
  formatAmount: (amount?: number) => string;
  statusLabel?: string;
  generatedAt?: Date;
}

export function buildContractPrintableHtml(
  contract: ContractDocumentSource,
  options: ContractDocumentOptions,
): string {
  const heading = titleCase(contract.title?.trim() || contract.contract_type || "Contract");
  const body = getContractBodyText(contract);
  const generatedAt = options.generatedAt || new Date();
  const status = options.statusLabel || titleCase(normalizeContractStatus(contract.status));
  const rows: Array<[string, string]> = [
    ["Contract ID", contract.id],
    ["Property ID", contract.property_id || "Not recorded"],
    ["Status", status],
    ["Start date", formatDate(contract.start_date)],
    ["End date", formatDate(contract.end_date)],
    ["Monthly rent", contract.monthly_rent ? `${options.formatAmount(contract.monthly_rent)}/mo` : "TBC"],
    ["Deposit", contract.deposit_amount ? options.formatAmount(contract.deposit_amount) : "TBC"],
    ["Your signature", contract.user_signed_at ? `Signed ${formatDate(contract.user_signed_at)}` : "Pending"],
    ["Manager signature", contract.manager_signed_at ? `Signed ${formatDate(contract.manager_signed_at)}` : "Pending"],
  ];
  const signedNotice = isContractFullySigned(contract)
    ? ""
    : '<p class="notice">This agreement has not been signed by both parties.</p>';
  const bodyHtml = body
    ? `<pre class="terms">${escapeHtml(body)}</pre>`
    : '<p class="empty">No terms and conditions text is recorded on this contract.</p>';

  return `<!DOCTYPE html>
<html lang="en-GB">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(`${heading} ${contract.id}`)}</title>
<style>
body{font-family:Arial,Helvetica,sans-serif;color:#111827;margin:40px auto;max-width:760px;padding:0 16px;line-height:1.5}
h1{font-size:24px;margin:0 0 4px}
h2{font-size:16px;margin:28px 0 8px}
.meta{color:#6b7280;font-size:12px;margin:0 0 20px}
table{border-collapse:collapse;width:100%;font-size:14px}
th,td{border:1px solid #e5e7eb;padding:8px 10px;text-align:left;vertical-align:top}
th{background:#f9fafb;width:36%;font-weight:600}
.terms{white-space:pre-wrap;word-break:break-word;font-family:inherit;font-size:14px;margin:0}
.notice{border:1px solid #f59e0b;background:#fffbeb;color:#92400e;padding:8px 12px;font-weight:600}
.empty{color:#6b7280}
.footer{color:#6b7280;font-size:12px;margin-top:32px}
@media print{body{margin:0 auto}}
</style>
</head>
<body>
<h1>${escapeHtml(heading)}</h1>
<p class="meta">Estospaces contract record. Use your browser's Print option to save this copy as a PDF.</p>
${signedNotice}
<table>
<tbody>
${rows.map(([label, value]) => `<tr><th scope="row">${escapeHtml(label)}</th><td>${escapeHtml(value)}</td></tr>`).join("\n")}
</tbody>
</table>
<h2>Terms and conditions</h2>
${bodyHtml}
<p class="footer">Generated from the Estospaces contract record on ${escapeHtml(generatedAt.toLocaleString("en-GB"))}.</p>
</body>
</html>
`;
}

export function contractDocumentFileName(contract: Pick<Contract, "id">): string {
  const safeId = String(contract.id || "contract").replace(/[^a-zA-Z0-9-]/g, "");
  return `estospaces-contract-${safeId || "contract"}.html`;
}

/**
 * Opens a stored PDF when one exists; otherwise saves a printable HTML copy
 * built from the contract record the user is already authorised to read.
 */
export function downloadContractDocument(
  contract: ContractDocumentSource,
  options: ContractDocumentOptions,
): void {
  const pdfUrl = typeof contract.contract_pdf_url === "string" ? contract.contract_pdf_url.trim() : "";
  if (pdfUrl) {
    window.open(pdfUrl, "_blank", "noopener,noreferrer");
    return;
  }
  const blob = new Blob([buildContractPrintableHtml(contract, options)], { type: "text/html;charset=utf-8" });
  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = objectUrl;
  anchor.download = contractDocumentFileName(contract);
  anchor.rel = "noopener";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 0);
}
