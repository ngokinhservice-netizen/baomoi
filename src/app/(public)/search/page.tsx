import React from "react";
import Link from "next/link";
import prisma from "@/lib/prisma";
import ArticleCard from "@/components/news/ArticleCard";
import Sidebar from "@/components/news/Sidebar";
import { getCategories, getMostReadArticles } from "@/lib/data";
import { Search as SearchIcon, ChevronRight } from "lucide-react";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Tìm kiếm tin tức | NHỊP SỐNG 247",
  description: "Tìm kiếm các bài viết, sự kiện, thời sự trên Báo điện tử NHỊP SỐNG 247.",
};

interface SearchPageProps {
  searchParams: {
    q?: string;
    category?: string;
    page?: string;
  };
}

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const query = searchParams.q?.trim() || "";
  const categorySlug = searchParams.category || "";
  const page = Math.max(1, parseInt(searchParams.page || "1", 10));
  const limit = 10;

  const categories = await getCategories();
  const mostRead = await getMostReadArticles(5);

  const where: any = { status: "PUBLISHED" };

  if (query) {
    where.OR = [
      { title: { contains: query } },
      { excerpt: { contains: query } },
      { content: { contains: query } },
    ];
  }

  if (categorySlug) {
    where.category = { slug: categorySlug };
  }

  const [total, articles] = await Promise.all([
    prisma.article.count({ where }),
    prisma.article.findMany({
      where,
      include: {
        category: true,
        author: { select: { name: true } },
      },
      orderBy: { publishedAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
  ]);

  const totalPages = Math.ceil(total / limit);

  return (
    <div>
      {/* Breadcrumb */}
      <nav className="flex items-center space-x-1.5 text-xs text-gray-500 mb-4 pb-2 border-b border-gray-100">
        <Link href="/" className="hover:text-primary transition-colors">
          Trang chủ
        </Link>
        <ChevronRight className="w-3.5 h-3.5 text-gray-400" />
        <span className="font-semibold text-gray-800">Tìm kiếm</span>
      </nav>

      {/* Search Header Form */}
      <div className="bg-gray-50 p-6 rounded-lg border border-gray-200 mb-8">
        <h1 className="text-xl sm:text-2xl font-bold font-serif text-gray-900 mb-4 flex items-center">
          <SearchIcon className="w-6 h-6 text-primary mr-2" />
          Tìm kiếm bài viết
        </h1>

        <form method="GET" action="/search" className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <input
              type="text"
              name="q"
              defaultValue={query}
              placeholder="Nhập tiêu đề, sự kiện hoặc từ khóa cần tìm..."
              className="flex-1 bg-white border border-gray-300 rounded-md px-4 py-2 text-sm focus:border-primary focus:outline-none shadow-sm"
            />

            <select
              name="category"
              defaultValue={categorySlug}
              aria-label="Chọn chuyên mục"
              className="bg-white border border-gray-300 rounded-md px-4 py-2 text-sm focus:border-primary focus:outline-none shadow-sm"
            >
              <option value="">Tất cả chuyên mục</option>
              {categories.map((c) => (
                <option key={c.id} value={c.slug}>
                  {c.name}
                </option>
              ))}
            </select>

            <button
              type="submit"
              className="bg-primary hover:bg-primary-hover text-white text-sm font-semibold px-6 py-2 rounded-md transition-colors shadow-sm flex items-center justify-center"
            >
              Tìm kiếm
            </button>
          </div>
        </form>

        {query && (
          <p className="text-xs text-gray-500 mt-3">
            Tìm thấy <strong>{total}</strong> kết quả phù hợp với từ khóa &ldquo;<strong>{query}</strong>&rdquo;
          </p>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Results list (8 cols) */}
        <div className="lg:col-span-8">
          {articles.length > 0 ? (
            <div className="divide-y divide-gray-200">
              {articles.map((article) => (
                <ArticleCard key={article.id} article={article} variant="horizontal" />
              ))}
            </div>
          ) : (
            <div className="bg-white p-12 text-center rounded-lg border border-gray-200">
              <SearchIcon className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-base text-gray-700 font-semibold">
                Không tìm thấy bài viết nào phù hợp.
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Hãy thử tìm kiếm với từ khóa khác hoặc bỏ chọn bộ lọc chuyên mục.
              </p>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center space-x-2 mt-10 pt-6 border-t border-gray-200">
              {Array.from({ length: totalPages }).map((_, i) => {
                const p = i + 1;
                const isCurrent = p === page;
                const searchParamsString = new URLSearchParams({
                  ...(query ? { q: query } : {}),
                  ...(categorySlug ? { category: categorySlug } : {}),
                  page: String(p),
                }).toString();

                return (
                  <Link
                    key={p}
                    href={`/search?${searchParamsString}`}
                    className={`w-9 h-9 rounded flex items-center justify-center text-sm font-semibold transition-colors ${
                      isCurrent
                        ? "bg-primary text-white"
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    }`}
                  >
                    {p}
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        {/* Sidebar (4 cols) */}
        <div className="lg:col-span-4">
          <Sidebar mostReadArticles={mostRead} />
        </div>
      </div>
    </div>
  );
}
