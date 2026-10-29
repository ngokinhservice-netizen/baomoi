import React from "react";
import Link from "next/link";
import { ChevronRight, Mail, Phone, MapPin, Send } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Liên hệ tòa soạn | NHỊP SỐNG 247",
  description: "Thông tin liên hệ tòa soạn, gửi bài cộng tác và đường dây nóng NHỊP SỐNG 247.",
};

export default function ContactPage() {
  return (
    <div className="max-w-4xl mx-auto py-6">
      <nav className="flex items-center space-x-1.5 text-xs text-gray-500 mb-6 pb-2 border-b border-gray-100">
        <Link href="/" className="hover:text-primary transition-colors">Trang chủ</Link>
        <ChevronRight className="w-3.5 h-3.5 text-gray-400" />
        <span className="font-semibold text-gray-800">Liên hệ tòa soạn</span>
      </nav>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
        <div className="md:col-span-5 space-y-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold font-serif text-gray-900 mb-2">
              Liên Hệ NHỊP SỐNG 247
            </h1>
            <p className="text-sm text-gray-600">
              Mọi ý kiến đóng góp, tin tức độc giả cung cấp hoặc liên hệ phát hành vui lòng kết nối với chúng tôi.
            </p>
          </div>

          <div className="space-y-4 text-sm text-gray-700">
            <div className="flex items-start space-x-3">
              <MapPin className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-gray-900">Trụ sở tòa soạn:</p>
                <p>Tòa nhà Báo chí & Truyền thông, Quận 1, TP. Hồ Chí Minh</p>
              </div>
            </div>

            <div className="flex items-start space-x-3">
              <Phone className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-gray-900">Đường dây nóng (24/7):</p>
                <p>1900 8888 / (+84) 28 3888 9999</p>
              </div>
            </div>

            <div className="flex items-start space-x-3">
              <Mail className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-gray-900">Hòm thư điện tử:</p>
                <p>toasoan@nhipsong247.vn / bandoc@nhipsong247.vn</p>
              </div>
            </div>
          </div>
        </div>

        <div className="md:col-span-7 bg-gray-50 p-6 rounded-lg border border-gray-200">
          <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
            <Send className="w-4 h-4 text-primary mr-2" />
            Gửi thông tin / tin nóng cho tòa soạn
          </h2>

          <form className="space-y-4 text-sm">
            <div>
              <label className="block font-medium text-gray-700 mb-1">Họ và tên độc giả</label>
              <input
                type="text"
                placeholder="Nguyễn Văn A"
                className="w-full bg-white border border-gray-300 rounded px-3 py-2 focus:border-primary focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-medium text-gray-700 mb-1">Số điện thoại hoặc Email</label>
              <input
                type="text"
                placeholder="example@gmail.com / 0912..."
                className="w-full bg-white border border-gray-300 rounded px-3 py-2 focus:border-primary focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-medium text-gray-700 mb-1">Nội dung phản ánh / Tin bài</label>
              <textarea
                rows={4}
                placeholder="Mô tả sự việc, thời gian, địa điểm hoặc nội dung bạn muốn chia sẻ..."
                className="w-full bg-white border border-gray-300 rounded px-3 py-2 focus:border-primary focus:outline-none"
              />
            </div>

            <button
              type="button"
              className="w-full bg-primary hover:bg-primary-hover text-white font-semibold py-2.5 rounded transition-colors shadow-sm"
            >
              Gửi thông tin đến ban biên tập
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
