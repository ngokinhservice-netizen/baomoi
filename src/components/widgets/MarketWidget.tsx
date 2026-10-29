"use client";

import React, { useState } from "react";
import { ChevronRight, TrendingUp, DollarSign, Fuel, PiggyBank, RefreshCw } from "lucide-react";

export default function MarketWidget() {
  const [activeTab, setActiveTab] = useState<"summary" | "gold" | "fuel" | "bank">("summary");

  return (
    <div className="w-full bg-[#181818] text-gray-200 rounded-xl p-3 sm:p-4 shadow-md border border-neutral-800 font-sans text-xs my-6">
      {/* Header bar */}
      <div className="flex items-center justify-between pb-2.5 mb-3 border-b border-neutral-800">
        <div className="flex items-center space-x-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          <h3 className="font-bold text-white text-xs sm:text-sm uppercase tracking-wide flex items-center">
            <TrendingUp className="w-4 h-4 mr-1.5 text-amber-400" />
            Thị trường & Tài chính hôm nay
          </h3>
        </div>
        <div className="flex items-center space-x-2 text-[11px] text-neutral-400">
          <span className="hidden sm:inline">Cập nhật lúc 15:00 hôm nay</span>
        </div>
      </div>

      {/* Top Grid: Fuel & Gold (2 cards) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
        {/* 1. Xăng dầu */}
        <div className="bg-[#222222] hover:bg-[#282828] transition-colors p-3 rounded-lg border border-neutral-750 flex flex-col justify-between">
          <div className="space-y-2">
            {/* Row 1: E10 RON 95-III */}
            <div className="flex items-center justify-between">
              <span className="font-bold text-white tracking-tight">E10 RON 95-III</span>
              <div className="flex items-center space-x-2">
                <span className="font-extrabold text-white text-sm">25.730</span>
                <span className="text-rose-500 font-bold text-[11px] bg-rose-950/60 px-1.5 py-0.5 rounded">
                  +520
                </span>
                <span className="text-[11px] text-neutral-400 min-w-[50px] text-right">VND/lít</span>
              </div>
            </div>

            {/* Row 2: Dầu diesel */}
            <div className="flex items-center justify-between pt-1 border-t border-neutral-800/80">
              <span className="font-bold text-white tracking-tight">Dầu diesel</span>
              <div className="flex items-center space-x-2">
                <span className="font-extrabold text-white text-sm">30.240</span>
                <span className="text-rose-500 font-bold text-[11px] bg-rose-950/60 px-1.5 py-0.5 rounded">
                  +690
                </span>
                <span className="text-[10px] text-neutral-400 flex items-center min-w-[50px] justify-end">
                  Từ 15:00
                  <ChevronRight className="w-3.5 h-3.5 ml-0.5 text-neutral-500" />
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* 2. Giá Vàng */}
        <div className="bg-[#222222] hover:bg-[#282828] transition-colors p-3 rounded-lg border border-neutral-750 flex flex-col justify-between">
          <div className="space-y-2">
            {/* Row 1: Vàng thế giới */}
            <div className="flex items-center justify-between">
              <span className="font-bold text-amber-300 tracking-tight">Vàng thế giới</span>
              <div className="flex items-center space-x-2 text-[11px]">
                <span className="text-neutral-400">Mua:</span>
                <span className="font-bold text-white text-sm">4.008,7</span>
                <span className="text-neutral-400">Bán:</span>
                <span className="font-bold text-white text-sm">4.010,7</span>
                <span className="text-[10px] text-neutral-400 flex items-center">
                  USD/oz
                  <ChevronRight className="w-3.5 h-3.5 ml-0.5 text-neutral-500" />
                </span>
              </div>
            </div>

            {/* Row 2: Vàng SJC */}
            <div className="flex items-center justify-between pt-1 border-t border-neutral-800/80">
              <span className="font-bold text-amber-300 tracking-tight">Vàng SJC</span>
              <div className="flex items-center space-x-2 text-[11px]">
                <span className="text-neutral-400">Mua:</span>
                <span className="font-bold text-white text-sm">139,7</span>
                <span className="text-neutral-400">Bán:</span>
                <span className="font-bold text-white text-sm">142,7</span>
                <span className="text-[10px] text-neutral-400 min-w-[55px] text-right">tr.đ/lượng</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Bar: Tiết kiệm tại quầy */}
      <div className="bg-[#222222] hover:bg-[#282828] transition-colors p-3 rounded-lg border border-neutral-750 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex items-center space-x-2 font-bold text-white flex-shrink-0">
          <PiggyBank className="w-4 h-4 text-emerald-400" />
          <span>Tiết kiệm tại quầy</span>
        </div>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-neutral-300 text-[11px]">
          <span>
            1 Tháng: <strong className="text-white text-xs font-bold">4.75%</strong>
          </span>
          <span>
            3 Tháng: <strong className="text-white text-xs font-bold">4.8%</strong>
          </span>
          <span>
            6 Tháng: <strong className="text-white text-xs font-bold text-emerald-400">6.6%</strong>
          </span>
          <span>
            9 Tháng: <strong className="text-white text-xs font-bold text-emerald-400">6.6%</strong>
          </span>
          <span>
            12 Tháng: <strong className="text-white text-xs font-bold text-emerald-400">7.0%</strong>
          </span>
        </div>

        <div className="flex items-center justify-end text-neutral-500 hover:text-white transition-colors cursor-pointer text-[11px]">
          <span className="hidden lg:inline mr-1">Xem chi tiết</span>
          <ChevronRight className="w-4 h-4" />
        </div>
      </div>
    </div>
  );
}
