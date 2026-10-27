"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  FileText,
  CheckCircle,
  Clock,
  Rss,
  Inbox,
  AlertTriangle,
  ArrowUpRight,
  RefreshCw,
  PlusCircle,
  ExternalLink,
  Layers,
  Activity,
  Loader2,
} from "lucide-react";
import { formatDateShort } from "@/lib/utils";

interface StatsData {
  counts: {
    totalArticles: number;
    publishedArticles: number;
    draftArticles: number;
    pendingArticles: number;
    activeSources: number;
    totalSources: number;
    totalScraped: number;
    pendingScraped: number;
    duplicateScraped: number;
    successfulScrapes: number;
    failedScrapes: number;
  };
  recentAuditLogs: Array<{
    id: string;
    action: string;
    entityType: string;
    createdAt: string;
    user?: { name: string; email: string };
  }>;
  recentArticles: Array<{
    id: string;
    title: string;
    slug: string;
    status: string;
    category: { name: string };
    author?: { name: string };
    createdAt: string;
  }>;
  categoryStats: Array<{
    id: string;
    name: string;
    _count: { articles: number };
  }>;
  sourceStats: Array<{
    id: string;
    name: string;
    _count: { scrapedArticles: number; jobs: number };
  }>;
}

export default function AdminDashboardPage() {
  const [data, setData] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/stats");
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  const counts = data?.counts || {
    totalArticles: 0,
    publishedArticles: 0,
    draftArticles: 0,
    pendingArticles: 0,
    activeSources: 0,
    totalSources: 0,
    totalScraped: 0,
    pendingScraped: 0,
    duplicateScraped: 0,
    successfulScrapes: 0,
    failedScrapes: 0,
  };

  return (
    <div className="space-y-8">
      {/* 1. Header & Quick Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-200">
        <div>
          <h1 className="text-2xl font-bold font-serif text-gray-900">
            Tổng Quan Tòa Soạn & Bảng Điều Khiển
          </h1>
          <p className="text-xs text-gray-500 mt-1">
            Theo dõi tình hình sản xuất tin bài, luồng tin tự động và trạng thái hệ thống.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={fetchStats}
            className="flex items-center text-xs font-semibold px-3 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-700 transition-colors shadow-2xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${loading ? "animate-spin" : ""}`} />
            Làm mới
          </button>
          <Link
            href="/admin/articles/new"
            className="flex items-center text-xs font-semibold px-3 py-2 bg-primary hover:bg-primary-hover text-white rounded-lg transition-colors shadow-2xs"
          >
            <PlusCircle className="w-3.5 h-3.5 mr-1.5" />
            Viết bài mới
          </Link>
        </div>
      </div>

      {/* 2. Key Metrics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Total Articles */}
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-2xs">
          <div className="flex items-center justify-between text-gray-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Tổng bài viết</span>
            <FileText className="w-4 h-4 text-primary" />
          </div>
          <div className="text-2xl font-bold text-gray-900">{counts.totalArticles}</div>
          <div className="flex items-center text-[11px] text-gray-500 mt-1 space-x-2">
            <span className="text-emerald-600 font-semibold">{counts.publishedArticles} đã xuất bản</span>
            <span>•</span>
            <span className="text-amber-600 font-semibold">{counts.draftArticles} bản nháp</span>
          </div>
        </div>

        {/* Active News Sources */}
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-2xs">
          <div className="flex items-center justify-between text-gray-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Nguồn tin tự động</span>
            <Rss className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-2xl font-bold text-gray-900">{counts.activeSources}</div>
          <div className="text-[11px] text-gray-500 mt-1">
            Tổng cộng: <strong>{counts.totalSources}</strong> nguồn cấu hình
          </div>
        </div>

        {/* Scraped Queue */}
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-2xs">
          <div className="flex items-center justify-between text-gray-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Bài thu thập</span>
            <Inbox className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-bold text-gray-900">{counts.totalScraped}</div>
          <div className="flex items-center text-[11px] text-gray-500 mt-1 space-x-2">
            <span className="text-amber-600 font-semibold">{counts.pendingScraped} chờ duyệt</span>
            <span>•</span>
            <span className="text-gray-400">{counts.duplicateScraped} trùng lặp</span>
          </div>
        </div>

        {/* Scrape Jobs Health */}
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-2xs">
          <div className="flex items-center justify-between text-gray-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Tỷ lệ quét thành công</span>
            <CheckCircle className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-bold text-gray-900">
            {counts.successfulScrapes + counts.failedScrapes > 0
              ? Math.round(
                  (counts.successfulScrapes / (counts.successfulScrapes + counts.failedScrapes)) * 100
                )
              : 100}
            %
          </div>
          <div className="text-[11px] text-gray-500 mt-1">
            <span className="text-emerald-600">{counts.successfulScrapes} thành công</span> /{" "}
            <span className="text-rose-600">{counts.failedScrapes} lỗi</span>
          </div>
        </div>
      </div>

      {/* 3. Charts & Distributions */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Category distribution */}
        <div className="lg:col-span-6 bg-white p-5 rounded-xl border border-gray-200 shadow-2xs">
          <h3 className="text-sm font-bold text-gray-900 mb-4 flex items-center">
            <Layers className="w-4 h-4 text-primary mr-2" />
            Phân Bổ Bài Viết Theo Chuyên Mục
          </h3>

          <div className="space-y-3">
            {data?.categoryStats?.map((cat) => {
              const maxCount = Math.max(...(data.categoryStats.map((c) => c._count.articles) || [1]), 1);
              const percentage = Math.round((cat._count.articles / maxCount) * 100);

              return (
                <div key={cat.id} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-gray-700">{cat.name}</span>
                    <span className="text-gray-500 font-semibold">{cat._count.articles} bài</span>
                  </div>
                  <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-primary h-full rounded-full transition-all duration-500"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Source scrapers health */}
        <div className="lg:col-span-6 bg-white p-5 rounded-xl border border-gray-200 shadow-2xs">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-gray-900 flex items-center">
              <Rss className="w-4 h-4 text-blue-600 mr-2" />
              Năng Suất Nguồn Tin Tự Động
            </h3>
            <Link
              href="/admin/sources"
              className="text-xs text-primary font-semibold hover:underline flex items-center"
            >
              Quản lý nguồn <ArrowUpRight className="w-3 h-3 ml-0.5" />
            </Link>
          </div>

          <div className="space-y-3">
            {data?.sourceStats?.map((src) => (
              <div
                key={src.id}
                className="flex items-center justify-between p-2.5 bg-gray-50 rounded-lg text-xs"
              >
                <div className="font-semibold text-gray-800">{src.name}</div>
                <div className="flex items-center space-x-3 text-gray-500">
                  <span>{src._count.scrapedArticles} bài đã quét</span>
                  <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded font-bold">
                    {src._count.jobs} lần chạy
                  </span>
                </div>
              </div>
            ))}
            {(!data?.sourceStats || data.sourceStats.length === 0) && (
              <p className="text-xs text-gray-400 text-center py-4">Chưa có nguồn tin nào.</p>
            )}
          </div>
        </div>
      </div>

      {/* 4. Recent Articles & Audit Logs */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Recent Articles Table (7 cols) */}
        <div className="lg:col-span-7 bg-white p-5 rounded-xl border border-gray-200 shadow-2xs">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-gray-900 flex items-center">
              <FileText className="w-4 h-4 text-primary mr-2" />
              Bài Viết Mới Cập Nhật
            </h3>
            <Link
              href="/admin/articles"
              className="text-xs text-primary font-semibold hover:underline"
            >
              Xem tất cả
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="border-b border-gray-200 text-gray-500 font-bold uppercase">
                  <th className="py-2">Tiêu đề</th>
                  <th className="py-2">Chuyên mục</th>
                  <th className="py-2">Trạng thái</th>
                  <th className="py-2 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {data?.recentArticles?.map((art) => (
                  <tr key={art.id} className="hover:bg-gray-50">
                    <td className="py-2.5 pr-2 font-medium text-gray-900 max-w-xs truncate">
                      {art.title}
                    </td>
                    <td className="py-2.5 text-gray-500">{art.category?.name}</td>
                    <td className="py-2.5">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          art.status === "PUBLISHED"
                            ? "bg-emerald-100 text-emerald-700"
                            : art.status === "PENDING"
                            ? "bg-amber-100 text-amber-700"
                            : "bg-gray-100 text-gray-700"
                        }`}
                      >
                        {art.status}
                      </span>
                    </td>
                    <td className="py-2.5 text-right">
                      <Link
                        href={`/admin/articles/${art.id}/edit`}
                        className="text-primary hover:underline font-semibold"
                      >
                        Sửa
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Audit Log (5 cols) */}
        <div className="lg:col-span-5 bg-white p-5 rounded-xl border border-gray-200 shadow-2xs">
          <h3 className="text-sm font-bold text-gray-900 mb-4 flex items-center">
            <Activity className="w-4 h-4 text-emerald-600 mr-2" />
            Nhật Ký Thao Tác Gần Đây
          </h3>

          <div className="space-y-3">
            {data?.recentAuditLogs?.map((log) => (
              <div key={log.id} className="text-xs p-2 bg-gray-50 rounded border border-gray-100">
                <div className="flex items-center justify-between font-semibold text-gray-800">
                  <span className="text-primary">{log.action}</span>
                  <span className="text-[10px] text-gray-400">
                    {formatDateShort(log.createdAt)}
                  </span>
                </div>
                <div className="text-gray-500 text-[11px] mt-0.5">
                  Thực hiện bởi: <strong>{log.user?.name || "Hệ thống"}</strong> ({log.entityType})
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
