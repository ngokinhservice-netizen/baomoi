import React from "react";
import prisma from "@/lib/prisma";
import { formatDate } from "@/lib/utils";
import { Activity, ShieldAlert, CheckCircle, Info } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function AdminLogsPage() {
  const [scrapeLogs, auditLogs] = await Promise.all([
    prisma.scrapeLog.findMany({
      take: 40,
      orderBy: { createdAt: "desc" },
      include: { source: { select: { name: true } } },
    }),
    prisma.auditLog.findMany({
      take: 40,
      orderBy: { createdAt: "desc" },
      include: { user: { select: { name: true, email: true } } },
    }),
  ]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold font-serif text-gray-900">
          Nhật Ký Hệ Thống & Kiểm Tra An Ninh
        </h1>
        <p className="text-xs text-gray-500 mt-1">
          Theo dõi chi tiết các tiến trình quét nguồn tin tự động và lịch sử thao tác của ban biên tập.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Scrape Logs (7 cols) */}
        <div className="lg:col-span-7 bg-white p-5 rounded-xl border border-gray-200 shadow-2xs space-y-4">
          <h2 className="text-sm font-bold text-gray-900 flex items-center uppercase tracking-wide border-b border-gray-100 pb-2">
            <Activity className="w-4 h-4 text-primary mr-2" />
            Nhật Ký Quét Nguồn Tin (Scraper Logs)
          </h2>

          <div className="space-y-2.5 max-h-[600px] overflow-y-auto pr-1">
            {scrapeLogs.map((log) => (
              <div
                key={log.id}
                className={`p-3 rounded-lg border text-xs ${
                  log.level === "ERROR"
                    ? "bg-red-50 border-red-200 text-red-900"
                    : log.level === "WARN"
                    ? "bg-amber-50 border-amber-200 text-amber-900"
                    : "bg-gray-50 border-gray-100 text-gray-800"
                }`}
              >
                <div className="flex items-center justify-between font-semibold mb-1">
                  <span className="flex items-center">
                    <span
                      className={`w-2 h-2 rounded-full mr-2 ${
                        log.level === "ERROR"
                          ? "bg-red-600"
                          : log.level === "WARN"
                          ? "bg-amber-500"
                          : "bg-blue-500"
                      }`}
                    />
                    {log.source?.name || "Nguồn tin tự động"}
                  </span>
                  <span className="text-[10px] text-gray-500">
                    {formatDate(log.createdAt)}
                  </span>
                </div>
                <p className="text-[11px] leading-relaxed">{log.message}</p>
                {log.details && (
                  <pre className="mt-1.5 p-1.5 bg-black/5 rounded text-[10px] font-mono overflow-x-auto whitespace-pre-wrap">
                    {log.details}
                  </pre>
                )}
              </div>
            ))}
            {scrapeLogs.length === 0 && (
              <p className="text-xs text-gray-400 py-8 text-center">Chưa có nhật ký quét nguồn.</p>
            )}
          </div>
        </div>

        {/* Audit Logs (5 cols) */}
        <div className="lg:col-span-5 bg-white p-5 rounded-xl border border-gray-200 shadow-2xs space-y-4">
          <h2 className="text-sm font-bold text-gray-900 flex items-center uppercase tracking-wide border-b border-gray-100 pb-2">
            <ShieldAlert className="w-4 h-4 text-emerald-600 mr-2" />
            Nhật Ký Thao Tác (Audit Logs)
          </h2>

          <div className="space-y-2.5 max-h-[600px] overflow-y-auto pr-1">
            {auditLogs.map((log) => (
              <div key={log.id} className="p-3 bg-gray-50 border border-gray-200 rounded-lg text-xs">
                <div className="flex items-center justify-between font-bold text-gray-900 mb-0.5">
                  <span className="text-primary">{log.action}</span>
                  <span className="text-[10px] text-gray-400">
                    {formatDate(log.createdAt)}
                  </span>
                </div>
                <p className="text-[11px] text-gray-600">
                  Thực hiện bởi: <strong>{log.user?.name || "Hệ thống"}</strong> ({log.entityType})
                </p>
                {log.metadata && (
                  <div className="text-[10px] text-gray-500 mt-1 font-mono truncate">
                    {log.metadata}
                  </div>
                )}
              </div>
            ))}
            {auditLogs.length === 0 && (
              <p className="text-xs text-gray-400 py-8 text-center">Chưa có thao tác nào.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
