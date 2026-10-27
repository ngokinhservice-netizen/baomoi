import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"),
  title: {
    default: "TOÀN CẢNH 24H — Báo Điện Tử Tin Tức & Phân Tích Đa Chiều",
    template: "%s | TOÀN CẢNH 24H",
  },
  description: "Báo điện tử tin tức thời sự, kinh doanh, công nghệ, thế giới, giáo dục, đời sống và thể thao hàng đầu Việt Nam. Cập nhật liên tục 24/7.",
  keywords: ["toàn cảnh 24h", "báo điện tử", "tin tức", "thời sự", "tin nhanh", "công nghệ", "kinh doanh", "tin nóng 24h"],
  authors: [{ name: "TOÀN CẢNH 24H" }],
  openGraph: {
    type: "website",
    locale: "vi_VN",
    url: "/",
    siteName: "TOÀN CẢNH 24H",
    title: "TOÀN CẢNH 24H — Báo Điện Tử Tin Tức & Phân Tích Đa Chiều",
    description: "Cập nhật liên tục 24/7 tin tức nóng, thời sự, phóng sự điều tra, kinh tế, công nghệ trong nước và quốc tế.",
    images: [{ url: "/logo.svg" }],
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi" className="scroll-smooth">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:ital,wght@0,300;0,400;0,500;0,600;0,700;0,800;0,900;1,400;1,600&family=Merriweather:ital,wght@0,400;0,700;0,900;1,400&display=swap"
          rel="stylesheet"
        />
        <link rel="preconnect" href="https://images.unsplash.com" />
      </head>
      <body className="min-h-screen flex flex-col bg-white text-gray-900 font-sans selection:bg-red-100 selection:text-primary">
        {children}
      </body>
    </html>
  );
}
