"use client";

import React, { useState, useEffect } from "react";
import {
  Image as ImageIcon,
  Upload,
  Copy,
  Check,
  Trash2,
  ExternalLink,
  Loader2,
  FileImage,
} from "lucide-react";
import { formatDate } from "@/lib/utils";

interface MediaItem {
  id: string;
  storageUrl: string;
  originalUrl?: string;
  mimeType: string;
  fileSize: number;
  caption?: string;
  sourceName?: string;
  createdAt: string;
}

export default function AdminMediaPage() {
  const [mediaList, setMediaList] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const fetchMedia = async () => {
    setLoading(true);
    try {
      // In this endpoint or direct fetch
      const res = await fetch("/api/admin/stats");
      // Let's create an endpoint or fetch via a direct query route
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/media/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (res.ok) {
        setMediaList((prev) => [data.media, ...prev]);
      } else {
        alert(data.error || "Tải ảnh lên thất bại.");
      }
    } catch {
      alert("Lỗi khi kết nối đến máy chủ.");
    } finally {
      setUploading(false);
    }
  };

  const handleCopy = (url: string, id: string) => {
    navigator.clipboard.writeText(url);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-200">
        <div>
          <h1 className="text-2xl font-bold font-serif text-gray-900">Thư Viện Ảnh (Media Library)</h1>
          <p className="text-xs text-gray-500 mt-1">
            Quản lý tài nguyên hình ảnh bài viết. Hỗ trợ JPG, PNG, WEBP tối đa 5MB (Lưu trữ URL an toàn, không lưu Base64).
          </p>
        </div>

        <label className="flex items-center text-xs font-semibold px-4 py-2.5 bg-primary hover:bg-primary-hover text-white rounded-lg transition-colors shadow-2xs cursor-pointer w-fit">
          {uploading ? (
            <Loader2 className="w-4 h-4 animate-spin mr-1.5" />
          ) : (
            <Upload className="w-4 h-4 mr-1.5" />
          )}
          {uploading ? "Đang tải ảnh..." : "Tải ảnh mới lên"}
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            onChange={handleUpload}
            disabled={uploading}
            className="hidden"
          />
        </label>
      </div>

      {/* Upload Dropzone */}
      <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center bg-gray-50 hover:bg-gray-100/60 transition-colors">
        <FileImage className="w-10 h-10 text-gray-400 mx-auto mb-2" />
        <p className="text-sm font-bold text-gray-700">Kéo thả tệp hình ảnh vào đây</p>
        <p className="text-xs text-gray-400 mt-1">hoặc nhấn nút &ldquo;Tải ảnh mới lên&rdquo; ở góc trên</p>
      </div>

      {/* Gallery Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
        {mediaList.map((media) => (
          <div
            key={media.id}
            className="bg-white rounded-lg border border-gray-200 overflow-hidden shadow-2xs group flex flex-col justify-between"
          >
            <div className="aspect-square bg-gray-100 overflow-hidden relative">
              <img
                src={media.storageUrl}
                alt={media.caption || ""}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform"
              />
            </div>
            <div className="p-2 text-[11px] bg-white border-t border-gray-100 flex items-center justify-between">
              <span className="truncate max-w-[100px] text-gray-600 font-medium">
                {media.originalUrl || "Ảnh tải lên"}
              </span>
              <button
                onClick={() => handleCopy(media.storageUrl, media.id)}
                className="p-1 hover:text-primary transition-colors"
                title="Sao chép đường dẫn ảnh"
              >
                {copiedId === media.id ? (
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
