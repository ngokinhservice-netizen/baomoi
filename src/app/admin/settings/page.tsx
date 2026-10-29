"use client";

import React, { useState, useEffect } from "react";
import { Settings, Save, Check, Loader2, Sparkles, Shield, Globe } from "lucide-react";

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<Record<string, string>>({
    siteName: "NHỊP SỐNG 247",
    siteDescription: "Báo điện tử tin tức & nhịp đập thời sự 24/7 hàng đầu Việt Nam và Quốc tế",
    contactEmail: "toasoan@nhipsong247.vn",
    footerText: "© 2026 NHỊP SỐNG 247. Báo điện tử tin tức & nhịp đập 24/7.",
    articlesPerPage: "12",
    enableAiAssistant: "true",
    defaultScrapeMode: "EDITORIAL_QUEUE",
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    async function loadSettings() {
      try {
        const res = await fetch("/api/admin/settings");
        if (res.ok) {
          const data = await res.json();
          if (data.settings) {
            setSettings((prev) => ({ ...prev, ...data.settings }));
          }
        }
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    }
    loadSettings();
  }, []);

  const handleChange = (key: string, value: string) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
    setSaved(false);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const res = await fetch("/api/admin/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });

      if (res.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      } else {
        alert("Không thể lưu cài đặt.");
      }
    } catch {
      alert("Lỗi kết nối máy chủ.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-12 text-center">
        <Loader2 className="w-8 h-8 text-primary animate-spin mx-auto" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between pb-4 border-b border-gray-200">
        <div>
          <h1 className="text-2xl font-bold font-serif text-gray-900">Cấu Hình Website & Tòa Soạn</h1>
          <p className="text-xs text-gray-500 mt-1">
            Quản trị các tham số hệ thống, nhận diện thương hiệu và chính sách thu thập dữ liệu.
          </p>
        </div>

        {saved && (
          <span className="flex items-center text-xs font-semibold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-200">
            <Check className="w-4 h-4 mr-1 text-emerald-600" />
            Đã lưu thay đổi thành công
          </span>
        )}
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* 1. General Settings */}
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-2xs space-y-4">
          <h2 className="text-sm font-bold text-gray-900 flex items-center pb-2 border-b border-gray-100 uppercase tracking-wide">
            <Globe className="w-4 h-4 text-primary mr-2" />
            Thông Tin Chung & Thương Hiệu
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block font-bold text-gray-700 uppercase mb-1">
                Tên báo điện tử
              </label>
              <input
                type="text"
                value={settings.siteName || ""}
                onChange={(e) => handleChange("siteName", e.target.value)}
                className="w-full bg-gray-50 border border-gray-300 rounded-lg p-2.5 focus:bg-white focus:border-primary focus:outline-none font-bold"
              />
            </div>

            <div>
              <label className="block font-bold text-gray-700 uppercase mb-1">
                Hòm thư tòa soạn (Email)
              </label>
              <input
                type="email"
                value={settings.contactEmail || ""}
                onChange={(e) => handleChange("contactEmail", e.target.value)}
                className="w-full bg-gray-50 border border-gray-300 rounded-lg p-2.5 focus:bg-white focus:border-primary focus:outline-none"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block font-bold text-gray-700 uppercase mb-1">
                Mô tả website (SEO mặc định)
              </label>
              <input
                type="text"
                value={settings.siteDescription || ""}
                onChange={(e) => handleChange("siteDescription", e.target.value)}
                className="w-full bg-gray-50 border border-gray-300 rounded-lg p-2.5 focus:bg-white focus:border-primary focus:outline-none"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block font-bold text-gray-700 uppercase mb-1">
                Nội dung chân trang (Footer Copyright)
              </label>
              <input
                type="text"
                value={settings.footerText || ""}
                onChange={(e) => handleChange("footerText", e.target.value)}
                className="w-full bg-gray-50 border border-gray-300 rounded-lg p-2.5 focus:bg-white focus:border-primary focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* 2. Scraper & Ingestion Settings */}
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-2xs space-y-4">
          <h2 className="text-sm font-bold text-gray-900 flex items-center pb-2 border-b border-gray-100 uppercase tracking-wide">
            <Shield className="w-4 h-4 text-emerald-600 mr-2" />
            Cấu Hình Quy Trình Thu Thập Tin Bài
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block font-bold text-gray-700 uppercase mb-1">
                Chế độ xử lý bài mặc định
              </label>
              <select
                value={settings.defaultScrapeMode || "EDITORIAL_QUEUE"}
                onChange={(e) => handleChange("defaultScrapeMode", e.target.value)}
                className="w-full bg-gray-50 border border-gray-300 rounded-lg p-2.5 focus:bg-white focus:border-primary focus:outline-none font-semibold"
              >
                <option value="EDITORIAL_QUEUE">Chế độ B: Nhập vào hàng đợi biên tập (Khuyên dùng)</option>
                <option value="CITATION">Chế độ A: Dẫn nguồn trực tiếp</option>
                <option value="AUTO_PUBLISH">Chế độ C: Tự động xuất bản (Chỉ khi đã cấp phép)</option>
              </select>
            </div>

            <div>
              <label className="block font-bold text-gray-700 uppercase mb-1">
                Số bài hiển thị mỗi trang (Phân trang)
              </label>
              <input
                type="number"
                value={settings.articlesPerPage || "12"}
                onChange={(e) => handleChange("articlesPerPage", e.target.value)}
                className="w-full bg-gray-50 border border-gray-300 rounded-lg p-2.5 focus:bg-white focus:border-primary focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* 3. AI Assistant Settings */}
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-2xs space-y-4">
          <h2 className="text-sm font-bold text-gray-900 flex items-center pb-2 border-b border-gray-100 uppercase tracking-wide">
            <Sparkles className="w-4 h-4 text-purple-600 mr-2" />
            Trợ Lý Trí Tuệ Nhân Tạo (AI Editorial Assistant)
          </h2>

          <div className="text-xs space-y-3">
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="enableAi"
                checked={settings.enableAiAssistant === "true"}
                onChange={(e) =>
                  handleChange("enableAiAssistant", e.target.checked ? "true" : "false")
                }
                className="rounded text-primary focus:ring-primary w-4 h-4"
              />
              <label htmlFor="enableAi" className="font-semibold text-gray-800 cursor-pointer">
                Bật mô-đun AI hỗ trợ biên tập viên trong giao diện viết bài
              </label>
            </div>
            <p className="text-[11px] text-gray-500">
              Hệ thống tự động sử dụng Gemini API nếu có cấu hình <code>GEMINI_API_KEY</code> trong <code>.env</code>, hoặc kích hoạt mô hình heuristic phân tích ngữ nghĩa nội bộ hoàn toàn miễn phí.
            </p>
          </div>
        </div>

        {/* Submit */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="flex items-center text-xs font-semibold px-6 py-2.5 bg-primary hover:bg-primary-hover text-white rounded-lg transition-colors shadow disabled:opacity-50"
          >
            {saving ? (
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
            ) : (
              <Save className="w-4 h-4 mr-2" />
            )}
            {saving ? "Đang lưu..." : "Lưu toàn bộ cài đặt"}
          </button>
        </div>
      </form>
    </div>
  );
}
