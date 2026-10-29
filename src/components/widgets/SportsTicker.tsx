"use client";

import React, { useRef } from "react";
import { ChevronRight, ChevronLeft, Trophy, Calendar } from "lucide-react";

interface MatchItem {
  id: string;
  time: string;
  league: string;
  team1: { name: string; color: string; badgeText: string };
  team2: { name: string; color: string; badgeText: string };
  score?: string;
}

const MATCHES: MatchItem[] = [
  {
    id: "1",
    time: "Hôm nay, 01:00",
    league: "Saudi Pro League",
    team1: { name: "Al-Nassr", color: "bg-yellow-500 text-blue-950", badgeText: "NAS" },
    team2: { name: "Al Kholood", color: "bg-red-700 text-white", badgeText: "KHO" },
  },
  {
    id: "2",
    time: "Hôm nay, 17:00",
    league: "V-League 1",
    team1: { name: "Thanh Hóa", color: "bg-amber-400 text-red-900", badgeText: "TH" },
    team2: { name: "Hà Tĩnh", color: "bg-red-600 text-white", badgeText: "HT" },
  },
  {
    id: "3",
    time: "Hôm nay, 18:00",
    league: "Cúp Quốc gia",
    team1: { name: "Bắc Ninh", color: "bg-blue-600 text-white", badgeText: "BN" },
    team2: { name: "HAGL", color: "bg-white text-emerald-800 border border-emerald-700", badgeText: "HAG" },
  },
  {
    id: "4",
    time: "Hôm nay, 19:15",
    league: "V-League 1",
    team1: { name: "Hà Nội FC", color: "bg-purple-800 text-white", badgeText: "HN" },
    team2: { name: "Ninh Bình", color: "bg-rose-700 text-white", badgeText: "NB" },
  },
  {
    id: "5",
    time: "Hôm nay, 19:30",
    league: "Saudi Pro League",
    team1: { name: "Abha", color: "bg-sky-600 text-white", badgeText: "ABH" },
    team2: { name: "Al-Ittihad FC", color: "bg-yellow-400 text-black", badgeText: "ITT" },
  },
  {
    id: "6",
    time: "Ngày mai, 02:00",
    league: "Champions League",
    team1: { name: "Real Madrid", color: "bg-slate-100 text-slate-900 border", badgeText: "RMA" },
    team2: { name: "Bayern Munich", color: "bg-red-700 text-white", badgeText: "BAY" },
  },
  {
    id: "7",
    time: "Ngày mai, 21:00",
    league: "Premier League",
    team1: { name: "Arsenal", color: "bg-red-600 text-white", badgeText: "ARS" },
    team2: { name: "Man City", color: "bg-sky-400 text-slate-900", badgeText: "MCI" },
  },
];

export default function SportsTicker() {
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const scroll = (direction: "left" | "right") => {
    if (scrollContainerRef.current) {
      const scrollAmount = direction === "left" ? -280 : 280;
      scrollContainerRef.current.scrollBy({ left: scrollAmount, behavior: "smooth" });
    }
  };

  return (
    <div className="w-full bg-[#141414] text-white rounded-xl shadow-md border border-neutral-800 overflow-hidden my-6">
      {/* Header bar */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-neutral-800/80 bg-[#1c1c1c]/90">
        <div className="flex items-center space-x-2">
          <Trophy className="w-4 h-4 text-amber-400" />
          <h3 className="font-bold text-xs uppercase tracking-wider text-neutral-200">
            Lịch thi đấu bóng đá hôm nay
          </h3>
          <span className="text-[10px] text-neutral-400 hidden sm:inline">• Trực tiếp & Lịch phát sóng</span>
        </div>

        {/* Scroll navigation buttons */}
        <div className="flex items-center space-x-1">
          <button
            onClick={() => scroll("left")}
            className="p-1 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-300 transition-colors"
            aria-label="Cuộn sang trái"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => scroll("right")}
            className="p-1 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-300 transition-colors"
            aria-label="Cuộn sang phải"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Horizontal match cards */}
      <div
        ref={scrollContainerRef}
        className="flex items-stretch divide-x divide-neutral-800/90 overflow-x-auto scrollbar-none py-1 scroll-smooth"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
      >
        {MATCHES.map((match) => (
          <div
            key={match.id}
            className="flex-shrink-0 w-48 sm:w-56 p-3 hover:bg-[#1e1e1e] transition-colors cursor-pointer group flex flex-col justify-between"
          >
            <div className="flex items-center justify-between text-[11px] text-neutral-400 mb-2 font-medium">
              <span>{match.time}</span>
              <span className="text-[10px] text-neutral-500 uppercase">{match.league}</span>
            </div>

            <div className="space-y-2">
              {/* Team 1 */}
              <div className="flex items-center space-x-2">
                <span
                  className={`w-5 h-5 rounded-full ${match.team1.color} flex items-center justify-center font-bold text-[9px] shadow-sm flex-shrink-0`}
                >
                  {match.team1.badgeText.slice(0, 2)}
                </span>
                <span className="text-xs font-semibold text-neutral-200 group-hover:text-white truncate">
                  {match.team1.name}
                </span>
              </div>

              {/* Team 2 */}
              <div className="flex items-center space-x-2">
                <span
                  className={`w-5 h-5 rounded-full ${match.team2.color} flex items-center justify-center font-bold text-[9px] shadow-sm flex-shrink-0`}
                >
                  {match.team2.badgeText.slice(0, 2)}
                </span>
                <span className="text-xs font-semibold text-neutral-200 group-hover:text-white truncate">
                  {match.team2.name}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
