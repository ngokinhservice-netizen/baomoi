import { NextResponse } from "next/server";
import { syncAllLocalDataToDatabase } from "@/lib/importData";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const importedCount = await syncAllLocalDataToDatabase();
    return NextResponse.json({
      success: true,
      message: "Đồng bộ thành công dữ liệu từ máy tính sang Vercel Database!",
      importedCount,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Lỗi đồng bộ" }, { status: 500 });
  }
}
