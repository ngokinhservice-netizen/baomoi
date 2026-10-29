import React from "react";
import Link from "next/link";
import Logo from "@/components/brand/Logo";

export default function Footer() {
  return (
    <footer className="w-full bg-[#111827] text-gray-300 pt-12 pb-8 border-t-4 border-primary mt-16">
      <div className="max-w-7xl mx-auto px-4">
        {/* Top footer columns */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 pb-10 border-b border-gray-800">
          {/* Col 1: Brand Info */}
          <div className="md:col-span-1 space-y-3">
            <Logo href="/" variant="dark" />
            <p className="text-xs text-gray-400 leading-relaxed pt-2">
              Báo điện tử tin tức thời sự hàng đầu Việt Nam và Quốc tế. Cơ quan ngôn luận, xuất bản và phân tích thông tin đa chiều, nhanh chóng, chuẩn xác 24/7.
            </p>
            <div className="pt-2 text-xs text-gray-400 space-y-1">
              <p>Tổng biên tập: <strong className="text-gray-200">Ban Biên Tập Nhịp Sống 247</strong></p>
              <p>Hotline: <strong className="text-gray-200">1900 8888 (24/7)</strong></p>
              <p>Email: <strong className="text-gray-200">toasoan@nhipsong247.vn</strong></p>
            </div>
          </div>

          {/* Col 2: Categories 1 */}
          <div>
            <h4 className="text-sm font-bold text-white uppercase tracking-wider mb-4 border-l-2 border-primary pl-2">
              Chuyên mục nổi bật
            </h4>
            <ul className="space-y-2 text-sm text-gray-400">
              <li>
                <Link href="/danh-muc/thoi-su" className="hover:text-white transition-colors">Thời sự chính trị</Link>
              </li>
              <li>
                <Link href="/danh-muc/the-gioi" className="hover:text-white transition-colors">Thời sự quốc tế</Link>
              </li>
              <li>
                <Link href="/danh-muc/kinh-doanh" className="hover:text-white transition-colors">Kinh tế & Thị trường</Link>
              </li>
              <li>
                <Link href="/danh-muc/cong-nghe" className="hover:text-white transition-colors">Công nghệ số & AI</Link>
              </li>
            </ul>
          </div>

          {/* Col 3: Categories 2 */}
          <div>
            <h4 className="text-sm font-bold text-white uppercase tracking-wider mb-4 border-l-2 border-primary pl-2">
              Đời sống & Giải trí
            </h4>
            <ul className="space-y-2 text-sm text-gray-400">
              <li>
                <Link href="/danh-muc/giao-duc" className="hover:text-white transition-colors">Giáo dục & Học đường</Link>
              </li>
              <li>
                <Link href="/danh-muc/doi-song" className="hover:text-white transition-colors">Đời sống & Sức khỏe</Link>
              </li>
              <li>
                <Link href="/danh-muc/the-thao" className="hover:text-white transition-colors">Thể thao 24h</Link>
              </li>
              <li>
                <Link href="/danh-muc/giai-tri" className="hover:text-white transition-colors">Văn hóa & Giải trí</Link>
              </li>
            </ul>
          </div>

          {/* Col 4: Legal & System */}
          <div>
            <h4 className="text-sm font-bold text-white uppercase tracking-wider mb-4 border-l-2 border-primary pl-2">
              Thông tin & Quy định
            </h4>
            <ul className="space-y-2 text-sm text-gray-400">
              <li>
                <Link href="/chinh-sach" className="hover:text-white transition-colors">Chính sách bảo mật</Link>
              </li>
              <li>
                <Link href="/chinh-sach" className="hover:text-white transition-colors">Quy định bản quyền nội dung</Link>
              </li>
              <li>
                <Link href="/lien-he" className="hover:text-white transition-colors">Liên hệ quảng cáo & tòa soạn</Link>
              </li>
              <li>
                <Link href="/admin" className="hover:text-red-400 transition-colors font-medium">Hệ thống Quản trị CMS</Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom copyright & attribution */}
        <div className="pt-6 flex flex-col md:flex-row items-center justify-between text-xs text-gray-500">
          <p>© 2026 NHỊP SỐNG 247. Bản quyền thuộc về Báo điện tử Nhịp Sống 247.</p>
          <p className="mt-2 md:mt-0">
            Mọi hành vi sao chép, trích dẫn phải tuân thủ quy định dẫn nguồn và điều khoản sử dụng.
          </p>
        </div>
      </div>
    </footer>
  );
}
