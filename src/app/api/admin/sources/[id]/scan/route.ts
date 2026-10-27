import { NextRequest, NextResponse } from "next/server";
import { getSessionUser, checkPermission, ROLES } from "@/lib/auth";
import { runScraperJob } from "@/lib/scraper/engine";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getSessionUser(req);
    if (!session || !checkPermission(session.role, ROLES.EDITOR)) {
      return NextResponse.json({ error: "Không có quyền thực hiện." }, { status: 403 });
    }

    const { maxArticles } = (await req.json().catch(() => ({}))) || {};

    // Execute scraper job
    const result = await runScraperJob(params.id, {
      maxArticles: maxArticles ? Number(maxArticles) : 15,
    });

    return NextResponse.json({ success: true, result });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Lỗi khi quét nguồn" }, { status: 500 });
  }
}
