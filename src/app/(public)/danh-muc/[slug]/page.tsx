import React from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import prisma from "@/lib/prisma";
import ArticleCard from "@/components/news/ArticleCard";
import Sidebar from "@/components/news/Sidebar";
import { getMostReadArticles, deduplicateArticles } from "@/lib/data";
import { ChevronRight, Filter } from "lucide-react";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

interface CategoryPageProps {
  params: { slug: string };
  searchParams: { page?: string; sort?: string };
}

export async function generateMetadata({ params }: CategoryPageProps): Promise<Metadata> {
  const category = await prisma.category.findUnique({
    where: { slug: params.slug },
  });

  if (!category) return { title: "Không tìm thấy chuyên mục | NHỊP SỐNG 247" };

  return {
    title: `${category.name} | NHỊP SỐNG 247`,
    description: category.description || `Tin tức thời sự chuyên mục ${category.name} trên NHỊP SỐNG 247.`,
  };
}

export default async function CategoryPage({ params, searchParams }: CategoryPageProps) {
  const category = await prisma.category.findUnique({
    where: { slug: params.slug },
  });

  if (!category) {
    notFound();
  }

  const page = Math.max(1, parseInt(searchParams.page || "1", 10));
  const limit = 12;
  const sort = searchParams.sort === "views" ? "views" : "publishedAt";

  const orderBy = sort === "views" ? [{ views: "desc" }, { publishedAt: "desc" }] : [{ publishedAt: "desc" }];

  const [total, articles, mostReadArticles] = await Promise.all([
    prisma.article.count({
      where: { categoryId: category.id, status: "PUBLISHED" },
    }),
    prisma.article.findMany({
      where: { categoryId: category.id, status: "PUBLISHED" },
      include: {
        category: true,
        author: { select: { name: true } },
      },
      orderBy: orderBy as any,
      skip: (page - 1) * limit,
      take: limit * 2,
    }),
    getMostReadArticles(5),
  ]);

  const displayArticles = deduplicateArticles(articles).slice(0, limit);
  const totalPages = Math.ceil(total / limit);

  return (
    <div>
      {/* Breadcrumb */}
      <nav className="flex items-center space-x-1.5 text-xs text-gray-500 mb-4 pb-2 border-b border-gray-100">
        <Link href="/" className="hover:text-primary transition-colors">
          Trang chủ
        </Link>
        <ChevronRight className="w-3.5 h-3.5 text-gray-400" />
        <span className="font-semibold text-gray-800 uppercase">{category.name}</span>
      </nav>

      {/* Category Header */}
      <div className="pb-4 mb-6 border-b-2 border-primary flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold font-serif text-gray-900 uppercase tracking-tight">
            {category.name}
          </h1>
          {category.description && (
            <p className="text-sm text-gray-600 mt-1 max-w-2xl">{category.description}</p>
          )}
        </div>

        {/* Sort selector */}
        <div className="flex items-center space-x-2 text-xs">
          <span className="text-gray-500 flex items-center">
            <Filter className="w-3 h-3 mr-1" /> Sắp xếp:
          </span>
          <Link
            href={`/danh-muc/${params.slug}?sort=date`}
            className={`px-2.5 py-1 rounded font-medium ${
              sort !== "views" ? "bg-primary text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            Mới nhất
          </Link>
          <Link
            href={`/danh-muc/${params.slug}?sort=views`}
            className={`px-2.5 py-1 rounded font-medium ${
              sort === "views" ? "bg-primary text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            Xem nhiều nhất
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Main Article Grid (8 cols) */}
        <div className="lg:col-span-8">
          {displayArticles.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {displayArticles.map((article) => (
                <ArticleCard key={article.id} article={article} variant="standard" />
              ))}
            </div>
          ) : (
            <div className="bg-gray-50 p-12 text-center rounded-lg border border-gray-200">
              <p className="text-base text-gray-600 font-medium">Chưa có bài viết nào trong chuyên mục này.</p>
              <Link href="/" className="inline-block mt-4 text-xs font-semibold text-primary underline">
                Trở về trang chủ
              </Link>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center space-x-2 mt-10 pt-6 border-t border-gray-200">
              {Array.from({ length: totalPages }).map((_, i) => {
                const p = i + 1;
                const isCurrent = p === page;
                return (
                  <Link
                    key={p}
                    href={`/danh-muc/${params.slug}?page=${p}&sort=${sort}`}
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
          <Sidebar mostReadArticles={mostReadArticles} />
        </div>
      </div>
    </div>
  );
}
