export type ManagerLeadSortMode = "newest" | "client_az" | "budget_desc" | "score_desc";

export interface ManagerLeadListItem {
  created_at?: string;
  name?: string;
  email?: string;
  budget?: string;
  score?: number;
}

const parseBudgetAmount = (value?: string) => {
  const normalized = String(value || "").replace(/,/g, "");
  const match = normalized.match(/\d+(?:\.\d+)?/);
  return match ? Number(match[0]) : 0;
};

const getClientLabel = (lead: ManagerLeadListItem) => (
  String(lead.name || lead.email || "").trim().toLowerCase()
);

const getCreatedAt = (lead: ManagerLeadListItem) => {
  const timestamp = new Date(lead.created_at || "").getTime();
  return Number.isFinite(timestamp) ? timestamp : 0;
};

export const sortManagerLeads = <T extends ManagerLeadListItem>(
  leads: T[],
  mode: ManagerLeadSortMode,
) => [...leads].sort((left, right) => {
  switch (mode) {
    case "client_az":
      return getClientLabel(left).localeCompare(getClientLabel(right)) || getCreatedAt(right) - getCreatedAt(left);
    case "budget_desc":
      return parseBudgetAmount(right.budget) - parseBudgetAmount(left.budget) || getCreatedAt(right) - getCreatedAt(left);
    case "score_desc":
      return Number(right.score || 0) - Number(left.score || 0) || getCreatedAt(right) - getCreatedAt(left);
    default:
      return getCreatedAt(right) - getCreatedAt(left);
  }
});

export const paginateManagerLeads = <T>(
  leads: T[],
  requestedPage: number,
  pageSize: number,
) => {
  const safePageSize = Math.max(1, pageSize);
  const totalPages = Math.max(1, Math.ceil(leads.length / safePageSize));
  const currentPage = Math.min(Math.max(1, requestedPage), totalPages);
  const startIndex = (currentPage - 1) * safePageSize;

  return {
    items: leads.slice(startIndex, startIndex + safePageSize),
    currentPage,
    totalPages,
  };
};
