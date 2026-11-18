/**
 * Posting links come from third-party feeds, so treat them as untrusted: only
 * http(s) URLs may be opened, never javascript:, data: or other schemes.
 */
export function safeHttpUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    const u = new URL(url);
    return u.protocol === "http:" || u.protocol === "https:" ? u.href : null;
  } catch {
    return null;
  }
}

/** Opens a feed link in a new tab with no opener and no referrer. Returns false if the link was refused. */
export function openExternal(url: string | null | undefined): boolean {
  const safe = safeHttpUrl(url);
  if (!safe) return false;
  window.open(safe, "_blank", "noopener,noreferrer");
  return true;
}
