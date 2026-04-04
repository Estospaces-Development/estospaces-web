import { resolveWorkspaceSection, type WorkspaceSection } from "@/lib/liveCaseWorkspace";

export type ManagerApplicationTab = "overview" | "documents" | "history";

export type ManagerApplicationOverviewFocus = "journey" | "messages" | null;

export const resolveManagerApplicationTab = (
  section?: string | null,
): ManagerApplicationTab => {
  switch (resolveWorkspaceSection(section, "overview")) {
    case "documents":
      return "documents";
    case "activity":
      return "history";
    default:
      return "overview";
  }
};

export const resolveManagerApplicationOverviewFocus = (
  section?: string | null,
): ManagerApplicationOverviewFocus => {
  const resolvedSection = resolveWorkspaceSection(section, "overview");
  if (resolvedSection === "journey" || resolvedSection === "messages") {
    return resolvedSection;
  }

  return null;
};

export const resolveCaseFileRequestedSection = (
  section?: WorkspaceSection | null,
): WorkspaceSection | null => (section === "documents" ? "documents" : null);
