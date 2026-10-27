import prisma from "../lib/prisma";
import { runScraperJob } from "../lib/scraper/engine";

let isRunning = false;
let isShuttingDown = false;

async function checkAndRunScheduledSources() {
  if (isRunning || isShuttingDown) return;
  isRunning = true;

  try {
    const now = new Date();
    const activeSources = await prisma.newsSource.findMany({
      where: { isActive: true },
    });

    for (const source of activeSources) {
      if (isShuttingDown) break;

      let isDue = false;
      if (!source.lastCheckedAt) {
        isDue = true;
      } else {
        const elapsedMinutes = (now.getTime() - new Date(source.lastCheckedAt).getTime()) / (1000 * 60);
        if (elapsedMinutes >= source.pollingIntervalMinutes) {
          isDue = true;
        }
      }

      if (isDue) {
        console.log(`[Worker] Khởi chạy quét định kỳ cho nguồn: "${source.name}" (ID: ${source.id})`);
        try {
          const res = await runScraperJob(source.id, { maxArticles: 15 });
          console.log(
            `[Worker] Hoàn tất quét "${source.name}": Mới: ${res.importedCount}, Trùng: ${res.duplicateCount}, Lỗi: ${res.failedCount}`
          );
        } catch (err: any) {
          console.error(`[Worker] Lỗi khi quét nguồn "${source.name}":`, err.message);
        }
      }
    }
  } catch (error: any) {
    console.error("[Worker] Lỗi vòng lặp quét nền:", error.message);
  } finally {
    isRunning = false;
  }
}

async function startWorker() {
  console.log("=================================================");
  console.log("   MTK NEWS — BACKGROUND SCRAPER WORKER RUNNING   ");
  console.log("=================================================");
  console.log("Chu kỳ kiểm tra: mỗi 60 giây.");
  console.log("Nhấn Ctrl+C để dừng worker an toàn.");

  // Run initial check
  await checkAndRunScheduledSources();

  // Polling loop
  const intervalId = setInterval(async () => {
    await checkAndRunScheduledSources();
  }, 60 * 1000);

  const shutdown = async () => {
    console.log("\n[Worker] Đang tắt worker an toàn...");
    isShuttingDown = true;
    clearInterval(intervalId);
    await prisma.$disconnect();
    console.log("[Worker] Đã ngắt kết nối database. Tạm biệt!");
    process.exit(0);
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

startWorker().catch((err) => {
  console.error("[Worker] Khởi động thất bại:", err);
  process.exit(1);
});
