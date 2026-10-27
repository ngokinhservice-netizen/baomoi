import React from "react";
import Link from "next/link";
import { ChevronRight, ShieldCheck, FileText, Lock } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Chính sách & Quy định bản quyền | MTK NEWS",
  description: "Chính sách biên tập, đạo đức báo chí và bảo vệ bản quyền tại MTK NEWS.",
};

export default function PolicyPage() {
  return (
    <div className="max-w-4xl mx-auto py-6">
      <nav className="flex items-center space-x-1.5 text-xs text-gray-500 mb-6 pb-2 border-b border-gray-100">
        <Link href="/" className="hover:text-primary transition-colors">Trang chủ</Link>
        <ChevronRight className="w-3.5 h-3.5 text-gray-400" />
        <span className="font-semibold text-gray-800">Chính sách & Bản quyền</span>
      </nav>

      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold font-serif text-gray-900 mb-3">
            Quy Định Biên Tập & Bản Quyền Nội Dung
          </h1>
          <p className="text-sm text-gray-500">Cập nhật lần cuối: Tháng 10/2026</p>
        </div>

        <section className="space-y-3">
          <h2 className="text-xl font-bold text-gray-900 flex items-center">
            <ShieldCheck className="w-5 h-5 text-primary mr-2" />
            1. Tôn chỉ hoạt động và đạo đức báo chí
          </h2>
          <p className="text-gray-700 leading-relaxed text-sm">
            MTK NEWS cam kết cung cấp thông tin trung thực, khách quan và đa chiều. Mọi tin tức xuất bản trên hệ thống đều tuân thủ chặt chẽ pháp luật báo chí, quy định an toàn thông tin mạng và quy chuẩn đạo đức nghề nghiệp.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-bold text-gray-900 flex items-center">
            <FileText className="w-5 h-5 text-primary mr-2" />
            2. Quy định trích dẫn và tổng hợp nguồn tin
          </h2>
          <p className="text-gray-700 leading-relaxed text-sm">
            Đối với các tin tức được thu thập hoặc trích dẫn từ các website đối tác và hãng thông tấn:
          </p>
          <ul className="list-disc list-inside text-sm text-gray-700 space-y-1.5 ml-2">
            <li>Luôn ghi rõ tên cơ quan báo chí hoặc website phát hành gốc.</li>
            <li>Cung cấp liên kết trực tiếp (canonical / direct link) trỏ về bài viết gốc.</li>
            <li>Phân biệt rõ ràng giữa tin bài tự sản xuất và tin tổng hợp dẫn nguồn (Mode A & Mode B).</li>
            <li>Tôn trọng quyền sở hữu trí tuệ của tác giả và cơ quan báo chí đối tác.</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-bold text-gray-900 flex items-center">
            <Lock className="w-5 h-5 text-primary mr-2" />
            3. Chính sách bảo mật dữ liệu người dùng
          </h2>
          <p className="text-gray-700 leading-relaxed text-sm">
            MTK NEWS bảo vệ tuyệt đối thông tin cá nhân của độc giả và người quản trị. Chúng tôi không chia sẻ thông tin cho bên thứ ba khi chưa có sự đồng thuận, trừ các trường hợp theo yêu cầu của cơ quan pháp luật có thẩm quyền.
          </p>
        </section>
      </div>
    </div>
  );
}
