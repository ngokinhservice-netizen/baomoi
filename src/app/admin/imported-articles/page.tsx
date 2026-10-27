"use client";

import React, { useState, useEffect } from "react";
import {
  Inbox,
  Filter,
  CheckCircle,
  Clock,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Send,
  FileEdit,
  Trash2,
  RefreshCw,
  Eye,
  AlertTriangle,
  FolderPlus,
} from "lucide-react";
import { formatDate } from "@/lib/utils";

interface ScrapedItem {
  id: string;
  title: string;
  originalUrl: string;
  excerpt?: string;
  extractedContent?: string;
  imageUrl?: string;
  processingStatus: string;
  permissionStatus: string;
  discoveredAt: string;
  source: { id: string; name: string; homepageUrl: string };
  linkedArticle?: { id: string; title: string; slug: string; status: string };
}

interface CategoryOption {
  id: string;
  name: string;
}

export default function ImportedArticlesQueuePage() {
  const [items, setItems] = useState<ScrapedItem[]>([]);
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  // Preview Drawer Modal
  const [previewItem, setPreviewItem] = useState<ScrapedItem | null>(null);
  const [selectedCategory, setSelectedCategory] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  const fetchCategories = async () => {
    try {
      const res = await fetch("/api/admin/categories");
      if (res.ok) {
        const data = await res.json();
        setCategories(data.categories || []);
        if (data.categories?.length > 0) {
          setSelectedCategory(data.categories[0].id);
        }
      }
    } catch {
      // ignore
    }
  };

  const fetchItems = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: "15",
        status: statusFilter,
      });

      const res = await fetch(`/api/admin/imported-articles?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setItems(data.items || []);
        setTotalPages(data.pagination.totalPages || 1);
        setTotal(data.pagination.total || 0);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    fetchItems();
  }, [page, statusFilter]);

  const handleAction = async (id: string, action: string) => {
    setActionLoading(true);
    try {
      const res = await fetch("/api/admin/imported-articles", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id,
          action,
          categoryId: selectedCategory,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setPreviewItem(null);
        fetchItems();
      } else {
        alert(data.error || "Thao tác không thành công.");
      }
    } catch {
      alert("Lỗi kết nối máy chủ.");
    } finally {
      setActionLoading(false);
    }
  };

  const statusTabs = [
    { label: "Tất cả", value: "ALL" },
    { label: "Chờ xử lý (Pending)", value: "PENDING" },
    { label: "Đã xuất bản (Published)", value: "PUBLISHED" },
    { label: "Đã nhập (Imported)", value: "IMPORTED" },
    { label: "Trùng lặp (Duplicate)", value: "DUPLICATE" },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-200">
        <div>
          <h1 className="text-2xl font-bold font-serif text-gray-900">
            Hàng Đợi Bài Viết Thu Thập (Import Queue)
          </h1>
          <p className="text-xs text-gray-500 mt-1">
            Kiểm tra, phân loại chuyên mục và phê duyệt các bài viết mới được phát hiện từ nguồn tin tự động.
          </p>
        </div>

        <button
          onClick={fetchItems}
          className="flex items-center text-xs font-semibold px-3 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-700 transition-colors shadow-2xs"
        >
          <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${loading ? "animate-spin" : ""}`} />
          Làm mới hàng đợi
        </button>
      </div>

      {/* Status Filter Tabs */}
      <div className="flex space-x-1 border-b border-gray-200 overflow-x-auto text-xs font-semibold">
        {statusTabs.map((tab) => (
          <button
            key={tab.value}
            onClick={() => {
              setStatusFilter(tab.value);
              setPage(1);
            }}
            className={`px-4 py-2.5 border-b-2 transition-colors whitespace-nowrap ${
              statusFilter === tab.value
                ? "border-primary text-primary font-bold"
                : "border-transparent text-gray-500 hover:text-gray-900"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Queue Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-2xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center">
            <Loader2 className="w-8 h-8 text-primary animate-spin mx-auto" />
            <p className="text-xs text-gray-500 mt-2">Đang tải hàng đợi bài viết...</p>
          </div>
        ) : items.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200 text-gray-600 font-bold uppercase tracking-wider">
                  <th className="py-3 px-4">Bài viết & Nguồn</th>
                  <th className="py-3 px-4">Trạng thái xử lý</th>
                  <th className="py-3 px-4">Quyền sử dụng</th>
                  <th className="py-3 px-4">Thời gian phát hiện</th>
                  <th className="py-3 px-4 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {items.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                    <td className="py-3 px-4 max-w-md">
                      <div className="flex items-start space-x-3">
                        {item.imageUrl && (
                          <img
                            src={item.imageUrl}
                            alt=""
                            className="w-14 h-10 object-cover rounded flex-shrink-0 bg-gray-100"
                          />
                        )}
                        <div className="min-w-0">
                          <p className="font-bold text-gray-900 line-clamp-2 leading-snug">
                            {item.title}
                          </p>
                          <div className="flex items-center space-x-2 text-[10px] text-gray-500 mt-1">
                            <span className="font-semibold text-primary">{item.source?.name}</span>
                            <span>•</span>
                            <a
                              href={item.originalUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="text-gray-400 hover:text-gray-700 hover:underline flex items-center"
                            >
                              Xem bài gốc <ExternalLink className="w-2.5 h-2.5 ml-0.5" />
                            </a>
                          </div>
                        </div>
                      </div>
                    </td>

                    <td className="py-3 px-4">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          item.processingStatus === "PUBLISHED"
                            ? "bg-purple-100 text-purple-800"
                            : item.processingStatus === "IMPORTED"
                            ? "bg-emerald-100 text-emerald-800"
                            : item.processingStatus === "DUPLICATE"
                            ? "bg-gray-200 text-gray-700"
                            : item.processingStatus === "PENDING"
                            ? "bg-amber-100 text-amber-800"
                            : "bg-red-100 text-red-800"
                        }`}
                      >
                        {item.processingStatus}
                      </span>
                    </td>

                    <td className="py-3 px-4">
                      <span className="text-[10px] font-semibold text-gray-600 bg-gray-100 px-2 py-0.5 rounded">
                        {item.permissionStatus}
                      </span>
                    </td>

                    <td className="py-3 px-4 text-gray-500 whitespace-nowrap">
                      {formatDate(item.discoveredAt)}
                    </td>

                    <td className="py-3 px-4 text-right space-x-1 whitespace-nowrap">
                      <button
                        onClick={() => setPreviewItem(item)}
                        className="inline-flex items-center px-2 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded font-semibold text-[11px] transition-colors"
                        title="Xem nội dung chi tiết & phê duyệt"
                      >
                        <Eye className="w-3.5 h-3.5 mr-1" />
                        Xem duyệt
                      </button>

                      {item.processingStatus === "PENDING" && (
                        <>
                          <button
                            onClick={() => handleAction(item.id, "APPROVE_TO_DRAFT")}
                            className="inline-flex items-center px-2 py-1 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded font-semibold text-[11px] transition-colors"
                            title="Chuyển vào bản nháp"
                          >
                            <FileEdit className="w-3 h-3 mr-1" />
                            Bản nháp
                          </button>
                          <button
                            onClick={() => handleAction(item.id, "PUBLISH")}
                            className="inline-flex items-center px-2 py-1 bg-primary text-white hover:bg-primary-hover rounded font-semibold text-[11px] transition-colors"
                            title="Xuất bản ngay"
                          >
                            <Send className="w-3 h-3 mr-1" />
                            Đăng ngay
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-12 text-center text-gray-500">
            <Inbox className="w-10 h-10 text-gray-300 mx-auto mb-2" />
            <p className="text-sm font-semibold">Hàng đợi đang trống.</p>
            <p className="text-xs text-gray-400 mt-1">Các bài viết mới khi quét sẽ xuất hiện tại đây.</p>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="p-4 border-t border-gray-200 flex items-center justify-between text-xs text-gray-500">
            <span>
              Trang <strong>{page}</strong> trên <strong>{totalPages}</strong>
            </span>
            <div className="flex items-center space-x-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
                className="p-1.5 border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-40"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage(page + 1)}
                className="p-1.5 border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-40"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* PREVIEW & APPROVE MODAL */}
      {previewItem && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-gray-100 flex flex-col">
            <div className="bg-primary p-4 text-white flex items-center justify-between sticky top-0 z-10">
              <h3 className="font-bold font-serif text-base">Xem Duyệt Bài Viết Thu Thập</h3>
              <button onClick={() => setPreviewItem(null)} className="text-white/80 hover:text-white">
                ✕
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs flex-1">
              <div>
                <span className="text-[10px] uppercase font-bold text-primary">
                  Nguồn: {previewItem.source?.name}
                </span>
                <h2 className="text-lg font-bold font-serif text-gray-900 mt-1">
                  {previewItem.title}
                </h2>
                <a
                  href={previewItem.originalUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-primary hover:underline text-[11px] flex items-center mt-1"
                >
                  {previewItem.originalUrl} <ExternalLink className="w-3 h-3 ml-1" />
                </a>
              </div>

              {previewItem.imageUrl && (
                <div className="aspect-[16/9] w-full rounded overflow-hidden bg-gray-100">
                  <img src={previewItem.imageUrl} alt="" className="w-full h-full object-cover" />
                </div>
              )}

              {previewItem.excerpt && (
                <div className="p-3 bg-gray-50 rounded border-l-4 border-primary text-gray-700 italic">
                  {previewItem.excerpt}
                </div>
              )}

              <div className="border-t border-gray-100 pt-3">
                <p className="font-bold text-gray-800 mb-1">Nội dung trích xuất:</p>
                <div
                  className="bg-gray-50 p-3 rounded max-h-48 overflow-y-auto font-mono text-[11px] text-gray-700 leading-relaxed"
                  dangerouslySetInnerHTML={{
                    __html: previewItem.extractedContent || "<p>Chưa có nội dung toàn văn.</p>",
                  }}
                />
              </div>

              {/* Category picker for approval */}
              <div className="p-3 bg-red-50/50 rounded-lg border border-red-100 space-y-2">
                <label className="block font-bold text-gray-800">
                  Chọn chuyên mục xuất bản vào MTK NEWS:
                </label>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full bg-white border border-gray-300 rounded p-2 text-xs font-semibold focus:border-primary focus:outline-none"
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Action buttons footer */}
            <div className="p-4 border-t border-gray-200 bg-gray-50 flex items-center justify-between sticky bottom-0">
              <div className="space-x-2">
                <button
                  type="button"
                  disabled={actionLoading}
                  onClick={() => handleAction(previewItem.id, "MARK_DUPLICATE")}
                  className="px-3 py-1.5 bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold rounded text-xs"
                >
                  Đánh dấu trùng
                </button>
                <button
                  type="button"
                  disabled={actionLoading}
                  onClick={() => handleAction(previewItem.id, "IGNORE")}
                  className="px-3 py-1.5 bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold rounded text-xs"
                >
                  Bỏ qua
                </button>
              </div>

              <div className="space-x-2">
                <button
                  type="button"
                  disabled={actionLoading}
                  onClick={() => handleAction(previewItem.id, "APPROVE_TO_DRAFT")}
                  className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded text-xs shadow-2xs"
                >
                  Chuyển vào Bản Nháp
                </button>
                <button
                  type="button"
                  disabled={actionLoading}
                  onClick={() => handleAction(previewItem.id, "PUBLISH")}
                  className="px-4 py-1.5 bg-primary hover:bg-primary-hover text-white font-semibold rounded text-xs shadow-2xs"
                >
                  {actionLoading ? "Đang xử lý..." : "Xuất Bản Ngay"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
