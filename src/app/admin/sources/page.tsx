"use client";

import React, { useState, useEffect } from "react";
import {
  Rss,
  PlusCircle,
  Play,
  Activity,
  CheckCircle,
  XCircle,
  Clock,
  Trash2,
  Edit,
  ExternalLink,
  Loader2,
  AlertTriangle,
  Search,
  Sparkles,
  Layers,
} from "lucide-react";
import { formatDate } from "@/lib/utils";

interface NewsSourceItem {
  id: string;
  name: string;
  homepageUrl: string;
  feedUrl?: string;
  sitemapUrl?: string;
  pollingIntervalMinutes: number;
  scrapeMode: string;
  isActive: boolean;
  lastCheckedAt?: string;
  lastSuccessAt?: string;
  lastError?: string;
  defaultCategory?: { id: string; name: string };
  _count: { scrapedArticles: number; jobs: number };
}

interface CategoryOption {
  id: string;
  name: string;
}

export default function AdminSourcesPage() {
  const [sources, setSources] = useState<NewsSourceItem[]>([]);
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [loading, setLoading] = useState(true);

  // Add / Edit Modal state
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [modalName, setModalName] = useState("");
  const [modalHomepage, setModalHomepage] = useState("");
  const [modalFeedUrl, setModalFeedUrl] = useState("");
  const [modalSitemapUrl, setModalSitemapUrl] = useState("");
  const [modalCategory, setModalCategory] = useState("");
  const [modalInterval, setModalInterval] = useState(30);
  const [modalMode, setModalMode] = useState("EDITORIAL_QUEUE");
  const [modalSaving, setModalSaving] = useState(false);

  // Analyzer Modal state
  const [showAnalyzer, setShowAnalyzer] = useState(false);
  const [testUrl, setTestUrl] = useState("https://vnexpress.net/rss/thoi-su.rss");
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<any>(null);

  // Scanning execution state
  const [scanningId, setScanningId] = useState<string | null>(null);
  const [scanMessage, setScanMessage] = useState<{ id: string; text: string; isError?: boolean } | null>(null);

  const fetchSources = async () => {
    setLoading(true);
    try {
      const [srcRes, catRes] = await Promise.all([
        fetch("/api/admin/sources"),
        fetch("/api/admin/categories"),
      ]);

      if (srcRes.ok) {
        const data = await srcRes.json();
        setSources(data.sources || []);
      }
      if (catRes.ok) {
        const catData = await catRes.json();
        setCategories(catData.categories || []);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSources();
  }, []);

  // Run Scan Now
  const handleScanNow = async (sourceId: string) => {
    setScanningId(sourceId);
    setScanMessage(null);

    try {
      const res = await fetch(`/api/admin/sources/${sourceId}/scan`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ maxArticles: 15 }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setScanMessage({
          id: sourceId,
          text: `Đã quét xong: Phát hiện ${data.result.discoveredCount} bài, Nhập mới: ${data.result.importedCount}, Trùng: ${data.result.duplicateCount}`,
        });
        fetchSources();
      } else {
        setScanMessage({
          id: sourceId,
          text: data.error || "Quét thất bại.",
          isError: true,
        });
      }
    } catch (err: any) {
      setScanMessage({
        id: sourceId,
        text: err.message || "Lỗi kết nối.",
        isError: true,
      });
    } finally {
      setScanningId(null);
    }
  };

  // Run Compatibility Analyzer
  const handleRunAnalysis = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testUrl.trim()) return;

    setAnalyzing(true);
    setAnalysisResult(null);

    try {
      const res = await fetch("/api/admin/sources/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: testUrl.trim() }),
      });

      const data = await res.json();
      if (res.ok && data.analysis) {
        setAnalysisResult(data.analysis);
      } else {
        setAnalysisResult({ errorMessage: data.error || "Không thể phân tích website này." });
      }
    } catch (err: any) {
      setAnalysisResult({ errorMessage: err.message || "Lỗi kết nối mạng." });
    } finally {
      setAnalyzing(false);
    }
  };

  // Open Create Modal
  const openCreateModal = () => {
    setEditingId(null);
    setModalName("");
    setModalHomepage("");
    setModalFeedUrl("");
    setModalSitemapUrl("");
    setModalCategory(categories[0]?.id || "");
    setModalInterval(30);
    setModalMode("EDITORIAL_QUEUE");
    setShowModal(true);
  };

  // Save Source (Create / Update)
  const handleSaveSource = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalSaving(true);

    try {
      const payload = {
        name: modalName.trim(),
        homepageUrl: modalHomepage.trim(),
        feedUrl: modalFeedUrl.trim() || undefined,
        sitemapUrl: modalSitemapUrl.trim() || undefined,
        defaultCategoryId: modalCategory || undefined,
        pollingIntervalMinutes: Number(modalInterval),
        scrapeMode: modalMode,
      };

      const url = editingId ? `/api/admin/sources/${editingId}` : "/api/admin/sources";
      const method = editingId ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "Không thể lưu nguồn tin.");
        return;
      }

      setShowModal(false);
      fetchSources();
    } catch {
      alert("Lỗi khi kết nối đến máy chủ.");
    } finally {
      setModalSaving(false);
    }
  };

  const handleDeleteSource = async (id: string, name: string) => {
    if (!confirm(`Bạn có chắc chắn muốn xóa nguồn tin "${name}"? Toàn bộ lịch sử quét sẽ bị xóa.`)) return;

    try {
      const res = await fetch(`/api/admin/sources/${id}`, { method: "DELETE" });
      if (res.ok) {
        fetchSources();
      } else {
        alert("Xóa không thành công.");
      }
    } catch {
      alert("Lỗi kết nối máy chủ.");
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-200">
        <div>
          <h1 className="text-2xl font-bold font-serif text-gray-900">
            Quản Lý Nguồn Tin Tự Động (Auto Scraper)
          </h1>
          <p className="text-xs text-gray-500 mt-1">
            Cấu hình thu thập đa phương thức (RSS/Atom, Sitemap XML, HTML DOM) với bộ đệm chống SSRF.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          {/* Analyze Tool Button */}
          <button
            onClick={() => setShowAnalyzer(true)}
            className="flex items-center text-xs font-semibold px-3 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all shadow-2xs"
          >
            <Activity className="w-3.5 h-3.5 mr-1.5" />
            Kiểm tra URL tương thích
          </button>

          {/* Add Source Button */}
          <button
            onClick={openCreateModal}
            className="flex items-center text-xs font-semibold px-3.5 py-2 bg-primary hover:bg-primary-hover text-white rounded-lg transition-colors shadow-2xs"
          >
            <PlusCircle className="w-4 h-4 mr-1.5" />
            Thêm nguồn tin mới
          </button>
        </div>
      </div>

      {/* Sources List */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-2xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center">
            <Loader2 className="w-8 h-8 text-primary animate-spin mx-auto" />
            <p className="text-xs text-gray-500 mt-2">Đang tải danh sách nguồn tin...</p>
          </div>
        ) : sources.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200 text-gray-600 font-bold uppercase tracking-wider">
                  <th className="py-3 px-4">Tên nguồn tin</th>
                  <th className="py-3 px-4">Phương thức & URL</th>
                  <th className="py-3 px-4">Chế độ xử lý</th>
                  <th className="py-3 px-4">Chu kỳ</th>
                  <th className="py-3 px-4">Lần quét gần nhất</th>
                  <th className="py-3 px-4 text-right">Hành động</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {sources.map((src) => (
                  <tr key={src.id} className="hover:bg-gray-50 transition-colors">
                    <td className="py-3 px-4">
                      <div className="font-bold text-gray-900">{src.name}</div>
                      <div className="text-[11px] text-gray-500 mt-0.5">
                        Mục mặc định: <strong>{src.defaultCategory?.name || "Chưa gắn"}</strong>
                      </div>
                      <div className="text-[10px] text-gray-400 mt-0.5">
                        Đã quét: {src._count.scrapedArticles} bài • {src._count.jobs} lần chạy
                      </div>
                    </td>

                    <td className="py-3 px-4 max-w-xs">
                      {src.feedUrl ? (
                        <div className="flex items-center space-x-1 text-primary font-medium truncate">
                          <Rss className="w-3.5 h-3.5 flex-shrink-0" />
                          <span className="truncate">{src.feedUrl}</span>
                        </div>
                      ) : src.sitemapUrl ? (
                        <div className="text-blue-600 font-medium truncate">
                          Sitemap: {src.sitemapUrl}
                        </div>
                      ) : (
                        <div className="text-gray-600 font-medium truncate">
                          HTML: {src.homepageUrl}
                        </div>
                      )}
                      <a
                        href={src.homepageUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[10px] text-gray-400 hover:underline flex items-center mt-0.5"
                      >
                        Trang chủ <ExternalLink className="w-2.5 h-2.5 ml-0.5" />
                      </a>
                    </td>

                    <td className="py-3 px-4">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                          src.scrapeMode === "AUTO_PUBLISH"
                            ? "bg-purple-100 text-purple-800"
                            : src.scrapeMode === "CITATION"
                            ? "bg-blue-100 text-blue-800"
                            : "bg-amber-100 text-amber-800"
                        }`}
                      >
                        {src.scrapeMode === "AUTO_PUBLISH"
                          ? "Tự xuất bản (Mode C)"
                          : src.scrapeMode === "CITATION"
                          ? "Dẫn nguồn (Mode A)"
                          : "Hàng đợi duyệt (Mode B)"}
                      </span>
                    </td>

                    <td className="py-3 px-4 font-semibold text-gray-700">
                      {src.pollingIntervalMinutes} phút
                    </td>

                    <td className="py-3 px-4">
                      {src.lastCheckedAt ? (
                        <div>
                          <p className="text-gray-700 font-medium">
                            {formatDate(src.lastCheckedAt)}
                          </p>
                          {src.lastError ? (
                            <span className="text-[10px] text-red-600 font-semibold block truncate max-w-xs">
                              Lỗi: {src.lastError}
                            </span>
                          ) : (
                            <span className="text-[10px] text-emerald-600 font-semibold block">
                              Thành công
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-gray-400 italic">Chưa quét</span>
                      )}

                      {/* Live scan feedback inline */}
                      {scanMessage && scanMessage.id === src.id && (
                        <div
                          className={`mt-1 text-[11px] p-1 rounded font-medium ${
                            scanMessage.isError
                              ? "bg-red-50 text-red-700"
                              : "bg-emerald-50 text-emerald-800"
                          }`}
                        >
                          {scanMessage.text}
                        </div>
                      )}
                    </td>

                    <td className="py-3 px-4 text-right space-x-2 whitespace-nowrap">
                      {/* Scan Now button */}
                      <button
                        onClick={() => handleScanNow(src.id)}
                        disabled={scanningId === src.id}
                        className="inline-flex items-center px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[11px] font-bold transition-colors disabled:opacity-50"
                        title="Quét nguồn tin ngay bây giờ"
                      >
                        {scanningId === src.id ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" />
                        ) : (
                          <Play className="w-3 h-3 mr-1 fill-current" />
                        )}
                        {scanningId === src.id ? "Đang quét..." : "Quét ngay"}
                      </button>

                      <button
                        onClick={() => handleDeleteSource(src.id, src.name)}
                        className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                        title="Xóa nguồn tin"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-12 text-center text-gray-500">
            <Rss className="w-10 h-10 text-gray-300 mx-auto mb-2" />
            <p className="text-sm font-semibold">Chưa có nguồn tin nào được cấu hình.</p>
            <p className="text-xs text-gray-400 mt-1">Nhấn &ldquo;Thêm nguồn tin mới&rdquo; để thiết lập bộ thu thập tự động.</p>
          </div>
        )}
      </div>

      {/* MODAL: ADD / EDIT SOURCE */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full overflow-hidden border border-gray-100">
            <div className="bg-primary p-4 text-white flex items-center justify-between">
              <h3 className="font-bold font-serif text-base">Thêm Nguồn Tin Mới</h3>
              <button onClick={() => setShowModal(false)} className="text-white/80 hover:text-white">
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveSource} className="p-5 space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-gray-700 uppercase mb-1">
                  Tên nguồn tin <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={modalName}
                  onChange={(e) => setModalName(e.target.value)}
                  placeholder="Ví dụ: VnExpress Thời sự"
                  className="w-full bg-gray-50 border border-gray-300 rounded-lg p-2.5 focus:bg-white focus:border-primary focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-700 uppercase mb-1">
                  URL Trang chủ <span className="text-red-500">*</span>
                </label>
                <input
                  type="url"
                  required
                  value={modalHomepage}
                  onChange={(e) => setModalHomepage(e.target.value)}
                  placeholder="https://vnexpress.net"
                  className="w-full bg-gray-50 border border-gray-300 rounded-lg p-2.5 focus:bg-white focus:border-primary focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-700 uppercase mb-1">
                  URL RSS / Atom Feed (Khuyên dùng)
                </label>
                <input
                  type="url"
                  value={modalFeedUrl}
                  onChange={(e) => setModalFeedUrl(e.target.value)}
                  placeholder="https://vnexpress.net/rss/thoi-su.rss"
                  className="w-full bg-gray-50 border border-gray-300 rounded-lg p-2.5 focus:bg-white focus:border-primary focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-gray-700 uppercase mb-1">
                    Chuyên mục mặc định
                  </label>
                  <select
                    value={modalCategory}
                    onChange={(e) => setModalCategory(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-300 rounded-lg p-2 focus:bg-white focus:border-primary focus:outline-none"
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-gray-700 uppercase mb-1">
                    Chu kỳ quét (Phút)
                  </label>
                  <select
                    value={modalInterval}
                    onChange={(e) => setModalInterval(Number(e.target.value))}
                    className="w-full bg-gray-50 border border-gray-300 rounded-lg p-2 focus:bg-white focus:border-primary focus:outline-none"
                  >
                    <option value={5}>5 phút (Cấp tốc)</option>
                    <option value={15}>15 phút</option>
                    <option value={30}>30 phút (Chuẩn)</option>
                    <option value={60}>60 phút</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-gray-700 uppercase mb-1">
                  Chế độ xử lý bài viết
                </label>
                <select
                  value={modalMode}
                  onChange={(e) => setModalMode(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-300 rounded-lg p-2 focus:bg-white focus:border-primary focus:outline-none font-semibold text-gray-800"
                >
                  <option value="EDITORIAL_QUEUE">
                    Chế độ B: Hàng đợi biên tập (Khuyên dùng - Kiểm duyệt trước khi đăng)
                  </option>
                  <option value="CITATION">
                    Chế độ A: Dẫn nguồn trực tiếp (Tiêu đề, trích đoạn, link gốc)
                  </option>
                  <option value="AUTO_PUBLISH">
                    Chế độ C: Tự động xuất bản (Khi đã được cấp phép đầy đủ)
                  </option>
                </select>
              </div>

              <div className="pt-3 border-t border-gray-200 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-semibold"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={modalSaving}
                  className="px-5 py-2 bg-primary hover:bg-primary-hover text-white rounded-lg font-semibold shadow disabled:opacity-50"
                >
                  {modalSaving ? "Đang lưu..." : "Lưu nguồn tin"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: SOURCE COMPATIBILITY ANALYZER (Section 6.9) */}
      {showAnalyzer && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-gray-100">
            <div className="bg-gradient-to-r from-blue-700 to-indigo-800 p-4 text-white flex items-center justify-between sticky top-0 z-10">
              <div className="flex items-center space-x-2">
                <Activity className="w-5 h-5 text-white" />
                <h3 className="font-bold font-serif text-base">Trình Phân Tích Khả Năng Tương Thích URL</h3>
              </div>
              <button onClick={() => setShowAnalyzer(false)} className="text-white/80 hover:text-white">
                ✕
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              <p className="text-gray-600">
                Nhập bất kỳ URL website nào để kiểm tra khả năng truy cập, tự động phát hiện RSS Feed, Sitemap XML, cấu trúc HTML và kiểm tra an toàn SSRF mà không cần API key.
              </p>

              <form onSubmit={handleRunAnalysis} className="flex gap-2">
                <input
                  type="url"
                  required
                  value={testUrl}
                  onChange={(e) => setTestUrl(e.target.value)}
                  placeholder="https://vnexpress.net/rss/thoi-su.rss"
                  className="flex-1 bg-gray-50 border border-gray-300 rounded-lg px-3 py-2 focus:bg-white focus:border-blue-600 focus:outline-none"
                />
                <button
                  type="submit"
                  disabled={analyzing}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg shadow transition-colors flex items-center disabled:opacity-50 whitespace-nowrap"
                >
                  {analyzing ? <Loader2 className="w-4 h-4 animate-spin mr-1.5" /> : <Search className="w-4 h-4 mr-1.5" />}
                  {analyzing ? "Đang phân tích..." : "Kiểm tra ngay"}
                </button>
              </form>

              {/* Analysis Result */}
              {analysisResult && (
                <div className="mt-4 p-4 bg-gray-50 border border-gray-200 rounded-xl space-y-3">
                  <div className="flex items-center justify-between border-b border-gray-200 pb-2">
                    <span className="font-bold text-gray-800">Kết Quả Đánh Giá:</span>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        analysisResult.isAccessible
                          ? "bg-emerald-100 text-emerald-800"
                          : "bg-red-100 text-red-800"
                      }`}
                    >
                      {analysisResult.isAccessible ? "Có thể truy cập" : "Không thể truy cập"}
                    </span>
                  </div>

                  {analysisResult.errorMessage ? (
                    <div className="p-3 bg-red-50 text-red-700 rounded border border-red-200">
                      {analysisResult.errorMessage}
                    </div>
                  ) : (
                    <>
                      <div className="grid grid-cols-2 gap-2 text-[11px]">
                        <div className="p-2 bg-white rounded border">
                          <span className="text-gray-500">Phương thức phát hiện:</span>{" "}
                          <strong className="text-blue-700">{analysisResult.detectedType}</strong>
                        </div>
                        <div className="p-2 bg-white rounded border">
                          <span className="text-gray-500">An toàn SSRF:</span>{" "}
                          <strong className="text-emerald-700">Đã kiểm tra an toàn</strong>
                        </div>
                        <div className="p-2 bg-white rounded border">
                          <span className="text-gray-500">Số bài phát hiện:</span>{" "}
                          <strong>{analysisResult.articlesFound} bài</strong>
                        </div>
                        <div className="p-2 bg-white rounded border">
                          <span className="text-gray-500">Yêu cầu JavaScript:</span>{" "}
                          <strong>{analysisResult.requiresJs ? "Có" : "Không"}</strong>
                        </div>
                      </div>

                      {/* Recommendations */}
                      {analysisResult.recommendations?.length > 0 && (
                        <div>
                          <p className="font-bold text-gray-800 mb-1">Khuyến nghị cấu hình:</p>
                          <ul className="list-disc list-inside space-y-1 text-gray-600 bg-white p-2.5 rounded border">
                            {analysisResult.recommendations.map((rec: string, idx: number) => (
                              <li key={idx}>{rec}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Sample Articles */}
                      {analysisResult.sampleArticles?.length > 0 && (
                        <div>
                          <p className="font-bold text-gray-800 mb-1">Bài viết mẫu trích xuất được:</p>
                          <div className="space-y-1 bg-white p-2.5 rounded border max-h-36 overflow-y-auto">
                            {analysisResult.sampleArticles.map((s: any, idx: number) => (
                              <div key={idx} className="truncate text-[11px] text-gray-700">
                                • {s.title}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
