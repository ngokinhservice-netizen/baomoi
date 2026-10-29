import React from "react";
import Link from "next/link";

interface LogoProps {
  variant?: "light" | "dark";
  size?: "sm" | "md" | "lg";
  href?: string;
  showSlogan?: boolean;
}

export default function Logo({
  variant = "light",
  size = "md",
  href = "/",
  showSlogan = true,
}: LogoProps) {
  const isDark = variant === "dark";

  const sizeClasses = {
    sm: "h-8",
    md: "h-11 sm:h-12",
    lg: "h-14 sm:h-16",
  };

  const content = (
    <div className="flex items-center space-x-2.5 select-none group">
      {/* Icon Badge: Heartbeat / Pulse Wave with Live Beacon */}
      <div className="relative flex-shrink-0">
        <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-gradient-to-br from-red-600 to-red-800 flex items-center justify-center shadow-md group-hover:scale-105 transition-transform duration-300 border border-white/20">
          {/* Heartbeat / Activity Pulse Wave SVG */}
          <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
          </svg>
          {/* 247 Live beacon dot */}
          <span className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-amber-400 rounded-full border-2 border-white animate-pulse" />
        </div>
      </div>

      {/* Typography: NHỊP SỐNG 247 */}
      <div className="flex flex-col">
        <div className="flex items-baseline space-x-1.5">
          <span
            className={`font-black tracking-tight text-xl sm:text-2xl font-sans uppercase ${
              isDark ? "text-white" : "text-gray-900"
            }`}
          >
            NHỊP SỐNG
          </span>
          <span className="bg-gradient-to-r from-red-600 to-red-700 text-white font-black text-sm sm:text-base px-2 py-0.5 rounded-md shadow-2xs tracking-wide">
            247
          </span>
        </div>

        {showSlogan && (
          <span
            className={`text-[9px] sm:text-[10px] font-bold tracking-widest uppercase -mt-0.5 ${
              isDark ? "text-red-400" : "text-primary"
            }`}
          >
            Báo điện tử tin tức & nhịp đập 24/7
          </span>
        )}
      </div>
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="inline-block focus:outline-none">
        {content}
      </Link>
    );
  }

  return content;
}
