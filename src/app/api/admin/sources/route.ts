import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSessionUser, checkPermission, ROLES } from "@/lib/auth";
import { validateUrlForSsrf } from "@/lib/security";

export async function GET(req: NextRequest) {
  try {
    const session = await getSessionUser(req);
    if (!session || !checkPermission(session.role, ROLES.EDITOR)) {
      return NextResponse.json({ error: "Không có quyền truy cập." }, { status: 403 });
    }

    const sources = await prisma.newsSource.findMany({
      include: {
        defaultCategory: { select: { id: true, name: true } },
        _count: {
          select: {
            scrapedArticles: true,
            jobs: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ sources });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Lỗi máy chủ" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSessionUser(req);
    if (!session || !checkPermission(session.role, ROLES.ADMIN)) {
      return NextResponse.json({ error: "Chỉ Admin mới có quyền tạo nguồn tin." }, { status: 403 });
    }

    const body = await req.json();
    const {
      name,
      homepageUrl,
      feedUrl,
      sitemapUrl,
      defaultCategoryId,
      pollingIntervalMinutes = 30,
      scrapeMode = "EDITORIAL_QUEUE",
      customSelectors,
      isActive = true,
    } = body;

    if (!name || !homepageUrl) {
      return NextResponse.json({ error: "Tên nguồn và URL trang chủ là bắt buộc." }, { status: 400 });
    }

    // SSRF Validation for homepage
    const ssrfCheck = await validateUrlForSsrf(homepageUrl);
    if (!ssrfCheck.isValid) {
      return NextResponse.json({ error: `URL trang chủ không an toàn: ${ssrfCheck.reason}` }, { status: 400 });
    }

    // SSRF Validation for feedUrl if provided
    if (feedUrl) {
      const feedSsrf = await validateUrlForSsrf(feedUrl);
      if (!feedSsrf.isValid) {
        return NextResponse.json({ error: `Feed URL không an toàn: ${feedSsrf.reason}` }, { status: 400 });
      }
    }

    // SSRF Validation for sitemapUrl if provided
    if (sitemapUrl) {
      const sitemapSsrf = await validateUrlForSsrf(sitemapUrl);
      if (!sitemapSsrf.isValid) {
        return NextResponse.json({ error: `Sitemap URL không an toàn: ${sitemapSsrf.reason}` }, { status: 400 });
      }
    }

    const source = await prisma.newsSource.create({
      data: {
        name,
        homepageUrl: ssrfCheck.normalizedUrl || homepageUrl,
        feedUrl: feedUrl || null,
        sitemapUrl: sitemapUrl || null,
        defaultCategoryId: defaultCategoryId || null,
        pollingIntervalMinutes: Number(pollingIntervalMinutes),
        scrapeMode,
        customSelectors: customSelectors ? JSON.stringify(customSelectors) : null,
        isActive: Boolean(isActive),
      },
      include: {
        defaultCategory: true,
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: session.userId,
        action: "CREATE_NEWS_SOURCE",
        entityType: "NewsSource",
        entityId: source.id,
        metadata: JSON.stringify({ name: source.name, homepageUrl: source.homepageUrl }),
      },
    });

    return NextResponse.json({ success: true, source }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Lỗi máy chủ" }, { status: 500 });
  }
}
