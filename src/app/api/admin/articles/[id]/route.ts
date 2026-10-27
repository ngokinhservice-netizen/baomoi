import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSessionUser, checkPermission, ROLES } from "@/lib/auth";
import { slugify } from "@/lib/utils";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getSessionUser(req);
    if (!session) {
      return NextResponse.json({ error: "Chưa đăng nhập." }, { status: 401 });
    }

    const article = await prisma.article.findUnique({
      where: { id: params.id },
      include: {
        category: true,
        author: { select: { id: true, name: true, email: true } },
        revisions: {
          include: { editor: { select: { id: true, name: true } } },
          orderBy: { createdAt: "desc" },
          take: 5,
        },
      },
    });

    if (!article) {
      return NextResponse.json({ error: "Không tìm thấy bài viết." }, { status: 404 });
    }

    if (session.role === ROLES.AUTHOR && article.authorId !== session.userId) {
      return NextResponse.json({ error: "Bạn không có quyền xem bài viết này." }, { status: 403 });
    }

    return NextResponse.json({ article });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Lỗi máy chủ" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getSessionUser(req);
    if (!session) {
      return NextResponse.json({ error: "Chưa đăng nhập." }, { status: 401 });
    }

    const existing = await prisma.article.findUnique({
      where: { id: params.id },
    });

    if (!existing) {
      return NextResponse.json({ error: "Không tìm thấy bài viết." }, { status: 404 });
    }

    if (session.role === ROLES.AUTHOR && existing.authorId !== session.userId) {
      return NextResponse.json({ error: "Bạn không có quyền chỉnh sửa bài viết này." }, { status: 403 });
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
      status,
      sourceType,
      sourceUrl,
      sourceName,
      seoTitle,
      seoDescription,
      isFeatured,
      publishedAt,
    } = body;

    // Check publication permission
    let finalStatus = status !== undefined ? status : existing.status;
    if (session.role === ROLES.AUTHOR && ["PUBLISHED", "SCHEDULED"].includes(finalStatus) && existing.status !== "PUBLISHED") {
      finalStatus = "PENDING";
    }

    // Slug update
    let finalSlug = existing.slug;
    if (customSlug && customSlug !== existing.slug) {
      finalSlug = slugify(customSlug);
      const slugClash = await prisma.article.findFirst({
        where: { slug: finalSlug, NOT: { id: existing.id } },
      });
      if (slugClash) {
        finalSlug = `${finalSlug}-${Date.now().toString().slice(-4)}`;
      }
    }

    // Save revision if content changed
    if (content !== undefined && content !== existing.content) {
      await prisma.articleRevision.create({
        data: {
          articleId: existing.id,
          editorId: session.userId,
          previousContent: existing.content,
          newContent: content,
        },
      });
    }

    const updated = await prisma.article.update({
      where: { id: existing.id },
      data: {
        title: title !== undefined ? title : existing.title,
        subtitle: subtitle !== undefined ? subtitle : existing.subtitle,
        slug: finalSlug,
        excerpt: excerpt !== undefined ? excerpt : existing.excerpt,
        content: content !== undefined ? content : existing.content,
        featuredImage: featuredImage !== undefined ? featuredImage : existing.featuredImage,
        imageCaption: imageCaption !== undefined ? imageCaption : existing.imageCaption,
        imageSource: imageSource !== undefined ? imageSource : existing.imageSource,
        categoryId: categoryId !== undefined ? categoryId : existing.categoryId,
        status: finalStatus,
        sourceType: sourceType !== undefined ? sourceType : existing.sourceType,
        sourceUrl: sourceUrl !== undefined ? sourceUrl : existing.sourceUrl,
        sourceName: sourceName !== undefined ? sourceName : existing.sourceName,
        seoTitle: seoTitle !== undefined ? seoTitle : existing.seoTitle,
        seoDescription: seoDescription !== undefined ? seoDescription : existing.seoDescription,
        isFeatured: isFeatured !== undefined ? Boolean(isFeatured) : existing.isFeatured,
        publishedAt:
          finalStatus === "PUBLISHED"
            ? existing.publishedAt || (publishedAt ? new Date(publishedAt) : new Date())
            : existing.publishedAt,
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
        action: "UPDATE_ARTICLE",
        entityType: "Article",
        entityId: updated.id,
        metadata: JSON.stringify({ title: updated.title, status: updated.status }),
      },
    });

    return NextResponse.json({ success: true, article: updated });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Lỗi máy chủ" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getSessionUser(req);
    if (!session) {
      return NextResponse.json({ error: "Chưa đăng nhập." }, { status: 401 });
    }

    const existing = await prisma.article.findUnique({
      where: { id: params.id },
    });

    if (!existing) {
      return NextResponse.json({ error: "Không tìm thấy bài viết." }, { status: 404 });
    }

    // Role check: Only Editor or Admin, or author deleting their own Draft
    if (session.role === ROLES.AUTHOR && (existing.authorId !== session.userId || existing.status === "PUBLISHED")) {
      return NextResponse.json({ error: "Bạn không có quyền xóa bài viết này." }, { status: 403 });
    }

    await prisma.article.delete({ where: { id: params.id } });

    await prisma.auditLog.create({
      data: {
        userId: session.userId,
        action: "DELETE_ARTICLE",
        entityType: "Article",
        entityId: params.id,
        metadata: JSON.stringify({ title: existing.title }),
      },
    });

    return NextResponse.json({ success: true, message: "Đã xóa bài viết thành công." });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Lỗi máy chủ" }, { status: 500 });
  }
}
