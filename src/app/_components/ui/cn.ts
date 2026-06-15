/** Join class names, dropping falsy values. Keeps JSX class lists readable. */
export function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}
