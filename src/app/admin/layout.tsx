"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import Logo from "@/components/brand/Logo";
import {
  LayoutDashboard,
  FileText,
  PenTool,
  Rss,
  Inbox,
  FolderTree,
  Image as ImageIcon,
  Users,
  Settings,
  Activity,
  LogOut,
  Menu,
  X,
  ExternalLink,
  Shield,
  Loader2,
} from "lucide-react";

interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: string;
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const isLoginPage = pathname === "/admin/login";

  useEffect(() => {
    if (isLoginPage) {
      setLoading(false);
      return;
    }

    async function checkAuth() {
      try {
        const res = await fetch("/api/auth/me");
        if (!res.ok) {
          router.push("/admin/login");
          return;
        }
        const data = await res.json();
        setUser(data.user);
      } catch {
        router.push("/admin/login");
      } finally {
        setLoading(false);
      }
    }

    checkAuth();
  }, [pathname, isLoginPage, router]);

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      router.push("/admin/login");
      router.refresh();
    } catch {
      router.push("/admin/login");
    }
  };

  if (isLoginPage) {
    return <>{children}</>;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex flex-col items-center space-y-3">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
          <p className="text-sm text-gray-500 font-medium">Đang tải bảng điều khiển CMS...</p>
        </div>
      </div>
    );
  }

  const navItems = [
    { label: "Tổng quan", href: "/admin", icon: LayoutDashboard },
    { label: "Quản lý bài viết", href: "/admin/articles", icon: FileText },
    { label: "Viết bài mới", href: "/admin/articles/new", icon: PenTool },
    { label: "Nguồn tin tự động", href: "/admin/sources", icon: Rss },
    { label: "Hàng đợi bài viết", href: "/admin/imported-articles", icon: Inbox },
    { label: "Danh mục", href: "/admin/categories", icon: FolderTree },
    { label: "Thư viện ảnh", href: "/admin/media", icon: ImageIcon },
    { label: "Người dùng & Phân quyền", href: "/admin/users", icon: Users, adminOnly: true },
    { label: "Nhật ký hệ thống", href: "/admin/logs", icon: Activity },
    { label: "Cài đặt website", href: "/admin/settings", icon: Settings, adminOnly: true },
  ];

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col md:flex-row">
      {/* 1. Mobile Sidebar Backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* 2. Admin Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-gray-900 text-gray-300 flex flex-col justify-between transition-transform duration-300 md:static md:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div>
          {/* Logo & Brand */}
          <div className="p-4 border-b border-gray-800 flex items-center justify-between">
            <Logo href="/admin" variant="dark" showSlogan={false} />
            <button
              onClick={() => setSidebarOpen(false)}
              className="md:hidden text-gray-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation Items */}
          <nav className="p-3 space-y-1 overflow-y-auto max-h-[calc(100vh-140px)]">
            {navItems.map((item) => {
              if (item.adminOnly && user?.role !== "ADMIN") return null;
              const isActive =
                item.href === "/admin"
                  ? pathname === "/admin"
                  : pathname.startsWith(item.href);
              const Icon = item.icon;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setSidebarOpen(false)}
                  className={`flex items-center space-x-3 px-3.5 py-2.5 rounded-lg text-xs font-semibold transition-colors ${
                    isActive
                      ? "bg-primary text-white shadow-sm"
                      : "text-gray-300 hover:bg-gray-800 hover:text-white"
                  }`}
                >
                  <Icon className="w-4 h-4 flex-shrink-0" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Sidebar Footer: View Website Link */}
        <div className="p-3 border-t border-gray-800 space-y-2">
          <Link
            href="/"
            target="_blank"
            className="flex items-center justify-between px-3.5 py-2 text-xs font-medium text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
          >
            <span className="flex items-center">
              <ExternalLink className="w-4 h-4 mr-2 text-gray-500" />
              Xem trang độc giả
            </span>
          </Link>
        </div>
      </aside>

      {/* 3. Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header */}
        <header className="bg-white border-b border-gray-200 sticky top-0 z-30 px-4 py-3 flex items-center justify-between shadow-xs">
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="md:hidden p-1.5 text-gray-600 hover:text-gray-900 rounded-md hover:bg-gray-100"
            >
              <Menu className="w-5 h-5" />
            </button>
            <h2 className="text-sm font-bold text-gray-800 hidden sm:block">
              Hệ Thống Xuất Bản & Tự Động Hóa TOÀN CẢNH 24H
            </h2>
          </div>

          {/* User profile & Logout */}
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2 text-xs">
              <div className="w-8 h-8 bg-primary/10 text-primary font-bold rounded-full flex items-center justify-center">
                {user?.name?.slice(0, 1) || "U"}
              </div>
              <div className="hidden sm:block text-left">
                <p className="font-bold text-gray-900 leading-tight">{user?.name}</p>
                <span className="inline-block text-[10px] uppercase font-bold text-primary">
                  {user?.role}
                </span>
              </div>
            </div>

            <button
              onClick={handleLogout}
              className="flex items-center text-xs text-gray-500 hover:text-red-600 font-semibold transition-colors p-1.5 hover:bg-gray-50 rounded-md"
              title="Đăng xuất"
            >
              <LogOut className="w-4 h-4 sm:mr-1" />
              <span className="hidden sm:inline">Đăng xuất</span>
            </button>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
