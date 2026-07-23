// No display-name field exists anywhere in the schema, so the email
// local-part is the only identity string available for a greeting/avatar.
// Pure functions (no server dependency) so they're safe to import from
// both server components and the client-side Sidebar.
export function nameFromEmail(email: string | null): string {
  if (!email) return "";
  const localPart = email.split("@")[0].split("+")[0];
  return localPart
    .split(/[._-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function initialFromEmail(email: string | null): string {
  return email ? email.charAt(0).toUpperCase() : "?";
}
