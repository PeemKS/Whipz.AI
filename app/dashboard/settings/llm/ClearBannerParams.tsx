"use client";

import { useEffect } from "react";

// The save/remove confirmation banners are driven by query params
// (?saved=, ?removed=, etc.) so they survive the server-action redirect.
// Without this, reloading or revisiting the same URL later keeps
// re-showing a stale one-time confirmation. Uses the plain History API
// (not next/navigation's router) so only the address bar changes —
// router.replace() would trigger a fresh server render without the query
// params and strip the banner from view instantly instead of letting the
// user actually read it.
export function ClearBannerParams() {
  useEffect(() => {
    window.history.replaceState(null, "", window.location.pathname);
  }, []);

  return null;
}
