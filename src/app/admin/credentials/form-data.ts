/** Thrown for malformed request input — distinguishes bad input from operational failures. */
export class FormFieldError extends Error {}

/**
 * Server Actions receive raw FormData over a direct POST, where a field may be a
 * File rather than a string. `String(file)` would coerce to "[object File]" and
 * sneak past downstream string validation, so we reject non-string entries here.
 */
export function requireString(formData: FormData, key: string): string {
  const value = formData.get(key);
  if (typeof value !== "string") {
    throw new FormFieldError(`field "${key}" must be a string`);
  }
  return value;
}
