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
  let d = new Date(date);
  if (isNaN(d.getTime())) return "";
  const now = new Date();

  // If date is in the future, correct the +7h timezone parsing bug
  if (d.getTime() > now.getTime()) {
    const shifted = new Date(d.getTime() - 7 * 3600 * 1000);
    if (shifted.getTime() <= now.getTime()) {
      d = shifted;
    } else {
      d = new Date(now.getTime() - 30 * 60 * 1000);
    }
  }

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
  let d = new Date(date);
  if (isNaN(d.getTime())) return "";
  const now = new Date();

  // If date is in the future, correct the +7h timezone parsing bug
  if (d.getTime() > now.getTime()) {
    const shifted = new Date(d.getTime() - 7 * 3600 * 1000);
    if (shifted.getTime() <= now.getTime()) {
      d = shifted;
    }
  }

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
  let d = new Date(date);
  if (isNaN(d.getTime())) return "";
  const now = new Date();

  // If date is ahead of current time:
  if (d.getTime() > now.getTime()) {
    const futureDiffMs = d.getTime() - now.getTime();
    // If it's only slightly ahead (within 3 minutes), it's just normal server clock skew
    if (futureDiffMs <= 3 * 60 * 1000) {
      return "Vừa xong";
    }
    // If it's more than 3 minutes in the future, it was stored without timezone (+7h offset bug)
    const shifted = new Date(d.getTime() - 7 * 3600 * 1000);
    if (shifted.getTime() <= now.getTime()) {
      d = shifted;
    } else {
      // If still slightly ahead after 7h shift, treat as recent
      d = new Date(now.getTime() - 5 * 60 * 1000);
    }
  }

  const diffMs = now.getTime() - d.getTime();
  const minutesAgo = Math.floor(diffMs / (1000 * 60));

  if (minutesAgo < 1) {
    return "Vừa xong";
  }
  if (minutesAgo < 60) {
    return `${minutesAgo} phút trước`;
  }
  const hoursAgo = Math.floor(minutesAgo / 60);
  if (hoursAgo < 24) {
    return `${hoursAgo} giờ trước`;
  }
  const daysAgo = Math.floor(hoursAgo / 24);
  if (daysAgo === 1) {
    return "Hôm qua";
  }
  if (daysAgo < 7) {
    return `${daysAgo} ngày trước`;
  }

  // Format as DD/MM for older articles
  const parts = new Intl.DateTimeFormat("vi-VN", {
    timeZone: "Asia/Ho_Chi_Minh",
    day: "2-digit",
    month: "2-digit",
  }).formatToParts(d);
  const day = parts.find((p) => p.type === "day")?.value || "";
  const month = parts.find((p) => p.type === "month")?.value || "";
  return `${day}/${month}`;
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
