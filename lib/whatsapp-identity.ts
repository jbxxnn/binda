import crypto from "node:crypto";

export type PinParseResult =
  | { type: "set"; pin: string }
  | { type: "verify"; pin: string }
  | { type: "lock" }
  | null;

export function parsePinCommand(input: string): PinParseResult {
  const normalized = input.trim().toLowerCase();

  if (normalized === "lock" || normalized === "logout") {
    return { type: "lock" };
  }

  const setMatch = normalized.match(/^set\s+pin\s+(\d{4})$/);
  if (setMatch) {
    return { type: "set", pin: setMatch[1] };
  }

  const verifyMatch = normalized.match(/^pin\s+(\d{4})$/);
  if (verifyMatch) {
    return { type: "verify", pin: verifyMatch[1] };
  }

  const plainPinMatch = normalized.match(/^(\d{4})$/);
  if (plainPinMatch) {
    return { type: "verify", pin: plainPinMatch[1] };
  }

  return null;
}

export function hashPin(pin: string) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(pin, salt, 64).toString("hex");
  return { salt, hash };
}

export function verifyPin(pin: string, salt: string, hash: string) {
  const candidate = crypto.scryptSync(pin, salt, 64).toString("hex");

  try {
    return crypto.timingSafeEqual(Buffer.from(candidate, "hex"), Buffer.from(hash, "hex"));
  } catch {
    return false;
  }
}

export function isPinSessionActive(lastVerifiedAt: string | null | undefined, sessionMinutes: number) {
  if (!lastVerifiedAt) {
    return false;
  }

  const verifiedAt = new Date(lastVerifiedAt).getTime();
  if (Number.isNaN(verifiedAt)) {
    return false;
  }

  return Date.now() - verifiedAt < sessionMinutes * 60 * 1000;
}
