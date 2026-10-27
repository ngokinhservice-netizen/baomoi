import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSessionUser, checkPermission, ROLES } from "@/lib/auth";
import { validateUrlForSsrf } from "@/lib/security";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getSessionUser(req);
    if (!session || !checkPermission(session.role, ROLES.EDITOR)) {
      return NextResponse.json({ error: "Không có quyền truy cập." }, { status: 403 });
    }

    const source = await prisma.newsSource.findUnique({
      where: { id: params.id },
      include: {
        defaultCategory: true,
        jobs: {
          orderBy: { startedAt: "desc" },
          take: 10,
        },
        logs: {
          orderBy: { createdAt: "desc" },
          take: 30,
        },
      },
    });

    if (!source) {
      return NextResponse.json({ error: "Không tìm thấy nguồn tin." }, { status: 404 });
    }

    return NextResponse.json({ source });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Lỗi máy chủ" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getSessionUser(req);
    if (!session || !checkPermission(session.role, ROLES.ADMIN)) {
      return NextResponse.json({ error: "Chỉ Admin mới có quyền cập nhật nguồn tin." }, { status: 403 });
    }

    const existing = await prisma.newsSource.findUnique({ where: { id: params.id } });
    if (!existing) {
      return NextResponse.json({ error: "Nguồn tin không tồn tại." }, { status: 404 });
    }

    const body = await req.json();
    const {
      name,
      homepageUrl,
      feedUrl,
      sitemapUrl,
      defaultCategoryId,
      pollingIntervalMinutes,
      scrapeMode,
      customSelectors,
      isActive,
    } = body;

    // Validate URLs if changed
    if (homepageUrl && homepageUrl !== existing.homepageUrl) {
      const check = await validateUrlForSsrf(homepageUrl);
      if (!check.isValid) {
        return NextResponse.json({ error: `URL trang chủ không hợp lệ: ${check.reason}` }, { status: 400 });
      }
    }

    const updated = await prisma.newsSource.update({
      where: { id: params.id },
      data: {
        name: name !== undefined ? name : existing.name,
        homepageUrl: homepageUrl !== undefined ? homepageUrl : existing.homepageUrl,
        feedUrl: feedUrl !== undefined ? feedUrl : existing.feedUrl,
        sitemapUrl: sitemapUrl !== undefined ? sitemapUrl : existing.sitemapUrl,
        defaultCategoryId: defaultCategoryId !== undefined ? defaultCategoryId : existing.defaultCategoryId,
        pollingIntervalMinutes:
          pollingIntervalMinutes !== undefined ? Number(pollingIntervalMinutes) : existing.pollingIntervalMinutes,
        scrapeMode: scrapeMode !== undefined ? scrapeMode : existing.scrapeMode,
        customSelectors: customSelectors !== undefined ? JSON.stringify(customSelectors) : existing.customSelectors,
        isActive: isActive !== undefined ? Boolean(isActive) : existing.isActive,
      },
      include: {
        defaultCategory: true,
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: session.userId,
        action: "UPDATE_NEWS_SOURCE",
        entityType: "NewsSource",
        entityId: updated.id,
        metadata: JSON.stringify({ name: updated.name }),
      },
    });

    return NextResponse.json({ success: true, source: updated });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Lỗi máy chủ" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getSessionUser(req);
    if (!session || !checkPermission(session.role, ROLES.ADMIN)) {
      return NextResponse.json({ error: "Chỉ Admin mới có quyền xóa nguồn tin." }, { status: 403 });
    }

    await prisma.newsSource.delete({ where: { id: params.id } });

    await prisma.auditLog.create({
      data: {
        userId: session.userId,
        action: "DELETE_NEWS_SOURCE",
        entityType: "NewsSource",
        entityId: params.id,
      },
    });

    return NextResponse.json({ success: true, message: "Đã xóa nguồn tin thành công." });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Lỗi máy chủ" }, { status: 500 });
  }
}
