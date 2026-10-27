export interface DiscoveredArticle {
  title: string;
  originalUrl: string;
  canonicalUrl?: string;
  excerpt?: string;
  extractedContent?: string;
  imageUrl?: string;
  imageCaption?: string;
  sourceAuthor?: string;
  sourcePublishedAt?: Date;
  sourceUpdatedAt?: Date;
  sourceName?: string;
  licenseInfo?: string;
  ogMetadata?: Record<string, string>;
  isPaywalled?: boolean;
}

export interface CompatibilityCheckResult {
  url: string;
  isAccessible: boolean;
  status?: number;
  detectedType: "RSS" | "SITEMAP" | "HTML" | "UNKNOWN";
  feedUrl?: string;
  sitemapUrl?: string;
  titleExtracted: boolean;
  articlesFound: number;
  sampleArticles: Array<{ title: string; url: string; publishedAt?: string }>;
  hasImages: boolean;
  requiresJs: boolean;
  isSsrfSafe: boolean;
  recommendations: string[];
  errorMessage?: string;
}

export interface ScrapeExecutionResult {
  jobId: string;
  sourceId: string;
  status: "COMPLETED" | "FAILED";
  discoveredCount: number;
  importedCount: number;
  duplicateCount: number;
  failedCount: number;
  errorSummary?: string;
  logs: Array<{ level: "INFO" | "WARN" | "ERROR"; message: string; details?: string }>;
}
