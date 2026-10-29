import React from "react";
import Link from "next/link";
import { formatRelativeTime } from "@/lib/utils";
import { Clock, ExternalLink } from "lucide-react";

export interface ArticleCardData {
  id: string;
  title: string;
  subtitle?: string | null;
  slug: string;
  excerpt?: string | null;
  featuredImage?: string | null;
  category?: {
    id: string;
    name: string;
    slug: string;
  } | null;
  author?: {
    name: string;
  } | null;
  sourceType?: string;
  sourceName?: string | null;
  sourceUrl?: string | null;
  publishedAt?: Date | string | null;
  createdAt?: Date | string | null;
  views?: number;
}

interface ArticleCardProps {
  article: ArticleCardData;
  variant?: "hero" | "standard" | "horizontal" | "compact";
  rank?: number;
  showCategory?: boolean;
}

export default function ArticleCard({
  article,
  variant = "standard",
  rank,
  showCategory = true,
}: ArticleCardProps) {
  const categorySlug = article.category?.slug || "tin-tuc";
  const articleHref = `/${categorySlug}/${article.slug}`;
  const dateToDisplay = article.publishedAt || article.createdAt;

  // Placeholder image if none provided
  const imageUrl =
    article.featuredImage ||
    "https://images.unsplash.com/photo-1585829365295-ab7cd400c167?w=800&q=80";

  // HERO VARIANT (Big headline for top of page)
  if (variant === "hero") {
    return (
      <article className="group relative overflow-hidden rounded-lg bg-white border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
        <Link href={articleHref} className="block aspect-[16/9] w-full overflow-hidden bg-gray-100 relative">
          <img
            src={imageUrl}
            alt={article.title}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            loading="eager"
          />
          {showCategory && article.category && (
            <span className="absolute top-3 left-3 bg-primary text-white text-xs font-bold px-2.5 py-1 rounded shadow">
              {article.category.name}
            </span>
          )}
        </Link>
        <div className="p-5">
          <h2 className="text-2xl md:text-3xl font-bold font-serif text-gray-900 group-hover:text-primary transition-colors leading-tight mb-3">
            <Link href={articleHref}>{article.title}</Link>
          </h2>
          {article.excerpt && (
            <p className="text-gray-600 text-sm md:text-base leading-relaxed line-clamp-3 mb-4">
              {article.excerpt}
            </p>
          )}
          <div className="flex items-center text-xs text-gray-500 space-x-3">
            {article.author?.name && (
              <span className="font-semibold text-gray-700">{article.author.name}</span>
            )}
            {article.sourceType === "CITATION" && article.sourceName && (
              <span className="inline-flex items-center text-primary font-medium">
                <ExternalLink className="w-3 h-3 mr-1" /> Theo {article.sourceName}
              </span>
            )}
            <span className="flex items-center">
              <Clock className="w-3.5 h-3.5 mr-1 text-gray-400" />
              {formatRelativeTime(dateToDisplay)}
            </span>
          </div>
        </div>
      </article>
    );
  }

  // HORIZONTAL VARIANT (Thumbnail on left, content on right)
  if (variant === "horizontal") {
    return (
      <article className="group flex flex-col sm:flex-row gap-4 py-4 border-b border-gray-200 last:border-0">
        <Link
          href={articleHref}
          className="sm:w-1/3 aspect-[16/10] overflow-hidden rounded bg-gray-100 flex-shrink-0"
        >
          <img
            src={imageUrl}
            alt={article.title}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            loading="lazy"
          />
        </Link>
        <div className="flex-1 flex flex-col justify-between">
          <div>
            {showCategory && article.category && (
              <Link
                href={`/danh-muc/${article.category.slug}`}
                className="text-xs font-bold text-primary hover:underline uppercase tracking-wider mb-1 inline-block"
              >
                {article.category.name}
              </Link>
            )}
            <h3 className="text-base sm:text-lg font-bold font-serif text-gray-900 group-hover:text-primary transition-colors line-clamp-2 leading-snug">
              <Link href={articleHref}>{article.title}</Link>
            </h3>
            {article.excerpt && (
              <p className="text-gray-600 text-xs sm:text-sm line-clamp-2 mt-1.5 leading-relaxed">
                {article.excerpt}
              </p>
            )}
          </div>
          <div className="flex items-center text-xs text-gray-400 space-x-3 mt-3">
            {article.sourceName ? (
              <span className="text-gray-500 font-medium">Nguồn: {article.sourceName}</span>
            ) : article.author?.name ? (
              <span className="text-gray-500">{article.author.name}</span>
            ) : null}
            <span className="flex items-center">
              <Clock className="w-3 h-3 mr-1" />
              {formatRelativeTime(dateToDisplay)}
            </span>
          </div>
        </div>
      </article>
    );
  }

  // COMPACT VARIANT (For sidebars, ranking list)
  if (variant === "compact") {
    return (
      <article className="group flex items-start gap-3 py-2.5 border-b border-gray-100 last:border-0">
        {rank !== undefined && (
          <span className="text-2xl font-black font-serif text-gray-300 group-hover:text-primary w-6 text-center transition-colors">
            {rank}
          </span>
        )}
        <div className="flex-1">
          {showCategory && article.category && (
            <span className="text-[10px] font-bold text-primary uppercase tracking-wider block mb-0.5">
              {article.category.name}
            </span>
          )}
          <h4 className="text-sm font-semibold font-serif text-gray-800 group-hover:text-primary transition-colors line-clamp-2 leading-snug">
            <Link href={articleHref}>{article.title}</Link>
          </h4>
          <span className="text-[11px] text-gray-400 flex items-center mt-1">
            <Clock className="w-3 h-3 mr-1" />
            {formatRelativeTime(dateToDisplay)}
          </span>
        </div>
      </article>
    );
  }

  // STANDARD CARD VARIANT (Default: vertical card for grids)
  return (
    <article className="group flex flex-col h-full bg-white rounded-md overflow-hidden border border-gray-100 hover:border-gray-300 transition-all">
      <Link href={articleHref} className="aspect-[16/10] overflow-hidden bg-gray-100 relative block">
        <img
          src={imageUrl}
          alt={article.title}
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          loading="lazy"
        />
        {showCategory && article.category && (
          <span className="absolute bottom-2 left-2 bg-black/70 backdrop-blur-sm text-white text-[11px] font-bold px-2 py-0.5 rounded">
            {article.category.name}
          </span>
        )}
      </Link>
      <div className="p-3.5 flex flex-col flex-1 justify-between">
        <div>
          <h3 className="text-base font-bold font-serif text-gray-900 group-hover:text-primary transition-colors line-clamp-2 leading-snug mb-2">
            <Link href={articleHref}>{article.title}</Link>
          </h3>
          {article.excerpt && (
            <p className="text-gray-600 text-xs line-clamp-2 leading-relaxed mb-3">
              {article.excerpt}
            </p>
          )}
        </div>
        <div className="flex items-center justify-between text-[11px] text-gray-400 pt-2 border-t border-gray-50">
          <span>{article.sourceName || article.author?.name || "TOÀN CẢNH 24H"}</span>
          <span className="flex items-center">
            <Clock className="w-3 h-3 mr-1" />
            {formatRelativeTime(dateToDisplay)}
          </span>
        </div>
      </div>
    </article>
  );
}
