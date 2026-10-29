import prisma from "../prisma";
import { safeFetch, validateUrlForSsrf } from "../security";
import { fetchRssFeed, findFeedUrlsInHtml } from "./rssParser";
import { fetchSitemap } from "./sitemapParser";
import { extractArticleFromHtml, discoverArticleLinksFromListing } from "./htmlParser";
import { normalizeUrl, hashString, hashContent } from "./normalizer";
import { DiscoveredArticle, ScrapeExecutionResult } from "./types";
import { slugify, cleanArticleTitle, normalizeTitleKey } from "../utils";

export async function runScraperJob(
  sourceId: string,
  options: { maxArticles?: number } = {}
): Promise<ScrapeExecutionResult> {
  const maxArticles = options.maxArticles || 15;

  const source = await prisma.newsSource.findUnique({
    where: { id: sourceId },
    include: { defaultCategory: true },
  });

  if (!source) {
    throw new Error(`Không tìm thấy nguồn tin với ID: ${sourceId}`);
  }

  // 1. Create ScrapeJob record
  const job = await prisma.scrapeJob.create({
    data: {
      sourceId: source.id,
      status: "RUNNING",
      startedAt: new Date(),
    },
  });

  const logs: Array<{ level: "INFO" | "WARN" | "ERROR"; message: string; details?: string }> = [];

  const logMessage = async (level: "INFO" | "WARN" | "ERROR", message: string, details?: string) => {
    logs.push({ level, message, details });
    try {
      await prisma.scrapeLog.create({
        data: {
          sourceId: source.id,
          jobId: job.id,
          level,
          message,
          details,
        },
      });
    } catch {
      // ignore logging failure to not interrupt job
    }
  };

  await logMessage("INFO", `Bắt đầu quét nguồn: ${source.name} (${source.homepageUrl})`);

  let discoveredCount = 0;
  let importedCount = 0;
  let duplicateCount = 0;
  let failedCount = 0;

  try {
    // 2. Discover articles
    let candidateArticles: DiscoveredArticle[] = [];

    // Method 1: Explicit or detected RSS/Atom
    if (source.feedUrl) {
      await logMessage("INFO", `Đang thu thập qua RSS Feed: ${source.feedUrl}`);
      try {
        candidateArticles = await fetchRssFeed(source.feedUrl);
        await logMessage("INFO", `Tìm thấy ${candidateArticles.length} bài viết từ RSS Feed`);
      } catch (feedErr: any) {
        await logMessage("WARN", `Lỗi khi đọc RSS Feed: ${feedErr.message}. Chuyển sang quét HTML.`);
      }
    }

    // Method 2: Explicit Sitemap
    if (candidateArticles.length === 0 && source.sitemapUrl) {
      await logMessage("INFO", `Đang thu thập qua Sitemap: ${source.sitemapUrl}`);
      try {
        const sitemapEntries = await fetchSitemap(source.sitemapUrl);
        await logMessage("INFO", `Tìm thấy ${sitemapEntries.length} URL từ Sitemap`);
        candidateArticles = sitemapEntries.slice(0, maxArticles).map((entry) => ({
          title: "",
          originalUrl: entry.loc,
          sourcePublishedAt: entry.lastmod,
        }));
      } catch (smErr: any) {
        await logMessage("WARN", `Lỗi khi đọc Sitemap: ${smErr.message}`);
      }
    }

    // Method 3: HTML Web Scraping from Homepage
    if (candidateArticles.length === 0) {
      await logMessage("INFO", `Đang phân tích cấu trúc HTML trang chủ: ${source.homepageUrl}`);
      const homeFetch = await safeFetch(source.homepageUrl);

      // Check auto-discovery feed links
      const feeds = findFeedUrlsInHtml(homeFetch.text, source.homepageUrl);
      if (feeds.length > 0) {
        await logMessage("INFO", `Tự động phát hiện RSS Feed: ${feeds[0]}`);
        try {
          candidateArticles = await fetchRssFeed(feeds[0]);
        } catch {
          // continue
        }
      }

      // If still none, discover article links
      if (candidateArticles.length === 0) {
        const links = discoverArticleLinksFromListing(homeFetch.text, source.homepageUrl);
        await logMessage("INFO", `Phát hiện ${links.length} liên kết bài viết từ trang chủ HTML`);
        candidateArticles = links.slice(0, maxArticles).map((url) => ({
          title: "",
          originalUrl: url,
        }));
      }
    }

    discoveredCount = candidateArticles.length;
    await logMessage("INFO", `Tổng số bài viết phát hiện: ${discoveredCount}`);

    // Limit articles per run to avoid spamming
    const itemsToProcess = candidateArticles.slice(0, maxArticles);

    // 3. Process each discovered article
    for (const item of itemsToProcess) {
      const normalizedOriginal = normalizeUrl(item.originalUrl);
      const cleanCandidateTitle = cleanArticleTitle(item.title);

      // Check deduplication in ScrapedArticle
      const existingScraped = await prisma.scrapedArticle.findFirst({
        where: {
          OR: [
            { originalUrl: normalizedOriginal },
            { canonicalUrl: normalizedOriginal },
            ...(cleanCandidateTitle ? [{ title: cleanCandidateTitle }] : []),
          ],
        },
      });

      if (existingScraped) {
        duplicateCount++;
        continue;
      }

      // Check deduplication in Article by URL OR Title
      const existingArticle = await prisma.article.findFirst({
        where: {
          OR: [
            { sourceUrl: normalizedOriginal },
            ...(cleanCandidateTitle ? [{ title: cleanCandidateTitle }] : []),
          ],
        },
      });

      if (existingArticle) {
        duplicateCount++;
        continue;
      }

      // Extract full details if content is missing or title is empty
      let articleData: DiscoveredArticle = item;
      if (!articleData.title || !articleData.extractedContent) {
        try {
          const detailFetch = await safeFetch(normalizedOriginal, { timeoutMs: 10000 });
          const customSelectors = source.customSelectors ? JSON.parse(source.customSelectors) : undefined;
          const extracted = extractArticleFromHtml(detailFetch.text, normalizedOriginal, customSelectors);

          articleData = {
            ...articleData,
            title: cleanArticleTitle(extracted.title || articleData.title),
            canonicalUrl: extracted.canonicalUrl || articleData.canonicalUrl,
            excerpt: extracted.excerpt || articleData.excerpt,
            extractedContent: extracted.extractedContent,
            imageUrl: extracted.imageUrl || articleData.imageUrl,
            sourceAuthor: extracted.sourceAuthor || articleData.sourceAuthor,
            sourcePublishedAt: extracted.sourcePublishedAt || articleData.sourcePublishedAt,
            sourceName: extracted.sourceName || source.name,
          };
        } catch (fetchErr: any) {
          failedCount++;
          await logMessage("WARN", `Không thể trích xuất chi tiết bài viết: ${normalizedOriginal} - ${fetchErr.message}`);
          continue;
        }
      }

      articleData.title = cleanArticleTitle(articleData.title);

      if (!articleData.title) {
        failedCount++;
        await logMessage("WARN", `Bỏ qua bài không có tiêu đề: ${normalizedOriginal}`);
        continue;
      }

      // Re-verify after title extraction
      const reCheck = await prisma.article.findFirst({
        where: {
          OR: [
            { sourceUrl: normalizedOriginal },
            { title: articleData.title },
          ],
        },
      });
      if (reCheck) {
        duplicateCount++;
        continue;
      }

      const contentHash = articleData.extractedContent ? hashContent(articleData.extractedContent) : undefined;

      // Duplicate check by content hash
      if (contentHash) {
        const dupByHash = await prisma.scrapedArticle.findFirst({
          where: { contentHash },
        });
        if (dupByHash) {
          duplicateCount++;
          await logMessage("INFO", `Phát hiện bài trùng nội dung: "${articleData.title}"`);
          continue;
        }
      }

      // 4. Handle based on source.scrapeMode
      // Fallback category if source doesn't have one
      let categoryId = source.defaultCategoryId;
      if (!categoryId) {
        const firstCategory = await prisma.category.findFirst({ where: { isActive: true } });
        if (firstCategory) categoryId = firstCategory.id;
      }

      // Mode A: CITATION (Title, excerpt, source name, original URL, published as citation)
      if (source.scrapeMode === "CITATION") {
        if (!categoryId) {
          failedCount++;
          continue;
        }

        const slugBase = slugify(articleData.title);
        const uniqueSlug = `${slugBase}-${Date.now().toString().slice(-6)}`;

        const createdArticle = await prisma.article.create({
          data: {
            title: articleData.title,
            slug: uniqueSlug,
            excerpt: articleData.excerpt || "Tin tổng hợp dẫn nguồn từ " + source.name,
            content: articleData.extractedContent
              ? `${articleData.extractedContent}<p class="source-credit font-medium mt-6 pt-4 border-t border-gray-200">Theo nguồn: <strong>${source.name}</strong>. Xem chi tiết bài viết gốc tại <a href="${normalizedOriginal}" target="_blank" rel="noopener noreferrer nofollow" class="text-primary underline">${normalizedOriginal}</a>.</p>`
              : `<p>${articleData.excerpt || ""}</p><p class="source-credit font-medium mt-4">Theo nguồn <strong>${source.name}</strong>. Xem chi tiết bài viết gốc tại <a href="${normalizedOriginal}" target="_blank" rel="noopener noreferrer nofollow" class="text-primary underline">${normalizedOriginal}</a>.</p>`,
            featuredImage: articleData.imageUrl,
            imageCaption: articleData.imageCaption,
            categoryId,
            status: "PUBLISHED",
            sourceType: "CITATION",
            sourceUrl: normalizedOriginal,
            sourceName: source.name,
            publishedAt:
              articleData.sourcePublishedAt && articleData.sourcePublishedAt.getTime() <= Date.now()
                ? articleData.sourcePublishedAt
                : new Date(),
          },
        });

        await prisma.scrapedArticle.create({
          data: {
            sourceId: source.id,
            originalUrl: normalizedOriginal,
            canonicalUrl: articleData.canonicalUrl,
            title: articleData.title,
            excerpt: articleData.excerpt,
            extractedContent: articleData.extractedContent,
            sourceAuthor: articleData.sourceAuthor,
            sourcePublishedAt: articleData.sourcePublishedAt,
            imageUrl: articleData.imageUrl,
            contentHash,
            processingStatus: "PUBLISHED",
            permissionStatus: "CITATION_ONLY",
            linkedArticleId: createdArticle.id,
            processedAt: new Date(),
          },
        });

        importedCount++;
        await logMessage("INFO", `Đã tạo bài dẫn nguồn (Mode A): "${articleData.title}"`);
      }
      // Mode C: AUTO_PUBLISH (Creates published article directly)
      else if (source.scrapeMode === "AUTO_PUBLISH") {
        if (!categoryId) {
          failedCount++;
          continue;
        }

        const slugBase = slugify(articleData.title);
        const uniqueSlug = `${slugBase}-${Date.now().toString().slice(-6)}`;

        const createdArticle = await prisma.article.create({
          data: {
            title: articleData.title,
            slug: uniqueSlug,
            excerpt: articleData.excerpt,
            content: articleData.extractedContent || `<p>${articleData.excerpt || ""}</p>`,
            featuredImage: articleData.imageUrl,
            imageCaption: articleData.imageCaption,
            categoryId,
            status: "PUBLISHED",
            sourceType: "IMPORTED",
            sourceUrl: normalizedOriginal,
            sourceName: source.name,
            publishedAt:
              articleData.sourcePublishedAt && articleData.sourcePublishedAt.getTime() <= Date.now()
                ? articleData.sourcePublishedAt
                : new Date(),
          },
        });

        await prisma.scrapedArticle.create({
          data: {
            sourceId: source.id,
            originalUrl: normalizedOriginal,
            canonicalUrl: articleData.canonicalUrl,
            title: articleData.title,
            excerpt: articleData.excerpt,
            extractedContent: articleData.extractedContent,
            sourceAuthor: articleData.sourceAuthor,
            sourcePublishedAt: articleData.sourcePublishedAt,
            imageUrl: articleData.imageUrl,
            contentHash,
            processingStatus: "PUBLISHED",
            permissionStatus: "VERIFIED",
            linkedArticleId: createdArticle.id,
            processedAt: new Date(),
          },
        });

        importedCount++;
        await logMessage("INFO", `Đã tự động xuất bản (Mode C): "${articleData.title}"`);
      }
      // Mode B: EDITORIAL_QUEUE (Default: Saves to queue for review)
      else {
        await prisma.scrapedArticle.create({
          data: {
            sourceId: source.id,
            originalUrl: normalizedOriginal,
            canonicalUrl: articleData.canonicalUrl,
            title: articleData.title,
            excerpt: articleData.excerpt,
            extractedContent: articleData.extractedContent,
            sourceAuthor: articleData.sourceAuthor,
            sourcePublishedAt: articleData.sourcePublishedAt,
            imageUrl: articleData.imageUrl,
            contentHash,
            processingStatus: "PENDING",
            permissionStatus: "PENDING",
          },
        });

        importedCount++;
        await logMessage("INFO", `Đã nhập vào hàng đợi duyệt (Mode B): "${articleData.title}"`);
      }
    }

    // 5. Update Job & NewsSource
    await prisma.scrapeJob.update({
      where: { id: job.id },
      data: {
        status: "COMPLETED",
        finishedAt: new Date(),
        discoveredCount,
        importedCount,
        duplicateCount,
        failedCount,
      },
    });

    await prisma.newsSource.update({
      where: { id: source.id },
      data: {
        lastCheckedAt: new Date(),
        lastSuccessAt: new Date(),
        lastError: null,
      },
    });

    await logMessage(
      "INFO",
      `Hoàn thành quét nguồn ${source.name}. Mới: ${importedCount}, Trùng: ${duplicateCount}, Lỗi: ${failedCount}`
    );

    return {
      jobId: job.id,
      sourceId: source.id,
      status: "COMPLETED",
      discoveredCount,
      importedCount,
      duplicateCount,
      failedCount,
      logs,
    };
  } catch (error: any) {
    const errorMsg = error.message || "Lỗi không xác định khi quét";
    await logMessage("ERROR", `Quá trình quét thất bại: ${errorMsg}`, error.stack);

    await prisma.scrapeJob.update({
      where: { id: job.id },
      data: {
        status: "FAILED",
        finishedAt: new Date(),
        discoveredCount,
        importedCount,
        duplicateCount,
        failedCount,
        errorSummary: errorMsg,
      },
    });

    await prisma.newsSource.update({
      where: { id: source.id },
      data: {
        lastCheckedAt: new Date(),
        lastError: errorMsg,
      },
    });

    return {
      jobId: job.id,
      sourceId: source.id,
      status: "FAILED",
      discoveredCount,
      importedCount,
      duplicateCount,
      failedCount,
      errorSummary: errorMsg,
      logs,
    };
  }
}
