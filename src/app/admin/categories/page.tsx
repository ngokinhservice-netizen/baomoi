"use client";

import React, { useState, useEffect } from "react";
import {
  FolderTree,
  PlusCircle,
  Edit,
  Trash2,
  Check,
  AlertCircle,
  Loader2,
  FileText,
  Rss,
} from "lucide-react";
import { slugify } from "@/lib/utils";

interface CategoryItem {
  id: string;
  name: string;
  slug: string;
  description?: string;
  sortOrder: number;
  isActive: boolean;
  _count: { articles: number; sources: number };
}

export default function AdminCategoriesPage() {
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [sortOrder, setSortOrder] = useState(0);
  const [isActive, setIsActive] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const fetchCategories = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/categories");
      if (res.ok) {
        const data = await res.json();
        setCategories(data.categories || []);
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

  const openAddModal = () => {
    setEditingId(null);
    setName("");
    setSlug("");
    setDescription("");
    setSortOrder(categories.length + 1);
    setIsActive(true);
    setError("");
    setShowModal(true);
  };

  const openEditModal = (cat: CategoryItem) => {
    setEditingId(cat.id);
    setName(cat.name);
    setSlug(cat.slug);
    setDescription(cat.description || "");
    setSortOrder(cat.sortOrder);
    setIsActive(cat.isActive);
    setError("");
    setShowModal(true);
  };

  const handleNameChange = (val: string) => {
    setName(val);
    if (!editingId) {
      setSlug(slugify(val));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setSaving(true);
    setError("");

    try {
      const url = editingId ? `/api/admin/categories/${editingId}` : "/api/admin/categories";
      const method = editingId ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          slug: slug.trim() || slugify(name),
          description: description.trim() || undefined,
          sortOrder: Number(sortOrder),
          isActive,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Không thể lưu danh mục.");
        return;
      }

      setShowModal(false);
      fetchCategories();
    } catch {
      setError("Lỗi kết nối máy chủ.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string, catName: string) => {
    if (!confirm(`Bạn có chắc muốn xóa chuyên mục "${catName}"?`)) return;

    try {
      const res = await fetch(`/api/admin/categories/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "Không thể xóa chuyên mục này.");
      } else {
        fetchCategories();
      }
    } catch {
      alert("Lỗi kết nối máy chủ.");
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-200">
        <div>
          <h1 className="text-2xl font-bold font-serif text-gray-900">Quản Lý Chuyên Mục</h1>
          <p className="text-xs text-gray-500 mt-1">
            Thiết lập hệ thống phân cấp, thứ tự hiển thị trên thanh menu và gán nguồn tin mặc định.
          </p>
        </div>

        <button
          onClick={openAddModal}
          className="flex items-center text-xs font-semibold px-4 py-2.5 bg-primary hover:bg-primary-hover text-white rounded-lg transition-colors shadow-2xs w-fit"
        >
          <PlusCircle className="w-4 h-4 mr-1.5" />
          Thêm chuyên mục mới
        </button>
      </div>

      {/* Categories Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-2xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center">
            <Loader2 className="w-8 h-8 text-primary animate-spin mx-auto" />
            <p className="text-xs text-gray-500 mt-2">Đang tải danh mục...</p>
          </div>
        ) : categories.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200 text-gray-600 font-bold uppercase tracking-wider">
                  <th className="py-3 px-4 w-16">Thứ tự</th>
                  <th className="py-3 px-4">Tên chuyên mục</th>
                  <th className="py-3 px-4">Đường dẫn (Slug)</th>
                  <th className="py-3 px-4">Mô tả</th>
                  <th className="py-3 px-4">Số bài viết</th>
                  <th className="py-3 px-4">Trạng thái</th>
                  <th className="py-3 px-4 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {categories.map((cat) => (
                  <tr key={cat.id} className="hover:bg-gray-50 transition-colors">
                    <td className="py-3 px-4 font-bold text-gray-400">{cat.sortOrder}</td>
                    <td className="py-3 px-4 font-bold text-gray-900">{cat.name}</td>
                    <td className="py-3 px-4 font-mono text-gray-500">{cat.slug}</td>
                    <td className="py-3 px-4 text-gray-500 max-w-xs truncate">
                      {cat.description || "—"}
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-semibold text-gray-700 bg-gray-100 px-2 py-0.5 rounded">
                        {cat._count.articles} bài
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                          cat.isActive
                            ? "bg-emerald-100 text-emerald-800"
                            : "bg-gray-200 text-gray-600"
                        }`}
                      >
                        {cat.isActive ? "Hiển thị" : "Ẩn"}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right space-x-2 whitespace-nowrap">
                      <button
                        onClick={() => openEditModal(cat)}
                        className="p-1 text-gray-500 hover:text-primary transition-colors"
                        title="Chỉnh sửa"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(cat.id, cat.name)}
                        className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                        title="Xóa chuyên mục"
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
            <FolderTree className="w-10 h-10 text-gray-300 mx-auto mb-2" />
            <p className="text-sm font-semibold">Chưa có chuyên mục nào.</p>
          </div>
        )}
      </div>

      {/* MODAL: ADD / EDIT CATEGORY */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full overflow-hidden border border-gray-100">
            <div className="bg-primary p-4 text-white flex items-center justify-between">
              <h3 className="font-bold font-serif text-base">
                {editingId ? "Chỉnh Sửa Chuyên Mục" : "Thêm Chuyên Mục Mới"}
              </h3>
              <button onClick={() => setShowModal(false)} className="text-white/80 hover:text-white">
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-3.5 text-xs">
              {error && (
                <div className="p-2.5 bg-red-50 text-red-700 rounded border border-red-200">
                  {error}
                </div>
              )}

              <div>
                <label className="block font-bold text-gray-700 uppercase mb-1">
                  Tên chuyên mục <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  placeholder="Ví dụ: Thời sự"
                  className="w-full bg-gray-50 border border-gray-300 rounded-lg p-2.5 focus:bg-white focus:border-primary focus:outline-none font-bold"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-700 uppercase mb-1">
                  Đường dẫn (Slug)
                </label>
                <input
                  type="text"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  placeholder="thoi-su"
                  className="w-full font-mono bg-gray-50 border border-gray-300 rounded-lg p-2 focus:bg-white focus:border-primary focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-700 uppercase mb-1">
                  Mô tả ngắn
                </label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Mô tả mục tiêu và nội dung của chuyên mục..."
                  className="w-full bg-gray-50 border border-gray-300 rounded-lg p-2 focus:bg-white focus:border-primary focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-700 uppercase mb-1">
                  Thứ tự sắp xếp
                </label>
                <input
                  type="number"
                  value={sortOrder}
                  onChange={(e) => setSortOrder(Number(e.target.value))}
                  className="w-full bg-gray-50 border border-gray-300 rounded-lg p-2 focus:bg-white focus:border-primary focus:outline-none"
                />
              </div>

              <div className="flex items-center space-x-2 pt-1">
                <input
                  type="checkbox"
                  id="catActive"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="rounded text-primary focus:ring-primary w-4 h-4"
                />
                <label htmlFor="catActive" className="font-semibold text-gray-800 cursor-pointer">
                  Kích hoạt hiển thị trên menu chính
                </label>
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
                  disabled={saving}
                  className="px-5 py-2 bg-primary hover:bg-primary-hover text-white rounded-lg font-semibold shadow disabled:opacity-50"
                >
                  {saving ? "Đang lưu..." : "Lưu chuyên mục"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
