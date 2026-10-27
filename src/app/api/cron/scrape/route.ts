import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { runScraperJob } from "@/lib/scraper/engine";

export async function GET(req: NextRequest) {
  return handleCronScrape(req);
}

export async function POST(req: NextRequest) {
  return handleCronScrape(req);
}

async function handleCronScrape(req: NextRequest) {
  try {
    // Check authorization: Bearer CRON_SECRET or query ?secret=
    const authHeader = req.headers.get("authorization");
    const { searchParams } = new URL(req.url);
    const secretQuery = searchParams.get("secret");

    const validSecret = process.env.CRON_SECRET || "mtk-cron-secret-token-change-in-production";
    const isVercelCron = req.headers.get("x-vercel-cron") === "1" || req.headers.get("user-agent")?.includes("vercel-cron");

    const isAuthorized =
      isVercelCron ||
      (authHeader && authHeader === `Bearer ${validSecret}`) ||
      secretQuery === validSecret;

    if (!isAuthorized) {
      return NextResponse.json({ error: "Không được phép truy cập cron endpoint." }, { status: 401 });
    }

    const now = new Date();

    // Find active sources
    const activeSources = await prisma.newsSource.findMany({
      where: { isActive: true },
    });

    const sourcesDueForScraping = activeSources.filter((source) => {
      if (!source.lastCheckedAt) return true;
      const elapsedMinutes = (now.getTime() - new Date(source.lastCheckedAt).getTime()) / (1000 * 60);
      return elapsedMinutes >= source.pollingIntervalMinutes;
    });

    const results = [];

    // Process sequentially or with concurrency 2 to avoid overwhelming resources
    for (const source of sourcesDueForScraping) {
      try {
        const res = await runScraperJob(source.id, { maxArticles: 15 });
        results.push({ sourceId: source.id, name: source.name, result: res });
      } catch (err: any) {
        results.push({ sourceId: source.id, name: source.name, error: err.message });
      }
    }

    return NextResponse.json({
      success: true,
      totalActiveSources: activeSources.length,
      dueSourcesCount: sourcesDueForScraping.length,
      processed: results,
      timestamp: now.toISOString(),
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Lỗi cron" }, { status: 500 });
  }
}
