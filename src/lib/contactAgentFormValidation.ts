export const CONTACT_AGENT_PHONE_ALLOWED_CHARACTERS_ERROR =
  "Please enter a valid phone number using digits, spaces, +, -, or brackets.";
export const CONTACT_AGENT_PHONE_LENGTH_ERROR =
  "Please enter a valid phone number with 7 to 15 digits.";

export function normalizeContactAgentPhone(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

export function validateContactAgentPhone(value: string): string | null {
  const normalizedPhone = normalizeContactAgentPhone(value);
  if (!normalizedPhone) {
    return null;
  }

  if (!/^[+\d][\d\s().-]*$/.test(normalizedPhone)) {
    return CONTACT_AGENT_PHONE_ALLOWED_CHARACTERS_ERROR;
  }

  const digitCount = normalizedPhone.replace(/\D/g, "").length;
  if (digitCount < 7 || digitCount > 15) {
    return CONTACT_AGENT_PHONE_LENGTH_ERROR;
  }

  return null;
}
