import { NextResponse } from "next/server";
import { cleanupDuplicateArticlesInDb } from "@/lib/dbCleanup";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const result = await cleanupDuplicateArticlesInDb();
    return NextResponse.json({
      success: true,
      message: "Đã quét và dọn sạch toàn bộ bài viết trùng lặp thành công!",
      result,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Lỗi dọn bài trùng" }, { status: 500 });
  }
}
