import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSessionUser, checkPermission, ROLES } from "@/lib/auth";
import { slugify } from "@/lib/utils";

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getSessionUser(req);
    if (!session || !checkPermission(session.role, ROLES.EDITOR)) {
      return NextResponse.json({ error: "Không có quyền thực hiện." }, { status: 403 });
    }

    const body = await req.json();
    const { name, slug: customSlug, description, imageUrl, parentId, sortOrder, isActive } = body;

    const existing = await prisma.category.findUnique({ where: { id: params.id } });
    if (!existing) {
      return NextResponse.json({ error: "Danh mục không tồn tại." }, { status: 404 });
    }

    let slug = existing.slug;
    if (customSlug && customSlug !== existing.slug) {
      slug = slugify(customSlug);
      const clash = await prisma.category.findFirst({
        where: { slug, NOT: { id: params.id } },
      });
      if (clash) {
        return NextResponse.json({ error: "Slug danh mục đã tồn tại." }, { status: 400 });
      }
    }

    const updated = await prisma.category.update({
      where: { id: params.id },
      data: {
        name: name !== undefined ? name : existing.name,
        slug,
        description: description !== undefined ? description : existing.description,
        imageUrl: imageUrl !== undefined ? imageUrl : existing.imageUrl,
        parentId: parentId !== undefined ? parentId : existing.parentId,
        sortOrder: sortOrder !== undefined ? Number(sortOrder) : existing.sortOrder,
        isActive: isActive !== undefined ? Boolean(isActive) : existing.isActive,
      },
    });

    return NextResponse.json({ success: true, category: updated });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Lỗi máy chủ" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getSessionUser(req);
    if (!session || !checkPermission(session.role, ROLES.ADMIN)) {
      return NextResponse.json({ error: "Chỉ Admin mới có quyền xóa danh mục." }, { status: 403 });
    }

    // Check relationship constraints
    const articleCount = await prisma.article.count({ where: { categoryId: params.id } });
    if (articleCount > 0) {
      return NextResponse.json(
        { error: `Không thể xóa danh mục này vì đang có ${articleCount} bài viết thuộc danh mục.` },
        { status: 400 }
      );
    }

    await prisma.category.delete({ where: { id: params.id } });
    return NextResponse.json({ success: true, message: "Đã xóa danh mục thành công." });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Lỗi máy chủ" }, { status: 500 });
  }
}
