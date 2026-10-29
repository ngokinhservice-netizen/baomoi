import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import slugifyLib from "slugify";
import { format, formatDistanceToNow } from "date-fns";
import { vi } from "date-fns/locale";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function slugify(text: string): string {
  return slugifyLib(text, {
    lower: true,
    strict: true,
    locale: "vi",
    trim: true,
  });
}

export function formatDate(date: Date | string | number | null | undefined): string {
  if (!date) return "";
  const d = new Date(date);
  if (isNaN(d.getTime())) return "";
  const parts = new Intl.DateTimeFormat("vi-VN", {
    timeZone: "Asia/Ho_Chi_Minh",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(d);
  const getPart = (type: string) => parts.find((p) => p.type === type)?.value || "";
  return `${getPart("day")}/${getPart("month")}/${getPart("year")} ${getPart("hour")}:${getPart("minute")}`;
}

/**
 * Định dạng ngày giờ chi tiết chuẩn theo phong cách VnExpress (Múi giờ Việt Nam GMT+7):
 * Ví dụ: "Thứ năm, 29/10/2026, 18:19 (GMT+7)"
 */
export function formatArticleDate(date: Date | string | number | null | undefined): string {
  if (!date) return "";
  const d = new Date(date);
  if (isNaN(d.getTime())) return "";

  const parts = new Intl.DateTimeFormat("vi-VN", {
    timeZone: "Asia/Ho_Chi_Minh",
    weekday: "long",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(d);

  const getPart = (type: string) => parts.find((p) => p.type === type)?.value || "";
  let weekday = getPart("weekday");
  weekday = weekday.charAt(0).toUpperCase() + weekday.slice(1);
  const day = getPart("day");
  const month = getPart("month");
  const year = getPart("year");
  const hour = getPart("hour");
  const minute = getPart("minute");

  return `${weekday}, ${day}/${month}/${year}, ${hour}:${minute} (GMT+7)`;
}

export function formatDateShort(date: Date | string | number | null | undefined): string {
  if (!date) return "";
  const d = new Date(date);
  if (isNaN(d.getTime())) return "";
  const parts = new Intl.DateTimeFormat("vi-VN", {
    timeZone: "Asia/Ho_Chi_Minh",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).formatToParts(d);
  const getPart = (type: string) => parts.find((p) => p.type === type)?.value || "";
  return `${getPart("day")}/${getPart("month")}/${getPart("year")}`;
}

export function formatRelativeTime(date: Date | string | number | null | undefined): string {
  if (!date) return "";
  const d = new Date(date);
  if (isNaN(d.getTime())) return "";
  const now = new Date();
  if (d.getTime() > now.getTime()) {
    return "Vừa xong";
  }
  return formatDistanceToNow(d, { addSuffix: true, locale: vi });
}

export function truncate(text: string | null | undefined, length: number = 160): string {
  if (!text) return "";
  const cleaned = text.replace(/<[^>]*>?/gm, "").trim();
  if (cleaned.length <= length) return cleaned;
  return cleaned.slice(0, length).trim() + "...";
}

/**
 * Xóa sạch các hậu tố tên báo khỏi tiêu đề bài viết (ví dụ: " - Báo VnExpress", " - Báo VnExpress Thể thao",...)
 */
export function cleanArticleTitle(title: string): string {
  if (!title) return "";
  return title
    .replace(/\s*[-–—|]\s*(Báo\s+)?VnExpress(\s+[A-Za-zÀ-ỹ\s]+)?$/i, "")
    .replace(/\s*[-–—|]\s*(Báo\s+)?Tuổi\s+Trẻ(\s+[A-Za-zÀ-ỹ\s]+)?$/i, "")
    .replace(/\s*[-–—|]\s*(Báo\s+)?Thanh\s+Niên(\s+[A-Za-zÀ-ỹ\s]+)?$/i, "")
    .replace(/\s*[-–—|]\s*(Báo\s+)?Dân\s+Trí(\s+[A-Za-zÀ-ỹ\s]+)?$/i, "")
    .replace(/\s*[-–—|]\s*(Báo\s+)?Vietnamnet(\s+[A-Za-zÀ-ỹ\s]+)?$/i, "")
    .trim();
}

/**
 * Khóa chuẩn hóa tiêu đề phục vụ phát hiện trùng lặp bài viết
 */
export function normalizeTitleKey(title: string): string {
  return cleanArticleTitle(title)
    .toLowerCase()
    .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?"'’“”]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}
