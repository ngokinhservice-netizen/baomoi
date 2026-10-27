import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Đang khởi tạo dữ liệu mẫu cho MTK NEWS...");

  // 1. Tạo tài khoản Quản trị viên & Biên tập viên
  const adminPasswordHash = await bcrypt.hash("Admin@MTK2026Password!", 10);
  const admin = await prisma.user.upsert({
    where: { email: "admin@mtknews.vn" },
    update: {},
    create: {
      name: "Ban Quản Trị MTK",
      email: "admin@mtknews.vn",
      passwordHash: adminPasswordHash,
      role: "ADMIN",
      isActive: true,
    },
  });

  const editorPasswordHash = await bcrypt.hash("Editor@MTK2026Password!", 10);
  const editor = await prisma.user.upsert({
    where: { email: "editor@mtknews.vn" },
    update: {},
    create: {
      name: "Nguyễn Văn Biên Tập",
      email: "editor@mtknews.vn",
      passwordHash: editorPasswordHash,
      role: "EDITOR",
      isActive: true,
    },
  });

  console.log("✅ Đã tạo tài khoản quản trị:");
  console.log("   - Admin:  admin@mtknews.vn  /  Admin@MTK2026Password!");
  console.log("   - Editor: editor@mtknews.vn /  Editor@MTK2026Password!");

  // 2. Tạo 8 danh mục báo chí chuẩn mực
  const categoriesData = [
    { name: "Thời sự", slug: "thoi-su", description: "Tin tức chính trị, xã hội, sự kiện nổi bật trong nước", sortOrder: 1 },
    { name: "Thế giới", slug: "the-gioi", description: "Thời sự quốc tế, phân tích chiến lược toàn cầu", sortOrder: 2 },
    { name: "Kinh doanh", slug: "kinh-doanh", description: "Kinh tế vĩ mô, thị trường tài chính, chứng khoán, bất động sản", sortOrder: 3 },
    { name: "Công nghệ", slug: "cong-nghe", description: "Trí tuệ nhân tạo, thiết bị số, chuyển đổi số, an ninh mạng", sortOrder: 4 },
    { name: "Giáo dục", slug: "giao-duc", description: "Chính sách giáo dục, tuyển sinh, hướng nghiệp, học đường", sortOrder: 5 },
    { name: "Đời sống", slug: "doi-song", description: "Sức khỏe, gia đình, ẩm thực, du lịch và phong cách sống", sortOrder: 6 },
    { name: "Thể thao", slug: "the-thao", description: "Bóng đá Việt Nam, Ngoại hạng Anh, thể thao trong nước và quốc tế", sortOrder: 7 },
    { name: "Giải trí", slug: "giai-tri", description: "Điện ảnh, âm nhạc, nghệ thuật và văn hóa đại chúng", sortOrder: 8 },
  ];

  const createdCategories: Record<string, string> = {};

  for (const cat of categoriesData) {
    const record = await prisma.category.upsert({
      where: { slug: cat.slug },
      update: { name: cat.name, description: cat.description, sortOrder: cat.sortOrder },
      create: { ...cat, isActive: true },
    });
    createdCategories[cat.slug] = record.id;
  }
  console.log("✅ Đã khởi tạo 8 chuyên mục tin tức báo chí.");

  // 3. Tạo các nguồn tin tức tự động uy tín để quét thử nghiệm
  const sourcesData = [
    {
      name: "VnExpress - Thời sự",
      homepageUrl: "https://vnexpress.net",
      feedUrl: "https://vnexpress.net/rss/thoi-su.rss",
      defaultCategoryId: createdCategories["thoi-su"],
      pollingIntervalMinutes: 15,
      scrapeMode: "EDITORIAL_QUEUE",
    },
    {
      name: "Tuổi Trẻ - Thời sự",
      homepageUrl: "https://tuoitre.vn",
      feedUrl: "https://tuoitre.vn/rss/thoi-su.rss",
      defaultCategoryId: createdCategories["thoi-su"],
      pollingIntervalMinutes: 30,
      scrapeMode: "EDITORIAL_QUEUE",
    },
    {
      name: "Dân Trí - Sự kiện",
      homepageUrl: "https://dantri.com.vn",
      feedUrl: "https://dantri.com.vn/rss/su-kien.rss",
      defaultCategoryId: createdCategories["thoi-su"],
      pollingIntervalMinutes: 30,
      scrapeMode: "EDITORIAL_QUEUE",
    },
    {
      name: "VnExpress - Số hóa Công nghệ",
      homepageUrl: "https://vnexpress.net/so-hoa",
      feedUrl: "https://vnexpress.net/rss/so-hoa.rss",
      defaultCategoryId: createdCategories["cong-nghe"],
      pollingIntervalMinutes: 30,
      scrapeMode: "CITATION",
    },
  ];

  for (const src of sourcesData) {
    const existing = await prisma.newsSource.findFirst({
      where: { feedUrl: src.feedUrl },
    });
    if (!existing) {
      await prisma.newsSource.create({
        data: { ...src, isActive: true },
      });
    }
  }
  console.log("✅ Đã cấu hình các nguồn tin RSS mẫu chuẩn.");

  // 4. Tạo bài viết mẫu xuất bản sẵn sàng hiển thị trên trang chủ
  const sampleArticles = [
    {
      title: "Chính phủ đẩy mạnh hạ tầng giao thông kết nối liên vùng trọng điểm",
      subtitle: "Quyết tâm hoàn thành mạng lưới cao tốc chiến lược trước niên hạn",
      slug: "chinh-phu-day-manh-ha-tang-giao-thong-ket-noi-lien-vung-trong-diem",
      excerpt: "Nhiều dự án giao thông trọng điểm quốc gia đang được tăng tốc thi công ngày đêm, tạo động lực phát triển đột phá cho các vùng kinh tế trọng điểm.",
      content: `<p>Thủ tướng Chính phủ vừa có chỉ đạo khẩn trương tháo gỡ khó khăn về vật liệu xây dựng, giải phóng mặt bằng để các dự án đường bộ cao tốc trọng điểm hoàn thành đúng tiến độ cam kết.</p>
<h2>Đẩy nhanh tiến độ thi công 3 ca 4 kíp</h2>
<p>Tại các công trường từ Bắc vào Nam, hàng nghìn kỹ sư và công nhân đang bám sát công trình xuyên suốt các ngày nghỉ cuối tuần nhằm đảm bảo tiến độ thông xe.</p>
<blockquote>Hạ tầng giao thông đi trước mở đường sẽ kiến tạo không gian phát triển mới cho doanh nghiệp và nhân dân.</blockquote>
<p>Việc kết nối hạ tầng đồng bộ không chỉ rút ngắn thời gian lưu thông giữa các tỉnh thành mà còn giảm chi phí logistics đáng kể cho hàng hóa xuất khẩu Việt Nam.</p>`,
      featuredImage: "https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=1200&q=80",
      imageCaption: "Thi công đại lộ giao thông trọng điểm huyết mạch quốc gia",
      imageSource: "MTK / TTXVN",
      categoryId: createdCategories["thoi-su"],
      authorId: admin.id,
      status: "PUBLISHED",
      isFeatured: true,
      publishedAt: new Date(Date.now() - 3600 * 1000 * 2), // 2 hours ago
    },
    {
      title: "Xu hướng ứng dụng Trí tuệ nhân tạo (AI) bùng nổ trong quản trị doanh nghiệp Việt",
      subtitle: "Từ mô hình ngôn ngữ lớn đến tự động hóa quy trình nghiệp vụ",
      slug: "xu-huong-ung-dung-ai-bung-no-trong-quan-tri-doanh-nghiep-viet",
      excerpt: "Năm 2026 đánh dấu bước chuyển mạnh mẽ khi hơn 65% tập đoàn, doanh nghiệp quy mô vừa và lớn tại Việt Nam chính thức ứng dụng AI vào vận hành thực tế.",
      content: `<p>Theo báo cáo khảo sát mới nhất của Hiệp hội Công nghệ, việc ứng dụng AI không còn dừng lại ở mức thử nghiệm mà đã đi vào thực tiễn sản xuất kinh doanh, marketing và dịch vụ khách hàng.</p>
<h2>Tối ưu hóa năng suất và giảm chi phí vận hành</h2>
<p>Nhiều ngân hàng và doanh nghiệp thương mại điện tử đã tự động hóa hơn 80% yêu cầu chăm sóc khách hàng thông qua trợ lý ảo AI thông minh, nâng cao sự hài lòng của người dùng.</p>
<p>Tuy nhiên, các chuyên gia khuyến cáo doanh nghiệp cần chú trọng vấn đề bảo mật dữ liệu khách hàng và xây dựng khung đạo đức AI minh bạch.</p>`,
      featuredImage: "https://images.unsplash.com/photo-1677442136019-21780ecad995?w=1200&q=80",
      imageCaption: "Các trung tâm tính toán dữ liệu AI hiện đại",
      imageSource: "Unsplash / TechWorld",
      categoryId: createdCategories["cong-nghe"],
      authorId: editor.id,
      status: "PUBLISHED",
      isFeatured: true,
      publishedAt: new Date(Date.now() - 3600 * 1000 * 5),
    },
    {
      title: "Thị trường xuất khẩu nông sản bứt phá mạnh mẽ trong quý đầu năm",
      subtitle: "Gạo, cà phê và sầu riêng ghi nhận mức tăng trưởng kỷ lục",
      slug: "thi-truong-xuat-khau-nong-san-but-pha-manh-me",
      excerpt: "Kim ngạch xuất khẩu nông, lâm, thủy sản đạt mức kỷ lục mới nhờ chất lượng đáp ứng các tiêu chuẩn khắt khe từ thị trường châu Âu và Bắc Mỹ.",
      content: `<p>Nông nghiệp tiếp tục khẳng định vai trò trụ đỡ vững chắc của nền kinh tế với nhiều mặt hàng chủ lực đạt giá trị xuất khẩu cao chưa từng có.</p>
<h2>Tiêu chuẩn xanh và phát triển bền vững</h2>
<p>Việc đẩy mạnh vùng trồng đạt chuẩn VietGAP, GlobalGAP và kiểm soát mã số vùng trồng đã giúp nông sản Việt Nam thâm nhập sâu vào các hệ thống siêu thị cao cấp quốc tế.</p>`,
      featuredImage: "https://images.unsplash.com/photo-1500937386664-56d1dfef3854?w=1200&q=80",
      imageCaption: "Thu hoạch nông sản xuất khẩu tiêu chuẩn chất lượng cao",
      imageSource: "Bộ Nông nghiệp / Tư liệu",
      categoryId: createdCategories["kinh-doanh"],
      authorId: admin.id,
      status: "PUBLISHED",
      isFeatured: false,
      publishedAt: new Date(Date.now() - 3600 * 1000 * 8),
    },
    {
      title: "Đội tuyển Quốc gia bước vào giai đoạn tập huấn quyết định trước giải vô địch",
      subtitle: "Huấn luyện viên trưởng chốt danh sách chiến thuật mới",
      slug: "doi-tuyen-quoc-gia-buoc-vao-giai-doan-tap-huan-quyet-dinh",
      excerpt: "Toàn đội thể hiện quyết tâm cao độ và tinh thần đoàn kết trong buổi tập chiến thuật khép kín sáng nay.",
      content: `<p>Đội tuyển bóng đá nam quốc gia đã có buổi rèn quân tích cực với giáo án thể lực kết hợp phối hợp nhóm nhỏ tốc độ cao.</p>
<p>Người hâm mộ cả nước đang đặt nhiều kỳ vọng vào lứa cầu thủ trẻ tài năng trong giải đấu quốc tế sắp tới.</p>`,
      featuredImage: "https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=1200&q=80",
      imageCaption: "Các tuyển thủ tập luyện với quyết tâm cao",
      imageSource: "VFF / Thể thao MTK",
      categoryId: createdCategories["the-thao"],
      authorId: editor.id,
      status: "PUBLISHED",
      isFeatured: false,
      publishedAt: new Date(Date.now() - 3600 * 1000 * 12),
    },
    {
      title: "Hội nghị Thượng đỉnh Khí hậu toàn cầu đạt đồng thuận lịch sử về chuyển đổi năng lượng xanh",
      subtitle: "Hơn 120 quốc gia cam kết cắt giảm mạnh phát thải khí nhà kính",
      slug: "hoi-nghi-thuong-dinh-khi-hau-dat-dong-thuan-lich-su",
      excerpt: "Thỏa thuận vừa được thông qua kêu gọi tăng tốc đầu tư vào năng lượng tái tạo và hỗ trợ tài chính cho các nước đang phát triển.",
      content: `<p>Sau nhiều ngày đàm phán căng thẳng, các phái đoàn quốc tế đã đạt được thỏa thuận chung mang tính bước ngoặt nhằm kiềm chế nhiệt độ toàn cầu không tăng quá 1.5 độ C.</p>`,
      featuredImage: "https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=1200&q=80",
      imageCaption: "Hành tinh xanh và mục tiêu bảo vệ khí hậu chung",
      imageSource: "Reuters / AFP",
      categoryId: createdCategories["the-gioi"],
      authorId: admin.id,
      status: "PUBLISHED",
      isFeatured: false,
      publishedAt: new Date(Date.now() - 3600 * 1000 * 15),
    },
  ];

  for (const art of sampleArticles) {
    await prisma.article.upsert({
      where: { slug: art.slug },
      update: {},
      create: art,
    });
  }
  console.log("✅ Đã khởi tạo các bài viết mẫu sẵn sàng hiển thị trên trang chủ.");

  // 5. Cấu hình mặc định Site Settings
  const defaultSettings = [
    { key: "siteName", value: "MTK NEWS" },
    { key: "siteDescription", value: "Báo điện tử tin tức thời sự hàng đầu Việt Nam và Quốc tế" },
    { key: "contactEmail", value: "toasoan@mtknews.vn" },
    { key: "footerText", value: "© 2026 MTK NEWS. Cơ quan ngôn luận và xuất bản tin tức điện tử." },
    { key: "articlesPerPage", value: "12" },
  ];

  for (const set of defaultSettings) {
    await prisma.siteSetting.upsert({
      where: { key: set.key },
      update: {},
      create: set,
    });
  }
  console.log("✅ Đã khởi tạo cài đặt hệ thống MTK NEWS.");
  console.log("🎉 Hoàn tất nạp dữ liệu mẫu thành công!");
}

main()
  .catch((e) => {
    console.error("❌ Lỗi seed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
