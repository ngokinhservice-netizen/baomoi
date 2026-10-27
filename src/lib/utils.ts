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
  return format(d, "dd/MM/yyyy HH:mm", { locale: vi });
}

export function formatDateShort(date: Date | string | number | null | undefined): string {
  if (!date) return "";
  const d = new Date(date);
  if (isNaN(d.getTime())) return "";
  return format(d, "dd/MM/yyyy", { locale: vi });
}

export function formatRelativeTime(date: Date | string | number | null | undefined): string {
  if (!date) return "";
  const d = new Date(date);
  if (isNaN(d.getTime())) return "";
  return formatDistanceToNow(d, { addSuffix: true, locale: vi });
}

export function truncate(text: string | null | undefined, length: number = 160): string {
  if (!text) return "";
  const cleaned = text.replace(/<[^>]*>?/gm, "").trim();
  if (cleaned.length <= length) return cleaned;
  return cleaned.slice(0, length).trim() + "...";
}
