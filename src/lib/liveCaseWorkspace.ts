export type WorkspaceSection =
  | "overview"
  | "documents"
  | "journey"
  | "messages"
  | "activity";

export type CaseFileTab = "overview" | "documents" | "tasks" | "activity";

const DEFAULT_WORKSPACE_SECTION: WorkspaceSection = "overview";
const DEFAULT_CASE_FILE_TAB: CaseFileTab = "overview";

const WORKSPACE_SECTION_TO_CASE_FILE_TAB: Record<WorkspaceSection, CaseFileTab> =
  {
    overview: "overview",
    documents: "documents",
    journey: "tasks",
    messages: "overview",
    activity: "activity",
  };

const CASE_FILE_TAB_TO_WORKSPACE_SECTION: Record<CaseFileTab, WorkspaceSection> =
  {
    overview: "overview",
    documents: "documents",
    tasks: "journey",
    activity: "activity",
  };

export const resolveWorkspaceSection = (
  value?: string | null,
  fallback: WorkspaceSection = DEFAULT_WORKSPACE_SECTION,
): WorkspaceSection => {
  switch (String(value || "").trim().toLowerCase()) {
    case "documents":
      return "documents";
    case "journey":
      return "journey";
    case "messages":
      return "messages";
    case "activity":
      return "activity";
    case "overview":
      return "overview";
    default:
      return fallback;
  }
};

export const workspaceSectionToCaseFileTab = (
  value?: string | null,
  fallback: CaseFileTab = DEFAULT_CASE_FILE_TAB,
): CaseFileTab => {
  const normalized = String(value || "").trim().toLowerCase();
  if (normalized === "tasks") {
    return "tasks";
  }
  if (
    normalized === "overview" ||
    normalized === "documents" ||
    normalized === "activity"
  ) {
    return normalized;
  }

  return (
    WORKSPACE_SECTION_TO_CASE_FILE_TAB[
      resolveWorkspaceSection(value, CASE_FILE_TAB_TO_WORKSPACE_SECTION[fallback])
    ] || fallback
  );
};

export const caseFileTabToWorkspaceSection = (
  tab?: CaseFileTab | null,
): WorkspaceSection =>
  CASE_FILE_TAB_TO_WORKSPACE_SECTION[tab || DEFAULT_CASE_FILE_TAB] ||
  DEFAULT_WORKSPACE_SECTION;
