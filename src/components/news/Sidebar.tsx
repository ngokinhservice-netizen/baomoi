import React from "react";
import Link from "next/link";
import { TrendingUp, Radio, Tag } from "lucide-react";
import ArticleCard, { ArticleCardData } from "./ArticleCard";

interface SidebarProps {
  mostReadArticles?: ArticleCardData[];
  latestNews?: ArticleCardData[];
}

export default function Sidebar({ mostReadArticles = [], latestNews = [] }: SidebarProps) {
  return (
    <aside className="space-y-8">
      {/* 1. Tin Đọc Nhiều (Ranking 1 - 5) */}
      <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
        <div className="flex items-center justify-between pb-2 mb-3 border-b-2 border-primary">
          <h3 className="text-base font-bold font-serif text-gray-900 flex items-center uppercase tracking-wide">
            <TrendingUp className="w-4 h-4 text-primary mr-1.5" />
            Đọc nhiều nhất
          </h3>
        </div>

        <div className="divide-y divide-gray-100">
          {mostReadArticles.slice(0, 5).map((article, index) => (
            <ArticleCard
              key={article.id}
              article={article}
              variant="compact"
              rank={index + 1}
              showCategory={true}
            />
          ))}
          {mostReadArticles.length === 0 && (
            <p className="text-xs text-gray-400 py-3 text-center">Đang cập nhật tin đọc nhiều...</p>
          )}
        </div>
      </div>

      {/* 2. Dòng sự kiện / Tin mới nhận */}
      <div className="bg-gray-50 rounded-lg border border-gray-200 p-4">
        <div className="flex items-center justify-between pb-2 mb-3 border-b-2 border-gray-400">
          <h3 className="text-base font-bold font-serif text-gray-900 flex items-center uppercase tracking-wide">
            <Radio className="w-4 h-4 text-primary mr-1.5 animate-pulse" />
            Tin mới nhận 24/7
          </h3>
        </div>

        <div className="divide-y divide-gray-200">
          {latestNews.slice(0, 5).map((article) => (
            <ArticleCard
              key={article.id}
              article={article}
              variant="compact"
              showCategory={false}
            />
          ))}
        </div>
      </div>

      {/* 3. Chủ đề thịnh hành / Tags */}
      <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
        <div className="flex items-center justify-between pb-2 mb-3 border-b-2 border-primary">
          <h3 className="text-base font-bold font-serif text-gray-900 flex items-center uppercase tracking-wide">
            <Tag className="w-4 h-4 text-primary mr-1.5" />
            Chủ đề quan tâm
          </h3>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {["Hạ tầng giao thông", "Trí tuệ nhân tạo", "Thị trường vàng", "Xuất khẩu nông sản", "Ngoại hạng Anh", "Tuyển sinh 2026", "Chuyển đổi số", "Du lịch xanh"].map((tag) => (
            <Link
              key={tag}
              href={`/search?q=${encodeURIComponent(tag)}`}
              className="text-xs bg-gray-100 hover:bg-primary hover:text-white text-gray-700 px-2.5 py-1 rounded transition-colors"
            >
              #{tag}
            </Link>
          ))}
        </div>
      </div>
    </aside>
  );
}
