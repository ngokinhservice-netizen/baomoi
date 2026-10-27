import crypto from "crypto";

const TRACKING_PARAMS = [
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_term",
  "utm_content",
  "fbclid",
  "gclid",
  "ref",
  "source",
  "from",
  "_ga",
  "zdlink",
  "znk",
  "spm",
  "feature",
];

/**
 * Normalizes a URL by:
 * - Parsing and standardizing protocol and hostname to lowercase
 * - Removing hash / fragment
 * - Stripping marketing / tracking query parameters
 * - Sorting remaining query parameters deterministically
 * - Removing trailing slash on root / clean paths
 */
export function normalizeUrl(rawUrl: string): string {
  try {
    const url = new URL(rawUrl.trim());
    url.hash = "";

    const searchParams = new URLSearchParams(url.search);
    const cleanedParams = new URLSearchParams();

    // Sort keys and filter out tracking parameters
    const keys = Array.from(searchParams.keys()).sort();
    for (const key of keys) {
      if (!TRACKING_PARAMS.includes(key.toLowerCase())) {
        const values = searchParams.getAll(key);
        for (const val of values) {
          cleanedParams.append(key, val);
        }
      }
    }

    url.search = cleanedParams.toString();

    // Normalize path: trim trailing slash if not root
    if (url.pathname.length > 1 && url.pathname.endsWith("/")) {
      url.pathname = url.pathname.slice(0, -1);
    }

    return url.toString();
  } catch {
    return rawUrl.trim();
  }
}

/**
 * Computes SHA-256 hash for deduplication
 */
export function hashString(str: string): string {
  return crypto.createHash("sha256").update(str.trim().toLowerCase()).digest("hex");
}

/**
 * Normalizes text content for semantic deduplication:
 * strips HTML tags, removes excess whitespace, converts to lowercase
 */
export function hashContent(content: string): string {
  const clean = content
    .replace(/<[^>]*>?/gm, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
  return crypto.createHash("sha256").update(clean).digest("hex");
}
