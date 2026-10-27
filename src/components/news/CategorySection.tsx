import React from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import ArticleCard, { ArticleCardData } from "./ArticleCard";

interface CategorySectionProps {
  title: string;
  slug: string;
  articles: ArticleCardData[];
}

export default function CategorySection({ title, slug, articles }: CategorySectionProps) {
  if (!articles || articles.length === 0) return null;

  const mainArticle = articles[0];
  const sideArticles = articles.slice(1, 4);

  return (
    <section className="mb-10 pb-8 border-b border-gray-200 last:border-0">
      {/* Section Header */}
      <div className="flex items-center justify-between pb-2 mb-4 border-b-2 border-primary">
        <Link
          href={`/danh-muc/${slug}`}
          className="text-lg md:text-xl font-bold font-serif text-gray-900 hover:text-primary flex items-center transition-colors uppercase tracking-tight"
        >
          <span className="w-2.5 h-2.5 bg-primary rounded-full mr-2"></span>
          {title}
        </Link>
        <Link
          href={`/danh-muc/${slug}`}
          className="text-xs font-semibold text-gray-500 hover:text-primary flex items-center transition-colors"
        >
          Xem tất cả <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
        </Link>
      </div>

      {/* Section Body: 1 main article + 3 side articles */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Main Article (Left 7 cols) */}
        {mainArticle && (
          <div className="lg:col-span-7">
            <ArticleCard article={mainArticle} variant="standard" showCategory={false} />
          </div>
        )}

        {/* Side Articles (Right 5 cols) */}
        <div className="lg:col-span-5 flex flex-col divide-y divide-gray-100">
          {sideArticles.map((article, idx) => (
            <ArticleCard
              key={article.id || idx}
              article={article}
              variant="compact"
              showCategory={false}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
