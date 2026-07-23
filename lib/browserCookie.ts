// Plain module-scope helper (not a hook, not inside a component) for
// setting a simple non-sensitive client-side preference cookie.
export function setBrowserCookie(name: string, value: string, maxAgeSeconds = 31536000) {
  document.cookie = `${name}=${value}; path=/; max-age=${maxAgeSeconds}`;
}
