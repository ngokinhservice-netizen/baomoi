import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSessionUser, checkPermission, ROLES } from "@/lib/auth";

export async function GET() {
  try {
    const settings = await prisma.siteSetting.findMany();
    const settingsMap: Record<string, string> = {
      siteName: "NHỊP SỐNG 247",
      siteDescription: "Báo điện tử tin tức thời sự hàng đầu Việt Nam và Quốc tế - Cập nhật liên tục 24/7",
      contactEmail: "toasoan@nhipsong247.vn",
      logoText: "NHỊP SỐNG 247",
      footerText: "© 2026 NHỊP SỐNG 247. Toàn bộ bản quyền thuộc về Báo điện tử Nhịp Sống 247.",
      defaultScrapeMode: "EDITORIAL_QUEUE",
      enableAiAssistant: "true",
      articlesPerPage: "12",
    };

    for (const s of settings) {
      settingsMap[s.key] = s.value;
    }

    return NextResponse.json({ settings: settingsMap });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Lỗi máy chủ" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSessionUser(req);
    if (!session || !checkPermission(session.role, ROLES.ADMIN)) {
      return NextResponse.json({ error: "Chỉ Admin mới có quyền cập nhật cài đặt." }, { status: 403 });
    }

    const body = await req.json();

    for (const [key, value] of Object.entries(body)) {
      if (typeof value === "string") {
        await prisma.siteSetting.upsert({
          where: { key },
          create: { key, value },
          update: { value },
        });
      }
    }

    await prisma.auditLog.create({
      data: {
        userId: session.userId,
        action: "UPDATE_SITE_SETTINGS",
        entityType: "SiteSetting",
      },
    });

    return NextResponse.json({ success: true, message: "Đã lưu cài đặt website thành công." });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Lỗi máy chủ" }, { status: 500 });
  }
}
