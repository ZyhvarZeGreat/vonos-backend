/**
 * Shared client-side form validation for HQ6 / auth forms.
 * Returns a human-readable error string, or null when valid.
 */

const EMAIL_RE =
  /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;

/** Letters, spaces, hyphens, apostrophes, periods — no digits. */
const PERSON_NAME_RE = /^[\p{L}\s.'’-]+$/u;

/**
 * Contact last name may include registration / plate numbers
 * (alphanumeric + common separators).
 */
const CONTACT_LAST_NAME_RE = /^[\p{L}\p{N}\s.'’\-]+$/u;

/** Login username: letters, digits, . _ - (not an email unless it looks like one). */
const USERNAME_RE = /^[a-zA-Z][a-zA-Z0-9._-]{1,63}$/;

const PHONE_RE = /^[+]?[\d\s().-]{7,20}$/;

export function isValidEmail(value: string): boolean {
  const v = value.trim();
  if (!v || v.length > 254) return false;
  return EMAIL_RE.test(v);
}

export function isValidPersonName(value: string): boolean {
  const v = value.trim();
  if (!v) return false;
  if (/\d/.test(v)) return false;
  return PERSON_NAME_RE.test(v);
}

export function isValidUsername(value: string): boolean {
  const v = value.trim();
  if (!v) return false;
  if (v.includes("@")) return isValidEmail(v);
  return USERNAME_RE.test(v);
}

export function isValidUrl(value: string): boolean {
  const v = value.trim();
  if (!v) return false;
  try {
    const parsed = new URL(v.includes("://") ? v : `https://${v}`);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

export function isValidPhone(value: string): boolean {
  const v = value.trim();
  if (!v) return false;
  if (!PHONE_RE.test(v)) return false;
  const digits = v.replace(/\D/g, "");
  return digits.length >= 7 && digits.length <= 15;
}

export function validateRequired(value: string, label: string): string | null {
  if (!value.trim()) return `${label} is required.`;
  return null;
}

export function validatePersonName(
  value: string,
  label: string,
  options?: { required?: boolean },
): string | null {
  const required = options?.required !== false;
  const v = value.trim();
  if (!v) return required ? `${label} is required.` : null;
  if (/\d/.test(v)) return `${label} cannot contain numbers.`;
  if (!PERSON_NAME_RE.test(v)) {
    return `${label} can only include letters, spaces, hyphens, and apostrophes.`;
  }
  if (v.length < 2) return `${label} must be at least 2 characters.`;
  return null;
}

/** Last name on contacts — letters + digits (plates / registration nos). */
export function validateContactLastName(
  value: string,
  options?: { required?: boolean; label?: string },
): string | null {
  const label = options?.label ?? "Last name";
  const required = options?.required === true;
  const v = value.trim();
  if (!v) return required ? `${label} is required.` : null;
  if (!CONTACT_LAST_NAME_RE.test(v)) {
    return `${label} can include letters, numbers, spaces, hyphens, and apostrophes.`;
  }
  if (v.length < 1) return `${label} must be at least 1 character.`;
  return null;
}

export function validateEmail(
  value: string,
  options?: { required?: boolean; label?: string },
): string | null {
  const label = options?.label ?? "Email";
  const required = options?.required !== false;
  const v = value.trim();
  if (!v) return required ? `${label} is required.` : null;
  if (!isValidEmail(v)) return `Enter a valid ${label.toLowerCase()} address.`;
  return null;
}

export function validateUsername(
  value: string,
  options?: { required?: boolean },
): string | null {
  const required = options?.required === true;
  const v = value.trim();
  if (!v) return required ? "Email or username is required." : null;
  if (v.includes("@")) {
    if (!isValidEmail(v)) return "Enter a valid email address for login.";
    return null;
  }
  if (/\s/.test(v)) return "Username cannot contain spaces.";
  if (/^\d+$/.test(v)) return "Username cannot be only numbers.";
  if (!USERNAME_RE.test(v)) {
    return "Username must start with a letter and use only letters, numbers, . _ -";
  }
  return null;
}

export function validateUrl(
  value: string,
  options?: { required?: boolean; label?: string },
): string | null {
  const label = options?.label ?? "Website";
  const required = options?.required === true;
  const v = value.trim();
  if (!v) return required ? `${label} is required.` : null;
  if (!isValidUrl(v)) {
    return `Enter a valid ${label.toLowerCase()} URL (e.g. https://example.com).`;
  }
  return null;
}

export function validatePhone(
  value: string,
  options?: { required?: boolean; label?: string },
): string | null {
  const label = options?.label ?? "Phone";
  const required = options?.required === true;
  const v = value.trim();
  if (!v) return required ? `${label} is required.` : null;
  if (!isValidPhone(v)) {
    return `Enter a valid ${label.toLowerCase()} number.`;
  }
  return null;
}

import {
  isStrongPassword,
  strongPasswordMessage,
  PASSWORD_MIN_LENGTH,
} from "@/lib/validation/schemas";

export function validatePassword(
  value: string,
  options?: { required?: boolean; minLength?: number; strong?: boolean },
): string | null {
  const required = options?.required !== false;
  const strong = options?.strong !== false;
  if (!value) return required ? "Password is required." : null;
  if (strong) return strongPasswordMessage(value);
  const min = options?.minLength ?? PASSWORD_MIN_LENGTH;
  if (value.length < min) {
    return `Password must be at least ${min} characters.`;
  }
  return null;
}

export { isStrongPassword, strongPasswordMessage, PASSWORD_MIN_LENGTH };

export function validatePasswordConfirm(
  password: string,
  confirm: string,
): string | null {
  if (password !== confirm) return "Passwords do not match.";
  return null;
}

/** Strip digits from a person-name field as the user types. */
export function sanitizePersonNameInput(raw: string): string {
  return raw.replace(/\d/g, "");
}

/**
 * Contact last name — keep digits so registration / plate numbers can be typed.
 * Strips characters outside letters, numbers, and common separators.
 */
export function sanitizeContactLastNameInput(raw: string): string {
  return raw.replace(/[^\p{L}\p{N}\s.'’\-]/gu, "");
}

/** First non-null validation error from a list. */
export function firstValidationError(
  ...errors: Array<string | null | undefined>
): string | null {
  for (const err of errors) {
    if (err) return err;
  }
  return null;
}
