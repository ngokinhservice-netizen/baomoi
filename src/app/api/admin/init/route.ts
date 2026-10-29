import { NextResponse } from "next/server";
import { syncAllLocalDataToDatabase } from "@/lib/importData";
import { cleanupDuplicateArticlesInDb } from "@/lib/dbCleanup";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const importedCount = await syncAllLocalDataToDatabase();
    const cleanupResult = await cleanupDuplicateArticlesInDb();
    return NextResponse.json({
      success: true,
      message: "Đồng bộ thành công dữ liệu từ máy tính sang Vercel Database & quét sạch bài trùng!",
      importedCount,
      cleanup: cleanupResult,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Lỗi đồng bộ" }, { status: 500 });
  }
}
