import React from "react";
import Link from "next/link";
import ArticleCard from "@/components/news/ArticleCard";
import CategorySection from "@/components/news/CategorySection";
import Sidebar from "@/components/news/Sidebar";
import {
  getFeaturedArticles,
  getLatestArticles,
  getMostReadArticles,
  getArticlesByCategory,
} from "@/lib/data";
import { checkAndSyncHomepageMirror } from "@/lib/scraper/homepageMirror";
import { Sparkles, Newspaper, Flame, BookmarkCheck } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  // Tự động kiểm tra và soi gương trang chủ VnExpress mỗi 3 phút (chạy nhanh ~400ms)
  await checkAndSyncHomepageMirror().catch(() => {});

  const [
    featuredArticles,
    latestArticles,
    mostReadArticles,
    thoiSuArticles,
    theGioiArticles,
    kinhDoanhArticles,
    congNgheArticles,
    giaoDucArticles,
    doiSongArticles,
    theThaoArticles,
    giaiTriArticles,
  ] = await Promise.all([
    getFeaturedArticles(5),
    getLatestArticles(8),
    getMostReadArticles(5),
    getArticlesByCategory("thoi-su", 4),
    getArticlesByCategory("the-gioi", 4),
    getArticlesByCategory("kinh-doanh", 4),
    getArticlesByCategory("cong-nghe", 4),
    getArticlesByCategory("giao-duc", 4),
    getArticlesByCategory("doi-song", 4),
    getArticlesByCategory("the-thao", 4),
    getArticlesByCategory("giai-tri", 4),
  ]);

  const heroArticle = featuredArticles[0] || latestArticles[0];
  const secondaryFeatured = featuredArticles.slice(1, 4);
  const featuredIds = new Set(featuredArticles.map((a) => a.id));
  const cleanLatestArticles = latestArticles.filter((a) => !featuredIds.has(a.id));
  const editorPicks = cleanLatestArticles.slice(6, 10);

  return (
    <div className="space-y-10">
      {/* 1. TOP SPOTLIGHT / TIN NỔI BẬT & TIN MỚI NHẤT */}
      <section className="border-b border-gray-200 pb-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Main Hero Story (7 cols) */}
          <div className="lg:col-span-7">
            {heroArticle ? (
              <ArticleCard article={heroArticle} variant="hero" />
            ) : (
              <div className="bg-gray-100 p-8 rounded text-center text-gray-500">
                Chưa có bài viết nổi bật.
              </div>
            )}
          </div>

          {/* Secondary Spotlight Stories (5 cols) */}
          <div className="lg:col-span-5 flex flex-col justify-between divide-y divide-gray-100 bg-gray-50/70 p-4 rounded-lg border border-gray-100">
            <div className="flex items-center space-x-2 pb-2 mb-2 text-primary font-bold text-sm tracking-wide uppercase border-b border-gray-200">
              <Sparkles className="w-4 h-4" />
              <span>Tiêu Điểm Trong Ngày</span>
            </div>
            {secondaryFeatured.map((art) => (
              <ArticleCard key={art.id} article={art} variant="horizontal" />
            ))}
            {secondaryFeatured.length === 0 && (
              <p className="text-sm text-gray-400 py-4 text-center">Đang cập nhật tiêu điểm...</p>
            )}
          </div>
        </div>
      </section>

      {/* 2. DÒNG TIN MỚI NHẤT & CỘT PHẢI (SIDEBAR) */}
      <section>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Main Column (8 cols): Latest news + Category blocks */}
          <div className="lg:col-span-8 space-y-10">
            {/* Tin mới nhất Ticker Grid */}
            <div className="bg-white rounded-lg border border-gray-200 p-5 shadow-sm">
              <div className="flex items-center justify-between pb-2 mb-4 border-b-2 border-primary">
                <h2 className="text-lg md:text-xl font-bold font-serif text-gray-900 flex items-center uppercase tracking-tight">
                  <Newspaper className="w-5 h-5 text-primary mr-2" />
                  Dòng thời sự mới nhất
                </h2>
                <Link
                  href="/search"
                  className="text-xs font-semibold text-gray-500 hover:text-primary transition-colors"
                >
                  Xem tất cả
                </Link>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 divide-y md:divide-y-0 md:divide-x divide-gray-100">
                <div className="space-y-4">
                  {cleanLatestArticles.slice(0, 3).map((art) => (
                    <ArticleCard key={art.id} article={art} variant="compact" />
                  ))}
                </div>
                <div className="space-y-4 md:pl-4 pt-4 md:pt-0">
                  {cleanLatestArticles.slice(3, 6).map((art) => (
                    <ArticleCard key={art.id} article={art} variant="compact" />
                  ))}
                </div>
              </div>
            </div>

            {/* 3. THỜI SỰ */}
            <CategorySection
              title="Thời sự chính trị - xã hội"
              slug="thoi-su"
              articles={thoiSuArticles}
            />

            {/* 4. THẾ GIỚI */}
            <CategorySection
              title="Thời sự thế giới"
              slug="the-gioi"
              articles={theGioiArticles}
            />

            {/* 5. KINH DOANH */}
            <CategorySection
              title="Kinh doanh & Thị trường"
              slug="kinh-doanh"
              articles={kinhDoanhArticles}
            />

            {/* 6. CÔNG NGHỆ */}
            <CategorySection
              title="Công nghệ & Đổi mới sáng tạo"
              slug="cong-nghe"
              articles={congNgheArticles}
            />

            {/* 7. GIÁO DỤC */}
            <CategorySection
              title="Giáo dục & Học đường"
              slug="giao-duc"
              articles={giaoDucArticles}
            />

            {/* 8. ĐỜI SỐNG */}
            <CategorySection
              title="Đời sống & Sức khỏe"
              slug="doi-song"
              articles={doiSongArticles}
            />

            {/* 9. THỂ THAO */}
            <CategorySection
              title="Thể thao 24/7"
              slug="the-thao"
              articles={theThaoArticles}
            />

            {/* 10. GIẢI TRÍ */}
            <CategorySection
              title="Văn hóa & Giải trí"
              slug="giai-tri"
              articles={giaiTriArticles}
            />

            {/* 12. BÀI VIẾT ĐƯỢC BIÊN TẬP VIÊN LỰA CHỌN */}
            {editorPicks.length > 0 && (
              <div className="bg-red-50/50 rounded-lg border border-red-100 p-5">
                <div className="flex items-center space-x-2 pb-2 mb-4 border-b border-red-200 text-primary font-bold text-base uppercase">
                  <BookmarkCheck className="w-5 h-5 text-primary" />
                  <span>Biên Tập Viên Lựa Chọn</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {editorPicks.slice(0, 4).map((art) => (
                    <ArticleCard key={art.id} article={art} variant="standard" />
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Sidebar Column (4 cols) */}
          <div className="lg:col-span-4">
            <div className="sticky top-24">
              <Sidebar
                mostReadArticles={mostReadArticles}
                latestNews={cleanLatestArticles.slice(0, 5)}
              />
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
