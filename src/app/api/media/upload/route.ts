import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import prisma from "@/lib/prisma";
import fs from "fs/promises";
import path from "path";
import crypto from "crypto";

const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

export async function POST(req: NextRequest) {
  try {
    const session = await getSessionUser(req);
    if (!session) {
      return NextResponse.json({ error: "Chưa đăng nhập." }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const altText = (formData.get("altText") as string) || "";
    const caption = (formData.get("caption") as string) || "";

    if (!file) {
      return NextResponse.json({ error: "Vui lòng chọn tệp hình ảnh để tải lên." }, { status: 400 });
    }

    // 1. MIME type validation
    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: `Định dạng tệp không được hỗ trợ (${file.type}). Chỉ chấp nhận JPG, PNG, WEBP, GIF.` },
        { status: 400 }
      );
    }

    // 2. File size validation
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "Kích thước tệp vượt quá giới hạn 5MB." },
        { status: 400 }
      );
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // 3. Local upload directory
    const uploadsDir = path.join(process.cwd(), "public", "uploads");
    await fs.mkdir(uploadsDir, { recursive: true });

    // Generate safe unique filename
    const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const hash = crypto.randomBytes(12).toString("hex");
    const filename = `${Date.now()}-${hash}.${ext}`;
    const filePath = path.join(uploadsDir, filename);

    await fs.writeFile(filePath, buffer);

    const storageUrl = `/uploads/${filename}`;

    // 4. Save metadata to Media table in Database
    const media = await prisma.media.create({
      data: {
        storageUrl,
        originalUrl: file.name,
        mimeType: file.type,
        fileSize: file.size,
        altText,
        caption,
        sourceName: "MTK Upload",
        licenseStatus: "VERIFIED",
      },
    });

    return NextResponse.json({
      success: true,
      url: storageUrl,
      media,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Lỗi khi tải ảnh lên" }, { status: 500 });
  }
}
