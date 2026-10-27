import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSessionUser, checkPermission, ROLES } from "@/lib/auth";
import { slugify } from "@/lib/utils";

export async function GET(req: NextRequest) {
  try {
    const session = await getSessionUser(req);
    if (!session) {
      return NextResponse.json({ error: "Chưa đăng nhập." }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.max(1, Math.min(100, parseInt(searchParams.get("limit") || "15", 10)));
    const categoryId = searchParams.get("categoryId") || undefined;
    const status = searchParams.get("status") || undefined;
    const search = searchParams.get("search") || undefined;

    const where: any = {};
    if (categoryId) where.categoryId = categoryId;
    if (status) where.status = status;
    if (search) {
      where.OR = [
        { title: { contains: search } },
        { excerpt: { contains: search } },
      ];
    }

    // Authors can only see their own articles unless they are Editor or Admin
    if (session.role === ROLES.AUTHOR) {
      where.authorId = session.userId;
    }

    const [total, articles] = await Promise.all([
      prisma.article.count({ where }),
      prisma.article.findMany({
        where,
        include: {
          category: { select: { id: true, name: true, slug: true } },
          author: { select: { id: true, name: true, email: true } },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    return NextResponse.json({
      articles,
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

export async function POST(req: NextRequest) {
  try {
    const session = await getSessionUser(req);
    if (!session) {
      return NextResponse.json({ error: "Chưa đăng nhập." }, { status: 401 });
    }

    const body = await req.json();
    const {
      title,
      subtitle,
      slug: customSlug,
      excerpt,
      content,
      featuredImage,
      imageCaption,
      imageSource,
      categoryId,
      status = "DRAFT",
      sourceType = "ORIGINAL",
      sourceUrl,
      sourceName,
      seoTitle,
      seoDescription,
      isFeatured = false,
      publishedAt,
    } = body;

    if (!title || !categoryId) {
      return NextResponse.json({ error: "Tiêu đề và chuyên mục là bắt buộc." }, { status: 400 });
    }

    // Role check: Author can only create DRAFT or PENDING, cannot directly publish unless Editor/Admin
    let finalStatus = status;
    if (session.role === ROLES.AUTHOR && ["PUBLISHED", "SCHEDULED"].includes(status)) {
      finalStatus = "PENDING";
    }

    const baseSlug = customSlug ? slugify(customSlug) : slugify(title);
    let finalSlug = baseSlug;

    // Check slug uniqueness
    const existing = await prisma.article.findUnique({ where: { slug: finalSlug } });
    if (existing) {
      finalSlug = `${baseSlug}-${Date.now().toString().slice(-4)}`;
    }

    const article = await prisma.article.create({
      data: {
        title,
        subtitle,
        slug: finalSlug,
        excerpt,
        content: content || "",
        featuredImage,
        imageCaption,
        imageSource,
        authorId: session.userId,
        categoryId,
        status: finalStatus,
        sourceType,
        sourceUrl,
        sourceName,
        seoTitle: seoTitle || title,
        seoDescription: seoDescription || excerpt,
        isFeatured: Boolean(isFeatured),
        publishedAt: finalStatus === "PUBLISHED" ? (publishedAt ? new Date(publishedAt) : new Date()) : null,
      },
      include: {
        category: true,
        author: true,
      },
    });

    // Audit log
    await prisma.auditLog.create({
      data: {
        userId: session.userId,
        action: "CREATE_ARTICLE",
        entityType: "Article",
        entityId: article.id,
        metadata: JSON.stringify({ title: article.title, status: article.status }),
      },
    });

    return NextResponse.json({ success: true, article }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Lỗi máy chủ" }, { status: 500 });
  }
}
