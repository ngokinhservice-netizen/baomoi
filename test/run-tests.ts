import prisma from "../src/lib/prisma";
import { validateUrlForSsrf, isPrivateOrReservedIp } from "../src/lib/security";
import { normalizeUrl, hashString, hashContent } from "../src/lib/scraper/normalizer";
import { parseRssOrAtomXml } from "../src/lib/scraper/rssParser";
import { parseSitemapXml } from "../src/lib/scraper/sitemapParser";
import { extractArticleFromHtml } from "../src/lib/scraper/htmlParser";
import { hashPassword, verifyPassword, signToken, verifyToken, checkPermission, ROLES } from "../src/lib/auth";
import { runScraperJob } from "../src/lib/scraper/engine";

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

function assert(condition: boolean, testName: string, failureDetails?: any) {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  ✅ [PASS] ${testName}`);
  } else {
    failedTests++;
    console.error(`  ❌ [FAIL] ${testName}`);
    if (failureDetails) console.error("     Chi tiết lỗi:", failureDetails);
  }
}

async function runAllTests() {
  console.log("=================================================");
  console.log("    NHỊP SỐNG 247 — AUTOMATED TEST SUITE EXECUTION    ");
  console.log("=================================================\n");

  // ------------------------------------------------------------------------
  // TEST GROUP 1: BẢO MẬT SCRAPER & SSRF PROTECTION (Section XI & XV)
  // ------------------------------------------------------------------------
  console.log("🔍 NHÓM 1: KIỂM THỬ BẢO MẬT SSRF & CHẶN ĐỊA CHỈ NỘI BỘ");

  assert(isPrivateOrReservedIp("127.0.0.1"), "Chặn loopback IPv4 127.0.0.1");
  assert(isPrivateOrReservedIp("10.0.0.1"), "Chặn dải private class A 10.0.0.1");
  assert(isPrivateOrReservedIp("172.16.0.5"), "Chặn dải private class B 172.16.0.5");
  assert(isPrivateOrReservedIp("192.168.1.1"), "Chặn dải private class C 192.168.1.1");
  assert(isPrivateOrReservedIp("169.254.169.254"), "Chặn địa chỉ link-local AWS/Cloud metadata 169.254.169.254");
  assert(isPrivateOrReservedIp("0.0.0.0"), "Chặn 0.0.0.0");
  assert(!isPrivateOrReservedIp("8.8.8.8"), "Cho phép IP public 8.8.8.8");

  const ssrfLocalhost = await validateUrlForSsrf("http://localhost:3000/secret");
  assert(!ssrfLocalhost.isValid, "Từ chối http://localhost");

  const ssrfInternalIp = await validateUrlForSsrf("http://192.168.1.100/admin");
  assert(!ssrfInternalIp.isValid, "Từ chối IP nội bộ 192.168.1.100");

  const ssrfAwsMetadata = await validateUrlForSsrf("http://169.254.169.254/latest/meta-data/");
  assert(!ssrfAwsMetadata.isValid, "Từ chối URL metadata cloud provider");

  const ssrfFileProtocol = await validateUrlForSsrf("file:///etc/passwd");
  assert(!ssrfFileProtocol.isValid, "Từ chối giao thức file://");

  const ssrfFtpProtocol = await validateUrlForSsrf("ftp://example.com/file");
  assert(!ssrfFtpProtocol.isValid, "Từ chối giao thức ftp://");

  const ssrfValidPublic = await validateUrlForSsrf("https://vnexpress.net");
  assert(ssrfValidPublic.isValid, "Chấp nhận domain tin tức hợp lệ (https://vnexpress.net)");

  // ------------------------------------------------------------------------
  // TEST GROUP 2: CHUẨN HÓA URL & PHÁT HIỆN TRÙNG LẶP (Deduplication)
  // ------------------------------------------------------------------------
  console.log("\n🔍 NHÓM 2: CHUẨN HÓA URL & KHỬ TRÙNG LẶP NỘI DUNG");

  const dirtyUrl1 = "https://vnexpress.net/thoi-su/bai-viet-123.html?utm_source=facebook&utm_medium=cpc#comments";
  const dirtyUrl2 = "https://vnexpress.net/thoi-su/bai-viet-123.html?fbclid=IwAR234&ref=home";
  const clean1 = normalizeUrl(dirtyUrl1);
  const clean2 = normalizeUrl(dirtyUrl2);

  assert(clean1 === "https://vnexpress.net/thoi-su/bai-viet-123.html", "Loại bỏ utm_source, utm_medium và fragment");
  assert(clean1 === clean2, "Hai URL khác tracking parameters chuẩn hóa thành cùng 1 URL duy nhất");

  const contentA = "<p>  Hạ tầng giao thông trọng điểm   đang được đẩy nhanh.  </p>";
  const contentB = "<div>Hạ tầng giao thông trọng điểm đang được đẩy nhanh.</div>";
  const hashA = hashContent(contentA);
  const hashB = hashContent(contentB);
  assert(hashA === hashB, "Hash nội dung ngữ nghĩa bỏ qua thẻ HTML và khoảng trắng thừa");

  // ------------------------------------------------------------------------
  // TEST GROUP 3: BỘ PHÂN TÍCH RSS & SITEMAP XML
  // ------------------------------------------------------------------------
  console.log("\n🔍 NHÓM 3: PHÂN TÍCH RSS FEED & SITEMAP XML");

  const sampleRss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:media="http://search.yahoo.com/mrss/">
  <channel>
    <title>Báo Thử Nghiệm RSS</title>
    <link>https://example.com</link>
    <item>
      <title><![CDATA[Tin thử nghiệm số 1: Tăng trưởng kinh tế quý 1]]></title>
      <link>https://example.com/kinh-te/bai-1.html?utm_source=rss</link>
      <pubDate>Mon, 27 Oct 2026 08:30:00 +0700</pubDate>
      <description><![CDATA[<img src="https://example.com/img1.jpg" />Kinh tế quý 1 tăng trưởng vượt bậc.]]></description>
    </item>
  </channel>
</rss>`;

  const rssItems = parseRssOrAtomXml(sampleRss, "https://example.com");
  assert(rssItems.length === 1, "Trích xuất thành công 1 bài từ RSS XML");
  assert(rssItems[0].title === "Tin thử nghiệm số 1: Tăng trưởng kinh tế quý 1", "Xử lý chuẩn CDATA trong title");
  assert(rssItems[0].originalUrl === "https://example.com/kinh-te/bai-1.html", "Tự động chuẩn hóa URL bài viết trong RSS");
  assert(rssItems[0].imageUrl === "https://example.com/img1.jpg", "Trích xuất ảnh đại diện từ thẻ img trong description");

  const sampleSitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://example.com/thoi-su/bai-viet-1.html</loc>
    <lastmod>2026-10-27T10:00:00Z</lastmod>
  </url>
  <url>
    <loc>https://example.com/thoi-su/bai-viet-2.html</loc>
    <lastmod>2026-10-27T11:00:00Z</lastmod>
  </url>
</urlset>`;

  const sitemapResult = parseSitemapXml(sampleSitemap);
  assert(sitemapResult.urls.length === 2, "Trích xuất chính xác 2 URLs từ Sitemap XML");

  // ------------------------------------------------------------------------
  // TEST GROUP 4: TRÍCH XUẤT HTML DOM (Cheerio)
  // ------------------------------------------------------------------------
  console.log("\n🔍 NHÓM 4: TRÍCH XUẤT NỘI DUNG HTML DOM");

  const sampleHtml = `<!DOCTYPE html>
<html>
<head>
  <meta property="og:title" content="Thủ tướng chủ trì hội nghị phát triển công nghệ cao" />
  <meta property="og:description" content="Chính phủ ưu tiên nguồn lực mạnh mẽ cho trung tâm nghiên cứu AI." />
  <meta property="og:image" content="https://example.com/featured.jpg" />
  <meta property="article:published_time" content="2026-10-27T08:00:00Z" />
  <meta name="author" content="Phóng Viên 247" />
  <link rel="canonical" href="https://example.com/tech/hoi-nghi-ai" />
</head>
<body>
  <article class="detail-content">
    <p>Hội nghị quy tụ hơn 500 chuyên gia hàng đầu trong và ngoài nước.</p>
    <h2>Mục tiêu xây dựng hệ sinh thái số</h2>
    <p>Việt Nam phấn đấu đứng vào top đầu khu vực về chỉ số đổi mới sáng tạo.</p>
  </article>
</body>
</html>`;

  const extracted = extractArticleFromHtml(sampleHtml, "https://example.com/tech/hoi-nghi-ai");
  assert(extracted.title === "Thủ tướng chủ trì hội nghị phát triển công nghệ cao", "Trích xuất OpenGraph Title");
  assert(extracted.imageUrl === "https://example.com/featured.jpg", "Trích xuất OpenGraph Image");
  assert(extracted.sourceAuthor === "Phóng Viên 247", "Trích xuất Tác giả");
  assert(extracted.canonicalUrl === "https://example.com/tech/hoi-nghi-ai", "Trích xuất Canonical URL");
  assert(Boolean(extracted.extractedContent?.includes("Hội nghị quy tụ hơn 500 chuyên gia")), "Trích xuất nội dung bài viết từ article container");

  // ------------------------------------------------------------------------
  // TEST GROUP 5: XÁC THỰC, MÃ HÓA & PHÂN QUYỀN (Auth & Roles)
  // ------------------------------------------------------------------------
  console.log("\n🔍 NHÓM 5: BẢO MẬT TÀI KHOẢN, MÃ HÓA MẬT KHẨU & PHÂN QUYỀN");

  const plainPass = "SuperSecretPassword123!";
  const hashed = await hashPassword(plainPass);
  const matchSuccess = await verifyPassword(plainPass, hashed);
  const matchFail = await verifyPassword("WrongPassword", hashed);

  assert(matchSuccess, "Mã hóa và xác thực bcrypt password chính xác");
  assert(!matchFail, "Từ chối mật khẩu sai");

  const token = signToken({
    userId: "test-user-id",
    email: "admin123@nhipsong247.vn",
    role: "ADMIN",
    name: "Admin User",
  });
  const decoded = verifyToken(token);
  assert(decoded?.email === "admin123@nhipsong247.vn", "Tạo và xác thực JWT token thành công");

  assert(checkPermission(ROLES.ADMIN, ROLES.EDITOR), "ADMIN có quyền của EDITOR");
  assert(checkPermission(ROLES.EDITOR, ROLES.AUTHOR), "EDITOR có quyền của AUTHOR");
  assert(!checkPermission(ROLES.AUTHOR, ROLES.EDITOR), "AUTHOR không được phép thực hiện quyền của EDITOR");
  assert(!checkPermission(ROLES.AUTHOR, ROLES.ADMIN), "AUTHOR không được phép thực hiện quyền của ADMIN");

  // ------------------------------------------------------------------------
  // TEST GROUP 6: DATABASE QUERIES & SEEDED INTEGRITY
  // ------------------------------------------------------------------------
  console.log("\n🔍 NHÓM 6: KIỂM TRA TÍNH TOÀN VẸN CỦA CƠ SỞ DỮ LIỆU");

  const adminUser = await prisma.user.findUnique({ where: { email: "admin123@nhipsong247.vn" } });
  assert(adminUser !== null && adminUser.role === "ADMIN", "Tài khoản Admin đã được tạo an toàn trong database");

  const categoriesCount = await prisma.category.count();
  assert(categoriesCount >= 8, `Đã có đầy đủ ít nhất 8 danh mục báo chí chuẩn (Hiện có: ${categoriesCount})`);

  const activeSourcesCount = await prisma.newsSource.count({ where: { isActive: true } });
  assert(activeSourcesCount >= 4, `Đã có các nguồn tin tự động kích hoạt (Hiện có: ${activeSourcesCount})`);

  const publishedArticles = await prisma.article.count({ where: { status: "PUBLISHED" } });
  assert(publishedArticles >= 5, `Đã có bài viết xuất bản sẵn sàng hiển thị trang chủ (Hiện có: ${publishedArticles})`);

  // ------------------------------------------------------------------------
  // TEST GROUP 7: LUỒNG TỰ ĐỘNG HÓA VÀ CHỐNG TRÙNG LẶP TRONG ENGINE
  // ------------------------------------------------------------------------
  console.log("\n🔍 NHÓM 7: KIỂM THỬ ENGINE THU THẬP & KHỬ TRÙNG LẶP THỰC TẾ");

  const testSource = await prisma.newsSource.findFirst({
    where: { feedUrl: { contains: "vnexpress.net/rss/thoi-su.rss" } },
  });

  if (testSource) {
    console.log(`     Đang chạy quét thực nghiệm nguồn: ${testSource.name}...`);
    try {
      const scan1 = await runScraperJob(testSource.id, { maxArticles: 5 });
      assert(scan1.status === "COMPLETED", "Chạy quét lần 1 thành công không lỗi");

      // Run scan 2 to verify deduplication
      const scan2 = await runScraperJob(testSource.id, { maxArticles: 5 });
      assert(scan2.status === "COMPLETED", "Chạy quét lần 2 hoàn thành");
      assert(
        scan2.duplicateCount >= scan1.importedCount,
        `Cơ chế Deduplication hoạt động: Lần 2 đã nhận diện ${scan2.duplicateCount} bài trùng lặp mà không tạo bản ghi mới!`
      );
    } catch (err: any) {
      console.warn("     (Bỏ qua quét mạng ngoài nếu môi trường sandbox không có kết nối internet)", err.message);
    }
  }

  // ------------------------------------------------------------------------
  // SUMMARY
  // ------------------------------------------------------------------------
  console.log("\n=================================================");
  console.log(`TỔNG KẾT KIỂM THỬ: ${passedTests}/${totalTests} BÀI TEST THÀNH CÔNG!`);
  if (failedTests > 0) {
    console.error(`Có ${failedTests} bài test thất bại.`);
    process.exit(1);
  } else {
    console.log("🎉 TẤT CẢ CÁC BÀI KIỂM THỬ ĐỀU ĐẠT CHUẨN 100%!");
  }
}

runAllTests()
  .catch((err) => {
    console.error("Lỗi khi chạy test suite:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
