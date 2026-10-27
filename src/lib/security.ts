import dns from "dns/promises";
import ipaddr from "ipaddr.js";

export interface SSRFValidationResult {
  isValid: boolean;
  reason?: string;
  normalizedUrl?: string;
  resolvedIp?: string;
}

/**
 * Checks if an IP string is private, loopback, link-local, carrier-grade NAT, or cloud metadata.
 */
export function isPrivateOrReservedIp(ipString: string): boolean {
  try {
    const addr = ipaddr.parse(ipString);
    const range = addr.range();

    // Block private, loopback, carrier-grade, multicast, linkLocal, etc.
    const blockedRanges = [
      "unspecified",
      "broadcast",
      "multicast",
      "linkLocal",
      "loopback",
      "private",
      "reserved",
      "carrierGradeNat",
    ];

    if (blockedRanges.includes(range)) {
      return true;
    }

    // Explicit check for cloud metadata (169.254.169.254) and AWS / GCP / Azure endpoints
    if (addr.kind() === "ipv4") {
      const octets = (addr as ipaddr.IPv4).octets;
      // 169.254.x.x (AWS/GCP/Azure link-local metadata)
      if (octets[0] === 169 && octets[1] === 254) return true;
      // 127.x.x.x loopback
      if (octets[0] === 127) return true;
      // 10.x.x.x
      if (octets[0] === 10) return true;
      // 172.16.x.x - 172.31.x.x
      if (octets[0] === 172 && octets[1] >= 16 && octets[1] <= 31) return true;
      // 192.168.x.x
      if (octets[0] === 192 && octets[1] === 168) return true;
      // 0.0.0.0
      if (octets[0] === 0) return true;
    }

    if (addr.kind() === "ipv6") {
      // IPv6 mapped IPv4 check
      if ((addr as ipaddr.IPv6).isIPv4MappedAddress()) {
        const v4 = (addr as ipaddr.IPv6).toIPv4Address();
        return isPrivateOrReservedIp(v4.toString());
      }
    }

    return false;
  } catch {
    return true; // If parsing fails, treat as unsafe
  }
}

/**
 * Validates a target URL against SSRF rules:
 * - Scheme must be http or https
 * - Host cannot be localhost or an IP in private/reserved ranges
 * - Resolves DNS to ensure underlying IP is public
 */
export async function validateUrlForSsrf(urlString: string): Promise<SSRFValidationResult> {
  try {
    const url = new URL(urlString);

    if (url.protocol !== "http:" && url.protocol !== "https:") {
      return { isValid: false, reason: `Giao thức không được hỗ trợ: ${url.protocol}. Chỉ hỗ trợ http và https.` };
    }

    const hostname = url.hostname.toLowerCase();

    // Disallow localhost or internal keywords
    if (
      hostname === "localhost" ||
      hostname.endsWith(".localhost") ||
      hostname.endsWith(".local") ||
      hostname.endsWith(".internal") ||
      hostname.endsWith(".corp") ||
      hostname.endsWith(".home")
    ) {
      return { isValid: false, reason: "Tên miền nội bộ hoặc localhost không được phép truy cập." };
    }

    // If host is already an IP address
    if (ipaddr.isValid(hostname)) {
      if (isPrivateOrReservedIp(hostname)) {
        return { isValid: false, reason: `Địa chỉ IP riêng tư hoặc bị cấm: ${hostname}` };
      }
      return { isValid: true, normalizedUrl: url.toString(), resolvedIp: hostname };
    }

    // Resolve DNS (IPv4 & IPv6)
    try {
      const addresses = await dns.lookup(hostname, { all: true });
      if (!addresses || addresses.length === 0) {
        return { isValid: false, reason: `Không thể phân giải tên miền: ${hostname}` };
      }

      for (const record of addresses) {
        if (isPrivateOrReservedIp(record.address)) {
          return {
            isValid: false,
            reason: `Tên miền ${hostname} trỏ về IP nội bộ / bị cấm (${record.address}).`,
            resolvedIp: record.address,
          };
        }
      }

      return {
        isValid: true,
        normalizedUrl: url.toString(),
        resolvedIp: addresses[0]?.address,
      };
    } catch (dnsErr: any) {
      return { isValid: false, reason: `Lỗi DNS lookup: ${dnsErr.message || "Domain không tồn tại"}` };
    }
  } catch (err: any) {
    return { isValid: false, reason: `URL không hợp lệ: ${err.message}` };
  }
}

/**
 * SSRF-Safe HTTP Fetch with:
 * - Pre-flight SSRF validation
 * - Follow-redirect manual loop with SSRF validation on each hop
 * - Max redirects limit (default 3)
 * - Timeout limit (default 10s)
 * - Response size limit (default 5MB)
 * - Custom User-Agent
 */
export interface SafeFetchOptions {
  timeoutMs?: number;
  maxRedirects?: number;
  maxSizeBytes?: number;
  headers?: Record<string, string>;
}

export async function safeFetch(
  targetUrl: string,
  options: SafeFetchOptions = {}
): Promise<{ text: string; finalUrl: string; status: number; contentType: string }> {
  const {
    timeoutMs = 10000,
    maxRedirects = 3,
    maxSizeBytes = 5 * 1024 * 1024, // 5MB
    headers = {},
  } = options;

  let currentUrl = targetUrl;
  let redirectsCount = 0;

  while (redirectsCount <= maxRedirects) {
    // 1. SSRF check before every request
    const ssrfCheck = await validateUrlForSsrf(currentUrl);
    if (!ssrfCheck.isValid) {
      throw new Error(`SSRF Blocked: ${ssrfCheck.reason}`);
    }

    // 2. Fetch with abort controller timeout
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(currentUrl, {
        method: "GET",
        headers: {
          "User-Agent": "MTK-NewsBot/1.0 (+https://mtknews.local/bot; news-aggregator)",
          "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          "Accept-Language": "vi-VN,vi;q=0.9,en-US;q=0.8,en;q=0.7",
          ...headers,
        },
        redirect: "manual", // Handle redirects manually for SSRF verification
        signal: controller.signal,
      });

      clearTimeout(timer);

      // 3. Handle redirects manually
      if ([301, 302, 303, 307, 308].includes(response.status)) {
        const location = response.headers.get("location");
        if (!location) {
          throw new Error(`Redirect response from ${currentUrl} did not provide Location header`);
        }
        redirectsCount++;
        if (redirectsCount > maxRedirects) {
          throw new Error(`Vượt quá giới hạn chuyển hướng (${maxRedirects} lần)`);
        }
        // Resolve relative redirects
        currentUrl = new URL(location, currentUrl).toString();
        continue;
      }

      if (!response.ok) {
        throw new Error(`HTTP Error ${response.status}: ${response.statusText}`);
      }

      // 4. Content length guard
      const contentLengthHeader = response.headers.get("content-length");
      if (contentLengthHeader && parseInt(contentLengthHeader, 10) > maxSizeBytes) {
        throw new Error(`Kích thước phản hồi quá lớn (> ${maxSizeBytes / (1024 * 1024)}MB)`);
      }

      // Read stream with size limit
      const reader = response.body?.getReader();
      if (!reader) {
        const text = await response.text();
        return {
          text,
          finalUrl: currentUrl,
          status: response.status,
          contentType: response.headers.get("content-type") || "",
        };
      }

      const chunks: Uint8Array[] = [];
      let totalBytes = 0;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (value) {
          totalBytes += value.length;
          if (totalBytes > maxSizeBytes) {
            reader.cancel();
            throw new Error(`Nội dung vượt quá giới hạn tải xuống (${maxSizeBytes / (1024 * 1024)}MB)`);
          }
          chunks.push(value);
        }
      }

      const decoder = new TextDecoder("utf-8");
      let fullText = "";
      for (const chunk of chunks) {
        fullText += decoder.decode(chunk, { stream: true });
      }
      fullText += decoder.decode();

      return {
        text: fullText,
        finalUrl: currentUrl,
        status: response.status,
        contentType: response.headers.get("content-type") || "",
      };
    } catch (err: any) {
      clearTimeout(timer);
      if (err.name === "AbortError") {
        throw new Error(`Hết thời gian chờ kết nối (${timeoutMs}ms) tới ${currentUrl}`);
      }
      throw err;
    }
  }

  throw new Error(`Quá số lần chuyển hướng (${maxRedirects})`);
}
