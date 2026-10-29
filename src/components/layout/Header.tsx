"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Search, Menu, X, Shield, Clock, Flame, ChevronRight } from "lucide-react";
import Logo from "@/components/brand/Logo";
import WeatherWidget from "@/components/widgets/WeatherWidget";

interface CategoryItem {
  id: string;
  name: string;
  slug: string;
}

interface HeaderProps {
  categories?: CategoryItem[];
}

const DEFAULT_CATEGORIES: CategoryItem[] = [
  { id: "1", name: "Thời sự", slug: "thoi-su" },
  { id: "2", name: "Thế giới", slug: "the-gioi" },
  { id: "3", name: "Kinh doanh", slug: "kinh-doanh" },
  { id: "4", name: "Công nghệ", slug: "cong-nghe" },
  { id: "5", name: "Giáo dục", slug: "giao-duc" },
  { id: "6", name: "Đời sống", slug: "doi-song" },
  { id: "7", name: "Thể thao", slug: "the-thao" },
  { id: "8", name: "Giải trí", slug: "giai-tri" },
  { id: "9", name: "Xe", slug: "xe" },
];

export default function Header({ categories = DEFAULT_CATEGORIES }: HeaderProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [currentDate, setCurrentDate] = useState("");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    const now = new Date();
    const days = ["Chủ nhật", "Thứ hai", "Thứ ba", "Thứ tư", "Thứ năm", "Thứ sáu", "Thứ bảy"];
    const dayName = days[now.getDay()];
    const dateStr = `${dayName}, ngày ${now.getDate()}/${now.getMonth() + 1}/${now.getFullYear()}`;
    setCurrentDate(dateStr);
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
      setSearchOpen(false);
    }
  };

  return (
    <header className="w-full bg-white border-b border-gray-200 sticky top-0 z-40 shadow-sm">
      {/* 1. Top bar: Date, Trending, Admin Link */}
      <div className="bg-gray-50 border-b border-gray-200 text-xs text-gray-600 hidden md:block">
        <div className="max-w-7xl mx-auto px-4 py-1.5 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <span className="flex items-center text-gray-500 font-medium">
              <Clock className="w-3.5 h-3.5 mr-1 text-primary" />
              {currentDate || "NHỊP SỐNG 247 — Cập nhật liên tục 24/7"}
            </span>
            <span className="text-gray-300">|</span>
            <WeatherWidget />
            <span className="text-gray-300">|</span>
            <div className="flex items-center space-x-2">
              <span className="inline-flex items-center font-semibold text-primary">
                <Flame className="w-3.5 h-3.5 mr-1" />
                Tiêu điểm:
              </span>
              <Link
                href="/search?q=giao+thông"
                className="hover:text-primary transition-colors truncate max-w-sm"
              >
                Hạ tầng cao tốc bứt phá • Chuyển đổi AI doanh nghiệp
              </Link>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <Link
              href="/admin"
              className="flex items-center text-gray-700 hover:text-primary font-medium transition-colors"
            >
              <Shield className="w-3.5 h-3.5 mr-1 text-primary" />
              Khu vực Quản trị CMS
            </Link>
          </div>
        </div>
      </div>

      {/* 2. Main Brand Header */}
      <div className="max-w-7xl mx-auto px-4 py-3 md:py-4 flex items-center justify-between">
        {/* Mobile menu button */}
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="md:hidden p-2 text-gray-700 hover:text-primary"
          aria-label="Mở menu"
        >
          {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>

        {/* Brand Logo */}
        <Logo href="/" variant="light" />

        {/* Search Bar (Desktop) */}
        <div className="hidden md:flex items-center flex-1 max-w-md mx-8">
          <form onSubmit={handleSearchSubmit} className="relative w-full">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm kiếm tin tức, sự kiện, từ khóa..."
              className="w-full bg-gray-100 hover:bg-gray-50 focus:bg-white text-sm text-gray-900 rounded-full pl-4 pr-10 py-2 border border-transparent focus:border-primary focus:outline-none transition-all"
            />
            <button
              type="submit"
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-500 hover:text-primary p-1"
              aria-label="Tìm kiếm"
            >
              <Search className="w-4 h-4" />
            </button>
          </form>
        </div>

        {/* Action icons / Mobile search toggle */}
        <div className="flex items-center space-x-1 sm:space-x-2">
          <div className="md:hidden">
            <WeatherWidget />
          </div>
          <button
            onClick={() => setSearchOpen(!searchOpen)}
            className="md:hidden p-1.5 text-gray-700 hover:text-primary"
            aria-label="Tìm kiếm"
          >
            <Search className="w-5 h-5" />
          </button>
          <Link
            href="/admin"
            className="md:hidden p-1.5 text-gray-700 hover:text-primary"
            aria-label="Đăng nhập Admin"
          >
            <Shield className="w-5 h-5 text-primary" />
          </Link>
        </div>
      </div>

      {/* Mobile Search Bar Expandable */}
      {searchOpen && (
        <div className="md:hidden px-4 pb-3 pt-1 border-t border-gray-100">
          <form onSubmit={handleSearchSubmit} className="relative w-full">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Nhập từ khóa tìm kiếm..."
              className="w-full bg-gray-100 text-sm rounded-full pl-4 pr-10 py-2 border border-gray-300 focus:border-primary focus:outline-none"
              autoFocus
            />
            <button
              type="submit"
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500"
            >
              <Search className="w-4 h-4" />
            </button>
          </form>
        </div>
      )}

      {/* 3. Category Navigation Bar (Desktop) */}
      <nav className="bg-primary text-white hidden md:block">
        <div className="max-w-7xl mx-auto px-4 flex items-center justify-between">
          <ul className="flex items-center space-x-1 overflow-x-auto text-sm font-semibold py-0.5">
            <li>
              <Link
                href="/"
                className={`inline-block px-3.5 py-2.5 hover:bg-primary-hover transition-colors ${
                  pathname === "/" ? "bg-primary-hover font-bold border-b-2 border-white" : ""
                }`}
              >
                Trang chủ
              </Link>
            </li>
            {categories.map((cat) => {
              const isActive = pathname.startsWith(`/danh-muc/${cat.slug}`) || pathname.startsWith(`/${cat.slug}`);
              return (
                <li key={cat.id}>
                  <Link
                    href={`/danh-muc/${cat.slug}`}
                    className={`inline-block px-3.5 py-2.5 hover:bg-primary-hover transition-colors whitespace-nowrap ${
                      isActive ? "bg-primary-hover font-bold border-b-2 border-white" : ""
                    }`}
                  >
                    {cat.name}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      </nav>

      {/* Mobile Navigation Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 top-[110px] z-50 bg-black/50 backdrop-blur-sm">
          <div className="bg-white w-4/5 max-w-sm h-full shadow-2xl p-5 overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-gray-200">
              <span className="font-bold text-gray-900 text-lg">Chuyên mục tin tức</span>
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="p-1 text-gray-500 hover:text-gray-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <ul className="py-3 divide-y divide-gray-100">
              <li>
                <Link
                  href="/"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center justify-between py-3 text-base font-medium text-gray-900 hover:text-primary"
                >
                  <span>Trang chủ</span>
                  <ChevronRight className="w-4 h-4 text-gray-400" />
                </Link>
              </li>
              {categories.map((cat) => (
                <li key={cat.id}>
                  <Link
                    href={`/danh-muc/${cat.slug}`}
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center justify-between py-3 text-base font-medium text-gray-800 hover:text-primary"
                  >
                    <span>{cat.name}</span>
                    <ChevronRight className="w-4 h-4 text-gray-400" />
                  </Link>
                </li>
              ))}
            </ul>

            <div className="pt-6 mt-4 border-t border-gray-200 space-y-3">
              <Link
                href="/admin"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center justify-center w-full py-2.5 px-4 bg-primary text-white font-medium rounded-md hover:bg-primary-hover transition-colors text-sm shadow-sm"
              >
                <Shield className="w-4 h-4 mr-2" />
                Đăng nhập Ban Quản Trị CMS
              </Link>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
