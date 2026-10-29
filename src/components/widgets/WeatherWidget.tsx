"use client";

import React, { useState, useEffect, useRef } from "react";
import { ChevronDown, Moon, Sun, Cloud, CloudRain, CloudMoon } from "lucide-react";

interface CityWeather {
  id: string;
  name: string;
  temp: number;
  condition: string;
  iconType: "moon" | "sun" | "cloud" | "rain" | "cloud-moon";
}

const CITIES: CityWeather[] = [
  { id: "hanoi", name: "Hà Nội", temp: 26, condition: "Trời quang, gió nhẹ", iconType: "moon" },
  { id: "hcm", name: "TP. Hồ Chí Minh", temp: 29, condition: "Nhiều mây, dịu mát", iconType: "cloud-moon" },
  { id: "danang", name: "Đà Nẵng", temp: 27, condition: "Mây rải rác", iconType: "cloud" },
  { id: "haiphong", name: "Hải Phòng", temp: 25, condition: "Trời quang mây", iconType: "moon" },
  { id: "cantho", name: "Cần Thơ", temp: 28, condition: "Có mưa rào nhẹ", iconType: "rain" },
  { id: "nhatrang", name: "Nha Trang", temp: 27, condition: "Gió biển mát mẻ", iconType: "cloud-moon" },
  { id: "hue", name: "Huế", temp: 26, condition: "Trời mát, nhiều mây", iconType: "cloud" },
];

export default function WeatherWidget() {
  const [selectedCity, setSelectedCity] = useState<CityWeather>(CITIES[0]);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Adjust icon based on current local hour if needed
  const isNight = true; // Night mode matching screenshot

  const renderIcon = (type: string, className = "w-4 h-4") => {
    switch (type) {
      case "sun":
        return <Sun className={`${className} text-amber-500`} />;
      case "rain":
        return <CloudRain className={`${className} text-blue-400`} />;
      case "cloud":
        return <Cloud className={`${className} text-gray-400`} />;
      case "cloud-moon":
        return (
          <div className="relative inline-flex items-center">
            <Moon className={`${className} text-amber-200 fill-amber-100`} />
            <Cloud className="w-2.5 h-2.5 text-gray-400 absolute -bottom-0.5 -right-1" />
          </div>
        );
      case "moon":
      default:
        return (
          <div className="relative inline-flex items-center">
            <svg
              className={`${className} text-gray-200 fill-gray-100`}
              viewBox="0 0 24 24"
              strokeWidth="1.5"
              stroke="currentColor"
              fill="currentColor"
            >
              <path d="M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z" />
            </svg>
            <Cloud className="w-3 h-3 text-gray-300 absolute -bottom-0.5 right-0 opacity-80" />
          </div>
        );
    }
  };

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-1.5 px-2.5 py-1 rounded hover:bg-gray-100 transition-colors text-xs font-medium text-gray-700 focus:outline-none"
        title={`Thời tiết tại ${selectedCity.name}: ${selectedCity.temp}°C - ${selectedCity.condition}`}
      >
        <span className="text-gray-800 font-semibold">{selectedCity.name}</span>
        <ChevronDown className={`w-3.5 h-3.5 text-gray-500 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`} />
        <span className="mx-0.5 text-gray-300">|</span>
        <div className="flex items-center space-x-1 pl-0.5">
          {renderIcon(selectedCity.iconType, "w-4 h-4")}
          <span className="font-bold text-gray-900 tracking-tight text-xs">
            {selectedCity.temp}°C
          </span>
        </div>
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 sm:left-0 sm:right-auto mt-1 w-56 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-50 divide-y divide-gray-100 animate-in fade-in zoom-in-95 duration-100">
          <div className="p-2 bg-gray-50 rounded-t-md border-b border-gray-100 flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-gray-500">
              Thời tiết địa phương
            </span>
            <span className="text-[10px] text-gray-400">Hôm nay</span>
          </div>

          <div className="py-1 max-h-60 overflow-y-auto">
            {CITIES.map((city) => (
              <button
                key={city.id}
                onClick={() => {
                  setSelectedCity(city);
                  setIsOpen(false);
                }}
                className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between hover:bg-gray-50 transition-colors ${
                  selectedCity.id === city.id ? "bg-red-50/50 font-bold text-primary" : "text-gray-700"
                }`}
              >
                <div>
                  <div className="font-medium">{city.name}</div>
                  <div className="text-[10px] text-gray-400 font-normal">{city.condition}</div>
                </div>
                <div className="flex items-center space-x-1.5">
                  {renderIcon(city.iconType, "w-3.5 h-3.5")}
                  <span className="font-bold">{city.temp}°C</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
