type ProfileLabelInput = {
  displayName?: string | null;
  role?: string | null;
};

type ProfileMenuControlLabelInput = ProfileLabelInput & {
  isOpen: boolean;
};

function normalizeDisplayName(displayName?: string | null) {
  return displayName?.trim() || "your profile";
}

function normalizeRole(role?: string | null) {
  return `${(role?.trim() || "account").replace(/_/g, " ")} account`;
}

export function getProfileMenuControlLabel({
  displayName,
  role,
  isOpen,
}: ProfileMenuControlLabelInput) {
  const action = isOpen ? "Close" : "Open";
  return `${action} profile menu for ${normalizeDisplayName(displayName)}, ${normalizeRole(role)}`;
}

export function getProfileLinkLabel({ displayName, role }: ProfileLabelInput) {
  return `Open profile for ${normalizeDisplayName(displayName)}, ${normalizeRole(role)}`;
}
