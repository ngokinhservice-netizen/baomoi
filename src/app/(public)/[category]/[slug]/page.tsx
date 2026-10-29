import React from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getArticleBySlug, getRelatedArticles } from "@/lib/data";
import { formatDate, formatArticleDate, formatRelativeTime } from "@/lib/utils";
import ArticleCard from "@/components/news/ArticleCard";
import {
  Clock,
  User,
  Share2,
  ExternalLink,
  ChevronRight,
  Bookmark,
  Calendar,
} from "lucide-react";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

interface ArticlePageProps {
  params: {
    category: string;
    slug: string;
  };
}

export async function generateMetadata({ params }: ArticlePageProps): Promise<Metadata> {
  const article = await getArticleBySlug(params.slug);
  if (!article) return { title: "Không tìm thấy bài viết | NHỊP SỐNG 247" };

  const title = article.seoTitle || article.title;
  const description = article.seoDescription || article.excerpt || "Tin tức NHỊP SỐNG 247";
  const url = `/${params.category}/${params.slug}`;

  return {
    referrer: "no-referrer",
    title: `${title} | NHỊP SỐNG 247`,
    description,
    openGraph: {
      title,
      description,
      url,
      type: "article",
      publishedTime: article.publishedAt ? new Date(article.publishedAt).toISOString() : undefined,
      modifiedTime: article.updatedAt ? new Date(article.updatedAt).toISOString() : undefined,
      authors: [article.author?.name || article.sourceName || "NHỊP SỐNG 247"],
      images: article.featuredImage ? [{ url: article.featuredImage }] : [],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: article.featuredImage ? [article.featuredImage] : [],
    },
    alternates: {
      canonical: article.sourceUrl || url,
    },
  };
}

export default async function ArticleDetailPage({ params }: ArticlePageProps) {
  const article = await getArticleBySlug(params.slug);

  if (!article || article.status !== "PUBLISHED") {
    notFound();
  }

  // JIT Content Hydration: If article has sourceUrl but content is incomplete or short,
  // fetch the full body and high-res imagery immediately so visitor sees complete article
  let renderedContent = article.content;
  const isContentIncomplete =
    !article.content ||
    article.content.length < 1200 ||
    (article.content.match(/<p[ >]/g) || []).length < 2 ||
    (article.content.startsWith("<h2") && article.content.length < 500);

  if (article.sourceUrl && isContentIncomplete) {
    try {
      const { safeFetch } = await import("@/lib/security");
      const { extractArticleFromHtml } = await import("@/lib/scraper/htmlParser");
      const prisma = (await import("@/lib/prisma")).default;

      const res = await safeFetch(article.sourceUrl, { timeoutMs: 8000 });
      const extracted = extractArticleFromHtml(res.text, article.sourceUrl);
      if (extracted.extractedContent && extracted.extractedContent.length > (article.content?.length || 0)) {
        renderedContent = extracted.extractedContent;
        if (extracted.imageUrl) {
          article.featuredImage = extracted.imageUrl;
        }
        if (extracted.sourcePublishedAt) {
          article.publishedAt = extracted.sourcePublishedAt;
        }
        await prisma.article
          .update({
            where: { id: article.id },
            data: {
              content: extracted.extractedContent,
              featuredImage: extracted.imageUrl || article.featuredImage,
              excerpt: extracted.excerpt || article.excerpt,
              ...(extracted.sourcePublishedAt ? { publishedAt: extracted.sourcePublishedAt } : {}),
            },
          })
          .catch(() => {});
      }
    } catch {
      // Keep existing content
    }
  }

  const relatedArticles = await getRelatedArticles(article.categoryId, article.id, 4);

  // Resolution & image optimization: ensure featured image is sharpest possible
  let displayFeaturedImage = article.featuredImage;
  const isLowRes = !displayFeaturedImage || /w=(100|120|220|380)(&|$)/.test(displayFeaturedImage);
  if (isLowRes && renderedContent) {
    const highResMatch = renderedContent.match(/src="([^"]*w=1200[^"]*)"/i) || renderedContent.match(/src="([^"]*(?:jpg|jpeg|png|webp)[^"]*)"/i);
    if (highResMatch && highResMatch[1]) {
      displayFeaturedImage = highResMatch[1];
    }
  }

  // If the article content is a photo essay already including this image, avoid duplicate
  const isImageInContent = displayFeaturedImage && renderedContent && renderedContent.includes(displayFeaturedImage);

  // Schema.org NewsArticle JSON-LD
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "NewsArticle",
    headline: article.title,
    description: article.excerpt || "",
    image: displayFeaturedImage ? [displayFeaturedImage] : [],
    datePublished: article.publishedAt ? new Date(article.publishedAt).toISOString() : new Date().toISOString(),
    dateModified: article.updatedAt ? new Date(article.updatedAt).toISOString() : new Date().toISOString(),
    author: {
      "@type": "Person",
      name: article.author?.name || article.sourceName || "NHỊP SỐNG 247",
    },
    publisher: {
      "@type": "Organization",
      name: "NHỊP SỐNG 247",
      logo: {
        "@type": "ImageObject",
        url: "http://localhost:3000/logo.svg",
      },
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <article className="max-w-4xl mx-auto">
        {/* 1. Breadcrumbs */}
        <nav className="flex items-center space-x-1.5 text-xs text-gray-500 mb-4 pb-2 border-b border-gray-100">
          <Link href="/" className="hover:text-primary transition-colors">
            Trang chủ
          </Link>
          <ChevronRight className="w-3.5 h-3.5 text-gray-400" />
          <Link
            href={`/danh-muc/${article.category.slug}`}
            className="hover:text-primary font-medium text-gray-700 transition-colors uppercase"
          >
            {article.category.name}
          </Link>
        </nav>

        {/* 2. Article Header: Category Badge, Title, Subtitle, Author & Date */}
        <header className="mb-6 space-y-3">
          <div className="flex items-center space-x-2">
            <span className="bg-primary text-white text-xs font-bold px-2.5 py-0.5 rounded uppercase">
              {article.category.name}
            </span>
            {article.sourceType === "CITATION" && (
              <span className="bg-amber-100 text-amber-800 text-xs font-semibold px-2 py-0.5 rounded">
                Tin tổng hợp dẫn nguồn
              </span>
            )}
          </div>

          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold font-serif text-gray-900 leading-tight">
            {article.title}
          </h1>

          {article.subtitle && (
            <p className="text-lg text-gray-600 font-medium font-serif leading-snug">
              {article.subtitle}
            </p>
          )}

          {/* Meta bar: Author, Date, Share */}
          <div className="flex flex-wrap items-center justify-between text-xs text-gray-500 py-3 border-y border-gray-200 gap-2">
            <div className="flex items-center space-x-4">
              <span className="flex items-center font-semibold text-gray-800">
                <User className="w-3.5 h-3.5 mr-1 text-primary" />
                {article.author?.name || article.sourceName || "NHỊP SỐNG 247"}
              </span>
              <span className="flex items-center text-gray-500">
                <Clock className="w-3.5 h-3.5 mr-1 text-gray-400" />
                {formatArticleDate(article.publishedAt || article.createdAt)}
              </span>
            </div>

            <div className="flex items-center space-x-3">
              <span className="text-gray-400 flex items-center">
                <Share2 className="w-3.5 h-3.5 mr-1" /> Chia sẻ bài viết
              </span>
            </div>
          </div>
        </header>

        {/* 3. Sapo / Excerpt */}
        {article.excerpt && (
          <div className="text-base sm:text-lg font-semibold text-gray-800 leading-relaxed bg-gray-50 p-4 rounded-lg border-l-4 border-primary mb-6">
            {article.excerpt}
          </div>
        )}

        {/* 4. Featured Image & Caption (Omit if already first item in photo essay) */}
        {displayFeaturedImage && !isImageInContent && (
          <figure className="mb-8">
            <div className="aspect-[16/9] w-full overflow-hidden rounded-lg bg-gray-100">
              <img
                src={displayFeaturedImage}
                alt={article.imageCaption || article.title}
                className="w-full h-full object-cover"
                style={{ imageRendering: "-webkit-optimize-contrast" }}
                referrerPolicy="no-referrer"
              />
            </div>
            {(article.imageCaption || article.imageSource) && (
              <figcaption className="text-xs text-gray-500 mt-2 text-center italic">
                {article.imageCaption}{" "}
                {article.imageSource && (
                  <span className="font-semibold text-gray-600">
                    (Ảnh: {article.imageSource})
                  </span>
                )}
              </figcaption>
            )}
          </figure>
        )}

        {/* 5. Main Content Body */}
        <div
          className="article-content max-w-none text-gray-800"
          dangerouslySetInnerHTML={{ __html: renderedContent }}
        />

        {/* 6. Source Attribution Card (If imported or citation) */}
        {(article.sourceUrl || article.sourceName) && (
          <div className="my-8 p-4 bg-amber-50/70 border border-amber-200 rounded-lg text-sm text-amber-900 flex items-start space-x-3">
            <ExternalLink className="w-5 h-5 text-amber-700 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">Thông tin nguồn phát hành:</p>
              <p className="text-xs text-amber-800 mt-0.5">
                Bài viết này được tổng hợp và dẫn nguồn từ{" "}
                <strong>{article.sourceName || "website liên kết"}</strong>.
              </p>
              {article.sourceUrl && (
                <a
                  href={article.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer nofollow"
                  className="inline-flex items-center text-xs font-semibold text-primary underline hover:text-primary-hover mt-1.5"
                >
                  Xem bài viết gốc trên website nguồn <ChevronRight className="w-3 h-3 ml-0.5" />
                </a>
              )}
            </div>
          </div>
        )}

        {/* 7. Tags / Keywords */}
        <div className="py-6 border-t border-gray-200 flex items-center space-x-2 text-xs">
          <span className="font-bold text-gray-500 uppercase">Chủ đề:</span>
          <Link
            href={`/danh-muc/${article.category.slug}`}
            className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-1 rounded-full transition-colors"
          >
            #{article.category.name}
          </Link>
          <Link
            href="/search?q=NHIP+SONG+247"
            className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-1 rounded-full transition-colors"
          >
            #NHỊP SỐNG 247
          </Link>
        </div>

        {/* 8. Related Articles (Bài viết liên quan) */}
        {relatedArticles.length > 0 && (
          <section className="mt-12 pt-8 border-t-2 border-primary">
            <h3 className="text-xl font-bold font-serif text-gray-900 mb-6 uppercase tracking-tight">
              Bài viết cùng chuyên mục
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              {relatedArticles.map((rel) => (
                <ArticleCard key={rel.id} article={rel} variant="standard" />
              ))}
            </div>
          </section>
        )}
      </article>
    </>
  );
}
