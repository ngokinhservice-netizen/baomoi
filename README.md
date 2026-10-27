# MTK NEWS — AUTOMATED NEWS WEBSITE & CMS

Hệ thống Báo Điện Tử Tự Động Hóa & Quản Trị Nội Dung (CMS) chuyên nghiệp, hiện đại, hiệu năng cao.

---

## I. TỔNG QUAN HỆ THỐNG

MTK NEWS là một giải pháp báo điện tử hoàn chỉnh từ frontend độc giả, ban quản trị tòa soạn CMS, tới bộ máy tự động phát hiện, thu thập và chuẩn hóa tin tức từ đa nguồn (RSS/Atom, Sitemap XML, HTML DOM).

### Các phân hệ chính:
1. **Cổng Thông Tin Độc Giả (Public News Portal)**:
   - Giao diện báo điện tử tiếng Việt hiện đại theo tông màu chuẩn báo chí (Crimson Red / Xám than / Trắng).
   - Trang chủ gồm đầy đủ 14 phân khu tin tức (Tiêu điểm, Mới nhất, Thời sự, Thế giới, Kinh doanh, Công nghệ, Giáo dục, Đời sống, Thể thao, Giải trí, Đọc nhiều, BTV lựa chọn, Liên quan, Chân trang).
   - Trang chi tiết bài viết với định dạng báo chí chuẩn mực, hỗ trợ dẫn nguồn minh bạch (Source Attribution), hình ảnh có caption và nguồn ảnh, nút chia sẻ, Schema.org `NewsArticle` chuẩn SEO.
   - Trang tìm kiếm toàn văn đa tiêu chí (`/search?q=...`) có lọc theo chuyên mục và phân trang.
   - Trang danh mục tin tức (`/danh-muc/[slug]`) với chế độ sắp xếp Mới nhất hoặc Xem nhiều nhất.
   - Dynamic SEO Sitemap (`/sitemap.xml`) và `robots.txt` tự động cập nhật.

2. **Khu Vực Quản Trị CMS Tòa Soạn (`/admin`)**:
   - Xác thực server-side bảo mật với JWT Token và HTTP-Only Cookie.
   - Phân quyền 3 cấp bậc: **Admin** (Quản trị tối cao), **Editor** (Biên tập & duyệt bài), **Author** (Phóng viên viết bài).
   - Bảng điều khiển (Dashboard) với biểu đồ thống kê sản lượng tin bài, tỷ lệ quét nguồn thành công, nhật ký hoạt động.
   - Trình soạn thảo bài viết phong phú hỗ trợ tự động lưu nháp (Local Draft Auto-save) không bao giờ mất dữ liệu khi mất mạng hoặc tải lại trang.
   - Trợ lý AI Biên Tập (AI Editorial Assistant) tích hợp Gemini API hoặc heuristic nội bộ: tóm tắt tự động, gợi ý 3 tiêu đề giật tít chuẩn mực, gợi ý SEO Title/Description, gợi ý chuyên mục và kiểm tra trích dẫn.
   - Thư viện ảnh (Media Library): upload ảnh (JPG, PNG, WEBP, GIF tối đa 5MB) lưu trữ an toàn, không lưu Base64 trong database.
   - Quản lý 8 chuyên mục tin tức chuẩn mực và mở rộng linh hoạt.

3. **Lõi Tự Động Hóa Thu Thập Tin Tức (Core Auto News Scraper Engine)**:
   - Cơ chế tự động nhận diện đa tầng không bắt buộc API:
     * Ưu tiên 1: RSS/Atom Feed (Trực tiếp hoặc tự động quét link alternate trong HTML).
     * Ưu tiên 2: Sitemap XML (`sitemap.xml` / `sitemapindex`).
     * Ưu tiên 3: Phân tích HTML DOM (Cheerio, OpenGraph, JSON-LD, bộ selector báo chí Việt Nam).
   - **Lá chắn an ninh chống SSRF (SSRF Security Shield)**:
     * Chặn toàn bộ IP nội bộ, Private IP (10.x, 172.16-31.x, 192.168.x, 127.x, 0.0.0.0).
     * Chặn địa chỉ metadata của các nhà cung cấp đám mây (AWS/GCP/Azure: `169.254.169.254`).
     * Phân giải DNS trước khi kết nối, kiểm soát redirect thủ công qua từng bước.
     * Giới hạn thời gian kết nối (Timeout 10-12s) và dung lượng phản hồi tối đa (5MB).
   - Khử trùng lặp đa tầng (Deduplication):
     * Chuẩn hóa URL, loại bỏ sạch mã theo dõi (`utm_*`, `fbclid`, `gclid`, `ref`...).
     * Kiểm tra trùng lặp qua URL chuẩn hóa và mã băm nội dung SHA-256 (Content Hash).
   - 3 Chế độ xử lý bài viết:
     * **Chế độ A (CITATION - Dẫn nguồn)**: Lưu tiêu đề, trích đoạn ngắn, ảnh thumbnail và link bài gốc.
     * **Chế độ B (EDITORIAL_QUEUE - Hàng đợi duyệt)**: Đưa vào hàng đợi tại `/admin/imported-articles` để BTV kiểm tra, gán chuyên mục trước khi đăng.
     * **Chế độ C (AUTO_PUBLISH - Tự động xuất bản)**: Tự động tạo bài và hiển thị ngay trên trang chủ khi nguồn đã xác minh bản quyền.
   - Công cụ phân tích tương thích URL (`/api/admin/sources/analyze` & Modal trong CMS): Kiểm tra ngay khả năng thu thập của bất kỳ link nào trước khi lưu.
   - Background Worker & Cron API (`/api/cron/scrape`) bảo vệ bằng Secret Token.

---

## II. CÔNG NGHỆ SỬ DỤNG

- **Framework**: Next.js 14 App Router, React 18, TypeScript.
- **Styling**: Tailwind CSS, Lucide Icons.
- **Database & ORM**: PostgreSQL / SQLite, Prisma ORM 5.
- **Xác thực**: JWT (jsonwebtoken), Bcrypt.js, HTTP-Only Cookies.
- **Thu thập dữ liệu**: Cheerio, Fast-XML-Parser, RSS-Parser, SafeFetch SSRF-guarded client.
- **Bảo mật**: ipaddr.js, DNS verification, Input validation (Zod).

---

## III. HƯỚNG DẪN CÀI ĐẶT & CHẠY LOCAL (ZERO-SETUP)

Dự án được cấu hình mặc định để có thể chạy kiểm thử ngay lập tức mà không cần cài đặt thêm dịch vụ bên ngoài:

### 1. Khởi tạo Cơ sở dữ liệu & Dữ liệu mẫu
```bash
# Đẩy schema vào database SQLite cục bộ
npm run prisma:push

# Nạp dữ liệu mẫu (Tài khoản Admin, chuyên mục, bài viết, nguồn tin RSS)
npm run seed
```

### 2. Khởi chạy Ứng dụng Web
```bash
npm run dev
```
Truy cập:
- Trang đọc báo: [http://localhost:3000](http://localhost:3000)
- Bảng quản trị CMS: [http://localhost:3000/admin](http://localhost:3000/admin)

### 3. Tài Khoản Quản Trị Mặc Định
- **Admin (Toàn quyền)**:
  - Email: `admin@mtknews.vn`
  - Mật khẩu: `Admin@MTK2026Password!`
- **Editor (Biên tập viên)**:
  - Email: `editor@mtknews.vn`
  - Mật khẩu: `Editor@MTK2026Password!`

*(Khuyến nghị đổi mật khẩu sau khi triển khai môi trường Production)*

---

## IV. CHẠY BỘ KIỂM THỬ TỰ ĐỘNG (AUTOMATED TESTS)

Hệ thống có bộ kiểm thử 40 bài test tự động bao quát toàn bộ yêu cầu:
```bash
npm test
```
Các bài test kiểm tra:
1. Chặn đứng các đòn tấn công SSRF (127.0.0.1, 10.x, 172.x, 192.168.x, 169.254.x, file://, ftp://).
2. Chuẩn hóa URL và khử trùng lặp nội dung SHA-256.
3. Phân tích RSS/Atom feed và Sitemap XML.
4. Trích xuất HTML DOM, OpenGraph và cấu trúc bài viết bằng Cheerio.
5. Mã hóa Bcrypt, ký xác thực JWT và thang phân quyền Admin/Editor/Author.
6. Tính toàn vẹn của cơ sở dữ liệu.
7. Thực thi Scraper Engine thực tế và kiểm tra chống tạo bài trùng lặp.

---

## V. KHỞI CHẠY BACKGROUND WORKER (QUÉT THEO LỊCH)

Hệ thống cung cấp 2 phương thức chạy tác vụ nền:

### Cách 1: Chạy tiến trình nền liên tục (Background Worker)
```bash
npm run worker
```
Worker sẽ kiểm tra mỗi 60 giây và tự động kích hoạt thu thập cho các nguồn tin đã đến chu kỳ quét.

### Cách 2: Gọi qua Cron Job hoặc Webhook bên ngoài (Vercel Cron, GitHub Actions, Linux Crontab)
Gửi yêu cầu GET hoặc POST đến endpoint:
```
https://your-domain.com/api/cron/scrape?secret=mtk-cron-secret-token-change-in-production
```
hoặc gửi kèm Header:
```
Authorization: Bearer <CRON_SECRET>
```

---

## VI. HƯỚNG DẪN TRIỂN KHAI POSTGRESQL (PRODUCTION)

Khi triển khai lên các dịch vụ đám mây (Supabase, Neon, Render, AWS RDS, Docker):

1. Cập nhật biến môi trường trong file `.env`:
   ```env
   DATABASE_URL="postgresql://postgres:password@your-db-host:5432/mtk_news?schema=public"
   ```
2. Đổi provider trong `prisma/schema.prisma` sang `postgresql` (hoặc copy nội dung từ file `prisma/schema.postgresql.prisma` đã chuẩn bị sẵn).
3. Chạy lệnh sinh database:
   ```bash
   npx prisma db push
   npm run seed
   ```

---

## VII. SAO LƯU & PHỤC HỒI (BACKUP & RESTORE)

- **Với SQLite (Môi trường local)**:
  - Sao lưu: Copy file `prisma/dev.db` và thư mục `public/uploads/`.
  - Phục hồi: Đặt lại file `dev.db` vào thư mục `prisma/`.
- **Với PostgreSQL (Môi trường production)**:
  - Sao lưu:
    ```bash
    pg_dump -U postgres -d mtk_news -F c -b -v -f mtk_news_backup.dump
    ```
  - Phục hồi:
    ```bash
    pg_restore -U postgres -d mtk_news -v mtk_news_backup.dump
    ```

---
© 2026 MTK NEWS. Sản phẩm bàn giao hoàn chỉnh đạt tiêu chuẩn kỹ thuật phần mềm cao cấp.
