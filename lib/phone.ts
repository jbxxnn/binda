export function normalizePhoneNumber(phone: string) {
  const digitsOnly = phone.trim().replace(/\D/g, "");

  if (!digitsOnly) {
    return "";
  }

  if (digitsOnly.startsWith("234") && digitsOnly.length === 13) {
    return digitsOnly;
  }

  if (digitsOnly.startsWith("0") && digitsOnly.length === 11) {
    return `234${digitsOnly.slice(1)}`;
  }

  if (digitsOnly.length === 10) {
    return `234${digitsOnly}`;
  }

  if (digitsOnly.startsWith("2340") && digitsOnly.length === 14) {
    return `234${digitsOnly.slice(4)}`;
  }

  return digitsOnly;
}

export function isValidNigerianPhoneNumber(phone: string) {
  const normalized = normalizePhoneNumber(phone);
  return /^234\d{10}$/.test(normalized);
}

export function candidatePhoneNumbers(phone: string) {
  const raw = phone.trim();
  const normalized = normalizePhoneNumber(phone);
  const localWithZero = normalized.startsWith("234") ? `0${normalized.slice(3)}` : "";
  const localWithoutZero = normalized.startsWith("234") ? normalized.slice(3) : "";
  const plusFormatted = normalized ? `+${normalized}` : "";

  return Array.from(
    new Set([raw, normalized, plusFormatted, localWithZero, localWithoutZero].filter(Boolean))
  );
}
