import { NextRequest, NextResponse } from "next/server";
import { getSessionUser, checkPermission, ROLES } from "@/lib/auth";
import { analyzeNewsSource } from "@/lib/scraper/analyzer";

export async function POST(req: NextRequest) {
  try {
    const session = await getSessionUser(req);
    if (!session || !checkPermission(session.role, ROLES.EDITOR)) {
      return NextResponse.json({ error: "Không có quyền thực hiện." }, { status: 403 });
    }

    const body = await req.json();
    const { url } = body;

    if (!url) {
      return NextResponse.json({ error: "Vui lòng nhập URL cần phân tích." }, { status: 400 });
    }

    const analysis = await analyzeNewsSource(url);
    return NextResponse.json({ success: true, analysis });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Lỗi khi phân tích URL" }, { status: 500 });
  }
}
