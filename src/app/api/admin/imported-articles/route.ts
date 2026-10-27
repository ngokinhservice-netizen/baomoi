import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSessionUser, checkPermission, ROLES } from "@/lib/auth";
import { slugify } from "@/lib/utils";

export async function GET(req: NextRequest) {
  try {
    const session = await getSessionUser(req);
    if (!session || !checkPermission(session.role, ROLES.EDITOR)) {
      return NextResponse.json({ error: "Không có quyền truy cập." }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.max(1, Math.min(100, parseInt(searchParams.get("limit") || "20", 10)));
    const status = searchParams.get("status") || undefined;
    const sourceId = searchParams.get("sourceId") || undefined;

    const where: any = {};
    if (status && status !== "ALL") where.processingStatus = status;
    if (sourceId) where.sourceId = sourceId;

    const [total, items] = await Promise.all([
      prisma.scrapedArticle.count({ where }),
      prisma.scrapedArticle.findMany({
        where,
        include: {
          source: { select: { id: true, name: true, homepageUrl: true } },
          linkedArticle: { select: { id: true, title: true, slug: true, status: true } },
        },
        orderBy: { discoveredAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    return NextResponse.json({
      items,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Lỗi máy chủ" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const session = await getSessionUser(req);
    if (!session || !checkPermission(session.role, ROLES.EDITOR)) {
      return NextResponse.json({ error: "Không có quyền thực hiện." }, { status: 403 });
    }

    const body = await req.json();
    const { id, action, categoryId, customTitle, customContent, customExcerpt } = body;

    const scraped = await prisma.scrapedArticle.findUnique({
      where: { id },
      include: { source: true },
    });

    if (!scraped) {
      return NextResponse.json({ error: "Không tìm thấy bản ghi bài viết nhập." }, { status: 404 });
    }

    // Action 1: Approve to Draft
    if (action === "APPROVE_TO_DRAFT") {
      let catId = categoryId || scraped.source.defaultCategoryId;
      if (!catId) {
        const cat = await prisma.category.findFirst({ where: { isActive: true } });
        catId = cat?.id;
      }
      if (!catId) {
        return NextResponse.json({ error: "Vui lòng chọn danh mục cho bài viết." }, { status: 400 });
      }

      const title = customTitle || scraped.title;
      const slug = `${slugify(title)}-${Date.now().toString().slice(-4)}`;

      const article = await prisma.article.create({
        data: {
          title,
          slug,
          excerpt: customExcerpt || scraped.excerpt,
          content: customContent || scraped.extractedContent || `<p>${scraped.excerpt || ""}</p>`,
          featuredImage: scraped.imageUrl,
          imageCaption: scraped.imageCaption,
          authorId: session.userId,
          categoryId: catId,
          status: "DRAFT",
          sourceType: "IMPORTED",
          sourceUrl: scraped.originalUrl,
          sourceName: scraped.source.name,
          publishedAt: null,
        },
      });

      await prisma.scrapedArticle.update({
        where: { id: scraped.id },
        data: {
          processingStatus: "IMPORTED",
          linkedArticleId: article.id,
          processedAt: new Date(),
        },
      });

      return NextResponse.json({ success: true, article, message: "Đã chuyển vào Bản nháp thành công." });
    }

    // Action 2: Publish immediately
    if (action === "PUBLISH") {
      let catId = categoryId || scraped.source.defaultCategoryId;
      if (!catId) {
        const cat = await prisma.category.findFirst({ where: { isActive: true } });
        catId = cat?.id;
      }
      if (!catId) {
        return NextResponse.json({ error: "Vui lòng chọn danh mục cho bài viết." }, { status: 400 });
      }

      const title = customTitle || scraped.title;
      const slug = `${slugify(title)}-${Date.now().toString().slice(-4)}`;

      const article = await prisma.article.create({
        data: {
          title,
          slug,
          excerpt: customExcerpt || scraped.excerpt,
          content: customContent || scraped.extractedContent || `<p>${scraped.excerpt || ""}</p>`,
          featuredImage: scraped.imageUrl,
          imageCaption: scraped.imageCaption,
          authorId: session.userId,
          categoryId: catId,
          status: "PUBLISHED",
          sourceType: "IMPORTED",
          sourceUrl: scraped.originalUrl,
          sourceName: scraped.source.name,
          publishedAt: scraped.sourcePublishedAt || new Date(),
        },
      });

      await prisma.scrapedArticle.update({
        where: { id: scraped.id },
        data: {
          processingStatus: "PUBLISHED",
          permissionStatus: "VERIFIED",
          linkedArticleId: article.id,
          processedAt: new Date(),
        },
      });

      return NextResponse.json({ success: true, article, message: "Đã xuất bản bài viết thành công." });
    }

    // Action 3: Mark duplicate
    if (action === "MARK_DUPLICATE") {
      await prisma.scrapedArticle.update({
        where: { id: scraped.id },
        data: { processingStatus: "DUPLICATE", processedAt: new Date() },
      });
      return NextResponse.json({ success: true, message: "Đã đánh dấu trùng lặp." });
    }

    // Action 4: Ignore
    if (action === "IGNORE") {
      await prisma.scrapedArticle.update({
        where: { id: scraped.id },
        data: { processingStatus: "IGNORED", processedAt: new Date() },
      });
      return NextResponse.json({ success: true, message: "Đã bỏ qua bài viết." });
    }

    // Action 5: Retry
    if (action === "RETRY") {
      await prisma.scrapedArticle.update({
        where: { id: scraped.id },
        data: { processingStatus: "PENDING" },
      });
      return NextResponse.json({ success: true, message: "Đã đưa về hàng đợi xử lý." });
    }

    return NextResponse.json({ error: "Hành động không hợp lệ." }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Lỗi máy chủ" }, { status: 500 });
  }
}
