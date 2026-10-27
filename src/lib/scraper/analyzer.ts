import { safeFetch, validateUrlForSsrf } from "../security";
import { findFeedUrlsInHtml, fetchRssFeed } from "./rssParser";
import { extractArticleFromHtml, discoverArticleLinksFromListing } from "./htmlParser";
import { CompatibilityCheckResult } from "./types";

/**
 * Analyzes any target URL to detect the best ingestion method (RSS, Sitemap, or HTML DOM)
 * without requiring API keys, providing concrete diagnostics and recommendations.
 */
export async function analyzeNewsSource(targetUrl: string): Promise<CompatibilityCheckResult> {
  const result: CompatibilityCheckResult = {
    url: targetUrl,
    isAccessible: false,
    detectedType: "UNKNOWN",
    titleExtracted: false,
    articlesFound: 0,
    sampleArticles: [],
    hasImages: false,
    requiresJs: false,
    isSsrfSafe: false,
    recommendations: [],
  };

  // Step 1: Pre-flight SSRF check
  const ssrf = await validateUrlForSsrf(targetUrl);
  if (!ssrf.isValid) {
    result.isSsrfSafe = false;
    result.errorMessage = `Cảnh báo an ninh SSRF: ${ssrf.reason}`;
    result.recommendations.push("URL bị từ chối do chính sách bảo mật mạng nội bộ.");
    return result;
  }
  result.isSsrfSafe = true;

  // Step 2: Try fetching target
  let fetched: { text: string; finalUrl: string; status: number; contentType: string };
  try {
    fetched = await safeFetch(targetUrl, { timeoutMs: 12000 });
    result.isAccessible = true;
    result.status = fetched.status;
  } catch (err: any) {
    result.isAccessible = false;
    result.errorMessage = `Không thể kết nối đến website: ${err.message}`;
    result.recommendations.push("Kiểm tra lại đường dẫn URL hoặc trạng thái hoạt động của website nguồn.");
    return result;
  }

  const { text, contentType, finalUrl } = fetched;

  // Step 3: Check if directly an RSS/Atom feed
  if (
    contentType.includes("xml") ||
    contentType.includes("rss") ||
    contentType.includes("atom") ||
    text.trim().startsWith("<?xml") ||
    text.includes("<rss") ||
    text.includes("<feed")
  ) {
    try {
      const feedArticles = await fetchRssFeed(finalUrl);
      if (feedArticles.length > 0) {
        result.detectedType = "RSS";
        result.feedUrl = finalUrl;
        result.articlesFound = feedArticles.length;
        result.titleExtracted = true;
        result.hasImages = feedArticles.some((a) => !!a.imageUrl);
        result.sampleArticles = feedArticles.slice(0, 5).map((a) => ({
          title: a.title,
          url: a.originalUrl,
          publishedAt: a.sourcePublishedAt?.toISOString(),
        }));
        result.recommendations.push("Nguồn cung cấp RSS feed trực tiếp chuẩn xác. Đây là phương thức ổn định nhất.");
        return result;
      }
    } catch {
      // Continue testing HTML if direct feed parsing failed
    }
  }

  // Step 4: Check if HTML contains autodiscovery RSS / Atom links
  const discoveredFeeds = findFeedUrlsInHtml(text, finalUrl);
  if (discoveredFeeds.length > 0) {
    for (const feedCandidate of discoveredFeeds) {
      try {
        const feedArticles = await fetchRssFeed(feedCandidate);
        if (feedArticles.length > 0) {
          result.detectedType = "RSS";
          result.feedUrl = feedCandidate;
          result.articlesFound = feedArticles.length;
          result.titleExtracted = true;
          result.hasImages = feedArticles.some((a) => !!a.imageUrl);
          result.sampleArticles = feedArticles.slice(0, 5).map((a) => ({
            title: a.title,
            url: a.originalUrl,
            publishedAt: a.sourcePublishedAt?.toISOString(),
          }));
          result.recommendations.push(
            `Phát hiện RSS Feed tự động tại: ${feedCandidate}. Hệ thống sẽ sử dụng RSS để đồng bộ nhanh và chính xác nhất.`
          );
          return result;
        }
      } catch {
        // test next candidate
      }
    }
  }

  // Step 5: Check Sitemap XML (/sitemap.xml or /sitemap_index.xml)
  try {
    const sitemapUrl = new URL("/sitemap.xml", finalUrl).toString();
    const smFetch = await safeFetch(sitemapUrl, { timeoutMs: 8000 });
    if (smFetch.status === 200 && (smFetch.text.includes("<urlset") || smFetch.text.includes("<sitemapindex"))) {
      result.sitemapUrl = sitemapUrl;
      result.recommendations.push("Phát hiện Sitemap XML tại /sitemap.xml, có thể cấu hình sitemap URL để bổ trợ.");
    }
  } catch {
    // Sitemap not mandatory
  }

  // Step 6: HTML DOM Analysis
  result.detectedType = "HTML";
  const articleLinks = discoverArticleLinksFromListing(text, finalUrl);
  result.articlesFound = articleLinks.length;

  if (articleLinks.length === 0) {
    // Check if page appears empty or client-side rendered
    if (text.includes("id=\"root\"") || text.includes("id=\"__next\"") || text.length < 2000) {
      result.requiresJs = true;
      result.recommendations.push(
        "Website có dấu hiệu là Single Page App (SPA) yêu cầu JavaScript. Cần cấu hình Playwright hoặc cung cấp RSS feed thay thế."
      );
    } else {
      result.recommendations.push(
        "Không tự động tìm thấy liên kết bài viết theo mẫu thông thường. Bạn có thể nhập selector tùy chỉnh trong phần cấu hình nâng cao."
      );
    }
    return result;
  }

  // Test extraction on the first 2 article links
  const sampleArticles: Array<{ title: string; url: string; publishedAt?: string }> = [];
  let foundImages = false;
  let titleFound = false;

  for (const link of articleLinks.slice(0, 3)) {
    try {
      const artFetch = await safeFetch(link, { timeoutMs: 10000 });
      const extracted = extractArticleFromHtml(artFetch.text, link);
      if (extracted.title) {
        titleFound = true;
        if (extracted.imageUrl) foundImages = true;
        sampleArticles.push({
          title: extracted.title,
          url: link,
          publishedAt: extracted.sourcePublishedAt?.toISOString(),
        });
      }
    } catch {
      // ignore individual article fetch failures
    }
  }

  result.titleExtracted = titleFound;
  result.hasImages = foundImages;
  result.sampleArticles = sampleArticles;

  if (sampleArticles.length > 0) {
    result.recommendations.push(
      `Đã phát hiện ${articleLinks.length} liên kết bài viết. Trích xuất thành công tiêu đề và metadata từ các bài mẫu.`
    );
    result.recommendations.push("Nên chọn chế độ 'Hàng đợi biên tập' (Mode B) để kiểm tra chất lượng trước khi xuất bản.");
  } else {
    result.recommendations.push(
      "Các liên kết bài viết phát hiện được yêu cầu cấu hình selector nội dung chi tiết để trích xuất đầy đủ."
    );
  }

  return result;
}
