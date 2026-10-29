"use client";

import { useEffect } from "react";

export default function AutoSyncTrigger() {
  useEffect(() => {
    try {
      const STORAGE_KEY = "nhipsong247_last_auto_sync";
      const INTERVAL = 10 * 60 * 1000; // 10 phút

      const lastSync = localStorage.getItem(STORAGE_KEY);
      const now = Date.now();

      if (!lastSync || now - parseInt(lastSync, 10) > INTERVAL) {
        localStorage.setItem(STORAGE_KEY, now.toString());

        // Kích hoạt đồng bộ tin tức ngầm từ VnExpress
        fetch("/api/cron/scrape?secret=mtk-cron-secret-token-change-in-production&force=true", {
          method: "GET",
          headers: { "Content-Type": "application/json" },
        })
          .then((res) => {
            if (res.ok) {
              console.log("[NHỊP SỐNG 247] Đã cập nhật tin tức VnExpress mới nhất tự động.");
            }
          })
          .catch(() => {
            // im lặng bỏ qua nếu có lỗi mạng
          });
      }
    } catch {
      // Bỏ qua lỗi trình duyệt
    }
  }, []);

  return null;
}
