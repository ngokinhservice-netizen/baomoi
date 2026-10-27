"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Save,
  Send,
  Eye,
  Sparkles,
  Upload,
  Image as ImageIcon,
  Check,
  AlertCircle,
  Loader2,
  Trash2,
  Link as LinkIcon,
  HelpCircle,
} from "lucide-react";
import { slugify } from "@/lib/utils";

interface CategoryOption {
  id: string;
  name: string;
}

interface ArticleFormProps {
  initialData?: any;
  isEdit?: boolean;
}

export default function ArticleForm({ initialData, isEdit = false }: ArticleFormProps) {
  const router = useRouter();

  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [title, setTitle] = useState(initialData?.title || "");
  const [subtitle, setSubtitle] = useState(initialData?.subtitle || "");
  const [slug, setSlug] = useState(initialData?.slug || "");
  const [excerpt, setExcerpt] = useState(initialData?.excerpt || "");
  const [content, setContent] = useState(initialData?.content || "");
  const [categoryId, setCategoryId] = useState(initialData?.categoryId || "");
  const [featuredImage, setFeaturedImage] = useState(initialData?.featuredImage || "");
  const [imageCaption, setImageCaption] = useState(initialData?.imageCaption || "");
  const [imageSource, setImageSource] = useState(initialData?.imageSource || "");
  const [status, setStatus] = useState(initialData?.status || "DRAFT");
  const [isFeatured, setIsFeatured] = useState(Boolean(initialData?.isFeatured));
  const [seoTitle, setSeoTitle] = useState(initialData?.seoTitle || "");
  const [seoDescription, setSeoDescription] = useState(initialData?.seoDescription || "");

  const [submitting, setSubmitting] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState<any>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [autoSavedTime, setAutoSavedTime] = useState("");

  // Auto-slug on title change if slug is not manually altered
  useEffect(() => {
    if (!isEdit && title && !slug) {
      setSlug(slugify(title));
    }
  }, [title, isEdit, slug]);

  // Load categories
  useEffect(() => {
    async function loadCategories() {
      try {
        const res = await fetch("/api/admin/categories");
        if (res.ok) {
          const data = await res.json();
          setCategories(data.categories || []);
          if (!categoryId && data.categories?.length > 0) {
            setCategoryId(data.categories[0].id);
          }
        }
      } catch {
        // ignore
      }
    }
    loadCategories();
  }, []);

  // Auto-save draft to localStorage every 30s
  useEffect(() => {
    if (isEdit) return; // Only auto-save local draft for new articles
    const timer = setInterval(() => {
      if (title || content) {
        localStorage.setItem(
          "mtk_article_draft",
          JSON.stringify({ title, subtitle, excerpt, content, categoryId, featuredImage })
        );
        setAutoSavedTime(new Date().toLocaleTimeString("vi-VN"));
      }
    }, 20000);

    return () => clearInterval(timer);
  }, [title, subtitle, excerpt, content, categoryId, featuredImage, isEdit]);

  // Restore draft if available
  useEffect(() => {
    if (!isEdit && !title && !content) {
      const saved = localStorage.getItem("mtk_article_draft");
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (parsed.title || parsed.content) {
            if (confirm("Tìm thấy bản nháp đã lưu tự động trước đó. Bạn có muốn khôi phục không?")) {
              setTitle(parsed.title || "");
              setSubtitle(parsed.subtitle || "");
              setExcerpt(parsed.excerpt || "");
              setContent(parsed.content || "");
              if (parsed.categoryId) setCategoryId(parsed.categoryId);
              if (parsed.featuredImage) setFeaturedImage(parsed.featuredImage);
            }
          }
        } catch {
          // ignore
        }
      }
    }
  }, []);

  // Image Upload Handler (Stores in /public/uploads/ & Media table)
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingImage(true);
    setErrorMessage("");

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("caption", imageCaption);

      const res = await fetch("/api/media/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Tải ảnh lên thất bại.");
      }

      setFeaturedImage(data.url);
    } catch (err: any) {
      setErrorMessage(err.message || "Lỗi khi tải ảnh.");
    } finally {
      setUploadingImage(false);
    }
  };

  // AI Assistant Trigger
  const handleAiAssist = async () => {
    if (!content && !title) {
      alert("Vui lòng nhập tiêu đề hoặc nội dung để AI hỗ trợ phân tích.");
      return;
    }

    setAiLoading(true);
    setErrorMessage("");

    try {
      const res = await fetch("/api/admin/ai/assist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, content, excerpt, task: "all" }),
      });

      const data = await res.json();
      if (res.ok && data.result) {
        setAiSuggestions(data.result);
      } else {
        throw new Error(data.error || "AI Assistant không phản hồi.");
      }
    } catch (err: any) {
      setErrorMessage(err.message || "Lỗi kết nối AI.");
    } finally {
      setAiLoading(false);
    }
  };

  // Submit Form
  const handleSubmit = async (submitStatus: string) => {
    if (!title.trim()) {
      setErrorMessage("Vui lòng nhập tiêu đề bài viết.");
      return;
    }
    if (!categoryId) {
      setErrorMessage("Vui lòng chọn chuyên mục.");
      return;
    }

    setSubmitting(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const payload = {
        title: title.trim(),
        subtitle: subtitle.trim() || undefined,
        slug: slug.trim() || slugify(title),
        excerpt: excerpt.trim() || undefined,
        content: content.trim(),
        featuredImage: featuredImage.trim() || undefined,
        imageCaption: imageCaption.trim() || undefined,
        imageSource: imageSource.trim() || undefined,
        categoryId,
        status: submitStatus,
        isFeatured,
        seoTitle: seoTitle.trim() || title.trim(),
        seoDescription: seoDescription.trim() || excerpt.trim(),
      };

      const url = isEdit ? `/api/admin/articles/${initialData.id}` : "/api/admin/articles";
      const method = isEdit ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Không thể lưu bài viết.");
      }

      // Clear local draft if new
      if (!isEdit) {
        localStorage.removeItem("mtk_article_draft");
      }

      setSuccessMessage(
        submitStatus === "PUBLISHED"
          ? "Đã xuất bản bài viết thành công!"
          : "Đã lưu bản nháp thành công!"
      );

      setTimeout(() => {
        router.push("/admin/articles");
        router.refresh();
      }, 1000);
    } catch (err: any) {
      setErrorMessage(err.message || "Đã xảy ra lỗi.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Messages */}
      {errorMessage && (
        <div className="p-3 bg-red-50 border border-red-200 text-xs text-red-700 rounded-lg flex items-center">
          <AlertCircle className="w-4 h-4 mr-2 text-red-600 flex-shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}
      {successMessage && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 rounded-lg flex items-center">
          <Check className="w-4 h-4 mr-2 text-emerald-600 flex-shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Top Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-200">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold font-serif text-gray-900">
            {isEdit ? "Chỉnh Sửa Bài Viết" : "Soạn Thảo Bài Viết Mới"}
          </h1>
          {autoSavedTime && (
            <p className="text-[11px] text-gray-400 mt-0.5">
              Đã tự động lưu bản nháp lúc: {autoSavedTime}
            </p>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* AI Assist button */}
          <button
            type="button"
            onClick={handleAiAssist}
            disabled={aiLoading}
            className="flex items-center text-xs font-semibold px-3 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg hover:from-purple-700 hover:to-indigo-700 shadow-2xs transition-all disabled:opacity-50"
          >
            <Sparkles className={`w-3.5 h-3.5 mr-1.5 ${aiLoading ? "animate-spin" : ""}`} />
            {aiLoading ? "AI Đang xử lý..." : "Trợ Lý AI Biên Tập"}
          </button>

          {/* Save Draft */}
          <button
            type="button"
            disabled={submitting}
            onClick={() => handleSubmit("DRAFT")}
            className="flex items-center text-xs font-semibold px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors shadow-2xs disabled:opacity-50"
          >
            <Save className="w-3.5 h-3.5 mr-1.5" />
            Lưu bản nháp
          </button>

          {/* Publish */}
          <button
            type="button"
            disabled={submitting}
            onClick={() => handleSubmit("PUBLISHED")}
            className="flex items-center text-xs font-semibold px-5 py-2 bg-primary hover:bg-primary-hover text-white rounded-lg transition-colors shadow-2xs disabled:opacity-50"
          >
            <Send className="w-3.5 h-3.5 mr-1.5" />
            {submitting ? "Đang lưu..." : "Xuất bản ngay"}
          </button>
        </div>
      </div>

      {/* AI Suggestions Drawer (If triggered) */}
      {aiSuggestions && (
        <div className="p-4 bg-purple-50 border border-purple-200 rounded-xl space-y-3">
          <div className="flex items-center justify-between border-b border-purple-200 pb-2">
            <span className="text-xs font-bold text-purple-900 flex items-center uppercase tracking-wider">
              <Sparkles className="w-4 h-4 text-purple-600 mr-1.5" />
              Kết Quả Trợ Lý AI Gợi Ý
            </span>
            <button
              onClick={() => setAiSuggestions(null)}
              className="text-xs text-purple-600 hover:underline"
            >
              Đóng
            </button>
          </div>

          {/* Suggested Titles */}
          {aiSuggestions.suggestedTitles && (
            <div>
              <p className="text-xs font-semibold text-purple-950 mb-1">Gợi ý tiêu đề tối ưu:</p>
              <div className="space-y-1">
                {aiSuggestions.suggestedTitles.map((t: string, i: number) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setTitle(t)}
                    className="block text-left text-xs bg-white p-2 rounded border border-purple-200 hover:border-purple-500 w-full transition-colors"
                  >
                    👉 {t}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Suggested Summary */}
          {aiSuggestions.summary && (
            <div>
              <p className="text-xs font-semibold text-purple-950 mb-1">Tóm tắt / Sapo đề xuất:</p>
              <div className="text-xs bg-white p-2.5 rounded border border-purple-200 flex justify-between items-start">
                <p className="flex-1">{aiSuggestions.summary}</p>
                <button
                  type="button"
                  onClick={() => setExcerpt(aiSuggestions.summary)}
                  className="ml-2 text-primary font-bold text-xs hover:underline whitespace-nowrap"
                >
                  Áp dụng
                </button>
              </div>
            </div>
          )}

          {/* SEO Suggestions */}
          {aiSuggestions.seoTitle && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
              <div className="bg-white p-2 rounded border border-purple-200">
                <span className="font-bold text-purple-900">SEO Title:</span> {aiSuggestions.seoTitle}
                <button
                  type="button"
                  onClick={() => setSeoTitle(aiSuggestions.seoTitle)}
                  className="block text-primary font-bold text-[10px] mt-1 hover:underline"
                >
                  Áp dụng
                </button>
              </div>
              <div className="bg-white p-2 rounded border border-purple-200">
                <span className="font-bold text-purple-900">SEO Desc:</span> {aiSuggestions.seoDescription}
                <button
                  type="button"
                  onClick={() => setSeoDescription(aiSuggestions.seoDescription)}
                  className="block text-primary font-bold text-[10px] mt-1 hover:underline"
                >
                  Áp dụng
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Main Form Body */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column (8 cols): Content & Main fields */}
        <div className="lg:col-span-8 space-y-5">
          {/* Title */}
          <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-2xs space-y-3">
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-1">
                Tiêu đề chính <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Nhập tiêu đề bài viết chuẩn báo chí..."
                className="w-full text-base sm:text-lg font-bold bg-gray-50 border border-gray-300 rounded-lg p-3 focus:bg-white focus:border-primary focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-1">
                Tiêu đề phụ (Subtitle)
              </label>
              <input
                type="text"
                value={subtitle}
                onChange={(e) => setSubtitle(e.target.value)}
                placeholder="Tiêu đề phụ hoặc thông điệp bổ trợ..."
                className="w-full text-xs bg-gray-50 border border-gray-300 rounded-lg p-2.5 focus:bg-white focus:border-primary focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-1">
                Tóm tắt mở đầu (Sapo)
              </label>
              <textarea
                rows={3}
                value={excerpt}
                onChange={(e) => setExcerpt(e.target.value)}
                placeholder="Đoạn văn ngắn tóm tắt nội dung trọng tâm (120 - 200 từ)..."
                className="w-full text-xs bg-gray-50 border border-gray-300 rounded-lg p-2.5 focus:bg-white focus:border-primary focus:outline-none"
              />
            </div>
          </div>

          {/* Rich Content Editor */}
          <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-2xs space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-gray-200">
              <label className="text-xs font-bold text-gray-700 uppercase tracking-wide">
                Nội dung bài viết (HTML / Trình soạn thảo) <span className="text-red-500">*</span>
              </label>
              <span className="text-[11px] text-gray-400">
                Hỗ trợ H2, H3, in đậm, in nghiêng, trích dẫn, ảnh, danh sách
              </span>
            </div>

            {/* Quick formatting toolbar */}
            <div className="flex flex-wrap gap-1 p-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs">
              <button
                type="button"
                onClick={() => setContent(content + "<h2>Tiêu đề mục con</h2>\n<p>Nội dung...</p>\n")}
                className="px-2 py-1 bg-white border border-gray-300 rounded hover:bg-gray-100 font-bold"
              >
                H2
              </button>
              <button
                type="button"
                onClick={() => setContent(content + "<h3>Tiêu đề tiểu mục</h3>\n<p>Nội dung...</p>\n")}
                className="px-2 py-1 bg-white border border-gray-300 rounded hover:bg-gray-100 font-semibold"
              >
                H3
              </button>
              <button
                type="button"
                onClick={() => setContent(content + "<p><strong>Đoạn in đậm:</strong> ...</p>\n")}
                className="px-2 py-1 bg-white border border-gray-300 rounded hover:bg-gray-100 font-bold"
              >
                In đậm
              </button>
              <button
                type="button"
                onClick={() => setContent(content + "<blockquote>Lời phát ngôn hoặc trích dẫn tiêu biểu...</blockquote>\n")}
                className="px-2 py-1 bg-white border border-gray-300 rounded hover:bg-gray-100 italic"
              >
                Trích dẫn
              </button>
              <button
                type="button"
                onClick={() => setContent(content + "<ul>\n  <li>Ý thứ nhất</li>\n  <li>Ý thứ hai</li>\n</ul>\n")}
                className="px-2 py-1 bg-white border border-gray-300 rounded hover:bg-gray-100"
              >
                Danh sách
              </button>
            </div>

            <textarea
              rows={16}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Nhập nội dung bài viết chi tiết tại đây..."
              className="w-full text-sm font-mono leading-relaxed bg-white border border-gray-300 rounded-lg p-3 focus:border-primary focus:outline-none"
            />
          </div>

          {/* SEO Meta Box */}
          <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-2xs space-y-3">
            <h3 className="text-xs font-bold text-gray-800 uppercase tracking-wide border-b border-gray-100 pb-2">
              Tối Ưu Hóa Tìm Kiếm (SEO Metadata)
            </h3>

            <div>
              <label className="block text-[11px] font-semibold text-gray-600 mb-1">
                SEO Title (Tối đa 65 ký tự)
              </label>
              <input
                type="text"
                value={seoTitle}
                onChange={(e) => setSeoTitle(e.target.value)}
                placeholder="Tiêu đề hiển thị trên Google..."
                className="w-full text-xs bg-gray-50 border border-gray-300 rounded-lg p-2.5 focus:bg-white focus:border-primary focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-gray-600 mb-1">
                SEO Description (Tối đa 160 ký tự)
              </label>
              <textarea
                rows={2}
                value={seoDescription}
                onChange={(e) => setSeoDescription(e.target.value)}
                placeholder="Đoạn trích tóm tắt hiển thị trên kết quả tìm kiếm..."
                className="w-full text-xs bg-gray-50 border border-gray-300 rounded-lg p-2.5 focus:bg-white focus:border-primary focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Right Column (4 cols): Meta settings & Media */}
        <div className="lg:col-span-4 space-y-5">
          {/* Publication Settings */}
          <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-2xs space-y-4">
            <h3 className="text-xs font-bold text-gray-800 uppercase tracking-wide border-b border-gray-100 pb-2">
              Thông Tin Xuất Bản
            </h3>

            {/* Category */}
            <div>
              <label className="block text-[11px] font-bold text-gray-700 uppercase mb-1">
                Chuyên mục <span className="text-red-500">*</span>
              </label>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="w-full text-xs bg-gray-50 border border-gray-300 rounded-lg p-2.5 focus:bg-white focus:border-primary focus:outline-none font-semibold"
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Slug */}
            <div>
              <label className="block text-[11px] font-bold text-gray-700 uppercase mb-1">
                Đường dẫn tĩnh (Slug)
              </label>
              <input
                type="text"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                placeholder="duong-dan-bai-viet"
                className="w-full text-xs font-mono bg-gray-50 border border-gray-300 rounded-lg p-2 focus:bg-white focus:border-primary focus:outline-none"
              />
            </div>

            {/* Status */}
            <div>
              <label className="block text-[11px] font-bold text-gray-700 uppercase mb-1">
                Trạng thái bài
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full text-xs bg-gray-50 border border-gray-300 rounded-lg p-2 focus:bg-white focus:border-primary focus:outline-none"
              >
                <option value="DRAFT">Bản nháp (DRAFT)</option>
                <option value="PENDING">Gửi duyệt (PENDING)</option>
                <option value="PUBLISHED">Xuất bản (PUBLISHED)</option>
                <option value="ARCHIVED">Lưu trữ (ARCHIVED)</option>
              </select>
            </div>

            {/* Featured toggle */}
            <div className="flex items-center space-x-2 pt-2 border-t border-gray-100">
              <input
                type="checkbox"
                id="isFeatured"
                checked={isFeatured}
                onChange={(e) => setIsFeatured(e.target.checked)}
                className="rounded text-primary focus:ring-primary w-4 h-4"
              />
              <label htmlFor="isFeatured" className="text-xs font-semibold text-gray-800 cursor-pointer">
                Đánh dấu là Tin Nổi Bật (Featured)
              </label>
            </div>
          </div>

          {/* Featured Image Box */}
          <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-2xs space-y-3">
            <h3 className="text-xs font-bold text-gray-800 uppercase tracking-wide border-b border-gray-100 pb-2">
              Ảnh Đại Diện (Thumbnail)
            </h3>

            {featuredImage ? (
              <div className="space-y-2">
                <div className="aspect-[16/10] w-full rounded-lg overflow-hidden bg-gray-100 relative group">
                  <img
                    src={featuredImage}
                    alt="Preview"
                    className="w-full h-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => setFeaturedImage("")}
                    className="absolute top-2 right-2 bg-red-600 text-white p-1 rounded-full shadow hover:bg-red-700 transition-colors"
                    title="Xóa ảnh"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ) : (
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:border-primary transition-colors">
                <ImageIcon className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                <p className="text-xs text-gray-600 font-medium">Chọn ảnh từ máy tính</p>
                <p className="text-[10px] text-gray-400 mt-0.5">JPG, PNG, WEBP (Tối đa 5MB)</p>
                <label className="mt-3 inline-block bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold text-xs px-3 py-1.5 rounded cursor-pointer transition-colors">
                  {uploadingImage ? "Đang tải ảnh..." : "Tải ảnh lên"}
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    onChange={handleImageUpload}
                    disabled={uploadingImage}
                    className="hidden"
                  />
                </label>
              </div>
            )}

            {/* Direct Image URL input */}
            <div>
              <label className="block text-[10px] font-semibold text-gray-500 mb-1">
                Hoặc nhập trực tiếp URL hình ảnh:
              </label>
              <input
                type="url"
                value={featuredImage}
                onChange={(e) => setFeaturedImage(e.target.value)}
                placeholder="https://example.com/image.jpg"
                className="w-full text-xs bg-gray-50 border border-gray-300 rounded p-2 focus:bg-white focus:border-primary focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-[10px] font-semibold text-gray-500 mb-1">
                Chú thích ảnh (Caption)
              </label>
              <input
                type="text"
                value={imageCaption}
                onChange={(e) => setImageCaption(e.target.value)}
                placeholder="Mô tả bối cảnh bức ảnh..."
                className="w-full text-xs bg-gray-50 border border-gray-300 rounded p-2 focus:bg-white focus:border-primary focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-[10px] font-semibold text-gray-500 mb-1">
                Nguồn ảnh (Photo credit)
              </label>
              <input
                type="text"
                value={imageSource}
                onChange={(e) => setImageSource(e.target.value)}
                placeholder="TTXVN / Reuters / Tác giả..."
                className="w-full text-xs bg-gray-50 border border-gray-300 rounded p-2 focus:bg-white focus:border-primary focus:outline-none"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
