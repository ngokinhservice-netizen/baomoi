import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { runAiAssistant } from "@/lib/ai/assistant";

export async function POST(req: NextRequest) {
  try {
    const session = await getSessionUser(req);
    if (!session) {
      return NextResponse.json({ error: "Chưa đăng nhập." }, { status: 401 });
    }

    const body = await req.json();
    const { title, content, excerpt, category, task = "all" } = body;

    if (!content && !title) {
      return NextResponse.json({ error: "Vui lòng cung cấp tiêu đề hoặc nội dung cần hỗ trợ." }, { status: 400 });
    }

    const result = await runAiAssistant({
      title,
      content: content || "",
      excerpt,
      category,
      task,
    });

    return NextResponse.json({ success: true, result });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Lỗi AI Assistant" }, { status: 500 });
  }
}
