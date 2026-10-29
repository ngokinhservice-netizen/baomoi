import React from "react";
import Link from "next/link";
import { ArticleCardData } from "./ArticleCard";
import { ChevronRight } from "lucide-react";

interface VehicleShowcaseProps {
  articles: ArticleCardData[];
}

const SUB_LINKS = [
  { name: "Mobility Awards 2026", href: "/danh-muc/xe?sub=mobility" },
  { name: "Thị trường", href: "/danh-muc/xe?sub=thi-truong" },
  { name: "Xe điện", href: "/danh-muc/xe?sub=xe-dien" },
  { name: "Diễn đàn", href: "/danh-muc/xe?sub=dien-dan" },
  { name: "V-Car", href: "/danh-muc/xe?sub=v-car" },
  { name: "V-Bike", href: "/danh-muc/xe?sub=v-bike" },
  { name: "Cầm lái", href: "/danh-muc/xe?sub=cam-lai" },
  { name: "Thi bằng lái", href: "/danh-muc/xe?sub=thi-bang-lai" },
];

export default function VehicleShowcaseSection({ articles }: VehicleShowcaseProps) {
  if (!articles || articles.length === 0) return null;

  const heroArticle = articles[0];
  const middleArticles = articles.slice(1, 3);
  const rightArticles = articles.slice(3, 6);

  const getArticleLink = (art: ArticleCardData) => {
    const catSlug = art.category?.slug || "xe";
    return `/${catSlug}/${art.slug}`;
  };

  return (
    <section className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm my-8">
      {/* 1. Header with title and sub-links */}
      <div className="flex flex-col md:flex-row md:items-center justify-between pb-3 mb-5 border-b-2 border-primary gap-2">
        <div className="flex items-center space-x-3">
          <Link
            href="/danh-muc/xe"
            className="text-2xl font-bold font-serif text-primary hover:text-red-700 transition-colors uppercase tracking-tight flex items-center"
          >
            Xe
          </Link>
        </div>

        {/* Sub-navigation links */}
        <div className="flex items-center flex-wrap gap-x-3 gap-y-1 text-xs text-gray-600 font-medium">
          {SUB_LINKS.map((sub, i) => (
            <React.Fragment key={sub.name}>
              <Link href={sub.href} className="hover:text-primary transition-colors">
                {sub.name}
              </Link>
              {i < SUB_LINKS.length - 1 && <span className="text-gray-300">•</span>}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* 2. 3-Column Layout: Left (50%), Middle (25%), Right (25%) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Column 1: Left Hero Article (6 cols / 50%) */}
        {heroArticle && (
          <div className="lg:col-span-6 flex flex-col justify-between">
            <Link
              href={getArticleLink(heroArticle)}
              className="group block aspect-[16/10] overflow-hidden rounded-lg bg-gray-100 relative mb-3"
            >
              <img
                src={
                  heroArticle.featuredImage ||
                  "https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=1000&q=80"
                }
                alt={heroArticle.title}
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                style={{ imageRendering: "-webkit-optimize-contrast" }}
                referrerPolicy="no-referrer"
                loading="lazy"
              />
            </Link>

            <div>
              <h3 className="text-xl sm:text-2xl font-bold font-serif text-gray-900 hover:text-primary transition-colors leading-snug mb-2">
                <Link href={getArticleLink(heroArticle)}>{heroArticle.title}</Link>
              </h3>
              {heroArticle.excerpt && (
                <p className="text-gray-600 text-xs sm:text-sm line-clamp-3 leading-relaxed">
                  {heroArticle.excerpt}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Column 2: Middle 2 Stacked Cards (3 cols / 25%) */}
        <div className="lg:col-span-3 flex flex-col justify-between divide-y divide-gray-100 lg:border-l lg:border-r border-gray-100 lg:px-4">
          {middleArticles.map((art) => (
            <div key={art.id} className="py-3 first:pt-0 last:pb-0">
              <Link
                href={getArticleLink(art)}
                className="group block aspect-[16/10] overflow-hidden rounded bg-gray-100 mb-2"
              >
                <img
                  src={
                    art.featuredImage ||
                    "https://images.unsplash.com/photo-1549399542-7e3f8b79c341?w=600&q=80"
                  }
                  alt={art.title}
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                  style={{ imageRendering: "-webkit-optimize-contrast" }}
                  referrerPolicy="no-referrer"
                  loading="lazy"
                />
              </Link>
              <h4 className="text-sm font-semibold font-serif text-gray-900 hover:text-primary transition-colors line-clamp-2 leading-snug">
                <Link href={getArticleLink(art)}>{art.title}</Link>
              </h4>
            </div>
          ))}
        </div>

        {/* Column 3: Right 3 Compact Thumbnail Items (3 cols / 25%) */}
        <div className="lg:col-span-3 flex flex-col justify-between divide-y divide-gray-100">
          {rightArticles.map((art) => (
            <div key={art.id} className="py-2.5 first:pt-0 last:pb-0 flex items-start gap-2.5">
              <div className="flex-1">
                <h5 className="text-xs sm:text-sm font-medium font-serif text-gray-800 hover:text-primary transition-colors line-clamp-3 leading-snug">
                  <Link href={getArticleLink(art)}>{art.title}</Link>
                </h5>
              </div>

              <Link
                href={getArticleLink(art)}
                className="w-20 h-14 flex-shrink-0 overflow-hidden rounded bg-gray-100 block"
              >
                <img
                  src={
                    art.featuredImage ||
                    "https://images.unsplash.com/photo-1552519507-da3b142c6e3d?w=300&q=80"
                  }
                  alt={art.title}
                  className="w-full h-full object-cover"
                  style={{ imageRendering: "-webkit-optimize-contrast" }}
                  referrerPolicy="no-referrer"
                  loading="lazy"
                />
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
