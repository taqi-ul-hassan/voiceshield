export function cn(...classes: (string | boolean | undefined | null)[]): string {
  return classes.filter(Boolean).join(" ");
}

export function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function formatDuration(duration: string): string {
  // duration comes as "Xm Ys" from demo data — display as-is
  return duration;
}

export function shortId(id: string): string {
  return id.split("-").slice(0, 2).join("-").toUpperCase();
}

/**
 * Copy text to the clipboard, working around iframe permission policies.
 *
 * `navigator.clipboard.writeText` requires the `clipboard-write` permission
 * policy, which cross-origin/sandboxed iframes (e.g. the preview runtime)
 * often deny — it rejects with NotAllowedError. When that happens we fall
 * back to the legacy `document.execCommand("copy")` path, which only needs a
 * user gesture and works in iframes where the async API is blocked.
 *
 * Resolves to `true` when the text was copied, `false` otherwise.
 */
export async function copyText(text: string): Promise<boolean> {
  if (navigator.clipboard?.writeText && window.isSecureContext) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // Permission policy blocked the async API — try the legacy path.
    }
  }

  try {
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.setAttribute("readonly", "");
    textarea.style.position = "fixed";
    textarea.style.top = "-9999px";
    textarea.style.left = "-9999px";
    textarea.style.opacity = "0";
    document.body.appendChild(textarea);
    try {
      textarea.focus();
      textarea.select();
      textarea.setSelectionRange(0, textarea.value.length);
      return document.execCommand("copy");
    } finally {
      document.body.removeChild(textarea);
    }
  } catch {
    return false;
  }
}