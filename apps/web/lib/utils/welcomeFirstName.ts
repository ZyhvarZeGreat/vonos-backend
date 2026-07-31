/** Honorifics / prefixes that must not be treated as a given name. */
const NAME_TITLE_RE =
  /^(mr|mrs|miss|ms|dr|prof|sir|madam|madame|engr|eng|hon|rev|pastor|chief)\.?$/i;

/**
 * First given name for greetings ("Welcome John"), skipping Mr/Mrs/Miss/etc.
 */
export function welcomeFirstName(
  fullName: string | null | undefined,
  fallback = "there",
): string {
  const parts = (fullName ?? "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (parts.length === 0) return fallback;

  let index = 0;
  while (index < parts.length && NAME_TITLE_RE.test(parts[index]!)) {
    index += 1;
  }

  return parts[index] ?? parts[0] ?? fallback;
}
