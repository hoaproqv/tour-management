import React from "react";

import { CheckCircleFilled } from "@ant-design/icons";
import { Typography } from "antd";

import type { RoundVisualStatus } from "./types";

const { Text } = Typography;

export interface TimelineItem {
  id: string;
  label: string;
  number: string | number;
  status: RoundVisualStatus;
  isActive: boolean;
}

interface RoundTimelineProps {
  items: TimelineItem[];
  onSelect: (_id: string) => void;
}

const styles: Record<
  RoundVisualStatus,
  { 
    color: string; 
    bg: string; 
    pillBg: string;
    border: string; 
    connector: string; 
    label: string; 
    glow: string;
  }
> = {
  past: {
    color: "#15803d",
    bg: "#dcfce7",
    pillBg: "#dcfce7",
    border: "#22c55e",
    connector: "#22c55e",
    label: "Đã đi",
    glow: "rgba(34, 197, 94, 0.3)",
  },
  current: {
    color: "#1d4ed8",
    bg: "#dbeafe",
    pillBg: "#dbeafe",
    border: "#3b82f6",
    connector: "#e2e8f0",
    label: "Đang đến",
    glow: "rgba(59, 130, 246, 0.3)",
  },
  upcoming: {
    color: "#64748b",
    bg: "#ffffff",
    pillBg: "#f1f5f9",
    border: "#cbd5e1",
    connector: "#e2e8f0",
    label: "Chưa đến",
    glow: "rgba(100, 116, 139, 0.2)",
  },
};

export function RoundTimeline({ items, onSelect }: RoundTimelineProps) {
  if (!items.length) return null;

  const getSegmentColor = (fromIndex: number) => {
    if (fromIndex < 0 || fromIndex >= items.length - 1) return "transparent";
    const fromStatus = items[fromIndex].status;
    if (fromStatus === "past") return styles.past.connector;
    return styles.upcoming.connector;
  };

  return (
    <div className="mt-4 bg-slate-50 border border-slate-100 rounded-xl p-4 w-full">
      <div className="flex items-center justify-between gap-3 mb-6">
        <Text strong>Tiến trình Chặng trong Chuyến đi</Text>
        <Text type="secondary" className="hidden sm:inline">
          Chọn Địa điểm để xem và điểm danh
        </Text>
      </div>
      
      <div className="w-full overflow-x-auto pb-4 scrollbar-thin scrollbar-thumb-slate-300 scrollbar-track-transparent">
        <div 
          className="relative flex justify-between w-full px-4 pt-2 mx-auto"
          style={{ minWidth: `${Math.max(items.length * 140, 400)}px` }}
        >
          
          {/* Connecting lines container */}
          {items.length > 1 && (
            <div 
              className="absolute flex -translate-y-1/2" 
              style={{ 
                top: '38px', // pt-2 (8px) + half of h-[60px] (30px)
                left: 'calc(1rem + 4.5rem)', // px-4 is 1rem, w-36 is 9rem -> half is 4.5rem
                right: 'calc(1rem + 4.5rem)'
              }}
            >
              {items.slice(0, -1).map((_, i) => (
                <div 
                  key={i} 
                  className="flex-1 h-[3px] transition-colors duration-300" 
                  style={{ backgroundColor: getSegmentColor(i) }} 
                />
              ))}
            </div>
          )}

          {/* Nodes */}
          {items.map((item) => {
            const meta = styles[item.status];
            
            return (
              <button
                key={item.id}
                onClick={() => onSelect(item.id)}
                className="relative z-10 flex flex-col items-center group focus:outline-none w-36"
                aria-pressed={item.isActive}
              >
                <div className="flex items-center justify-center w-full h-[60px]">
                  <div
                    className={`relative w-10 h-10 shrink-0 rounded-full flex items-center justify-center shadow-sm transition-all duration-300 ${
                      item.isActive ? "scale-110" : "group-hover:scale-105"
                    }`}
                    style={{
                      backgroundColor: meta.bg,
                      color: meta.color,
                      border: `2px solid ${meta.border}`,
                      boxShadow: item.isActive
                        ? `0 0 0 4px ${meta.glow}`
                        : "0 0 0 0 rgba(0,0,0,0)",
                    }}
                  >
                    {item.status === "past" && (
                      <div className="absolute -top-1 -right-1 bg-white rounded-full leading-none border border-green-500 shadow-sm p-[1px]">
                        <CheckCircleFilled style={{ color: "#22c55e", fontSize: "14px" }} />
                      </div>
                    )}
                    <span className="text-sm font-bold leading-none">
                      {item.number}
                    </span>
                  </div>
                </div>

                <div className="mt-1 text-center px-2 w-full flex flex-col items-center">
                  <div className="w-full h-auto min-h-[36px] flex justify-center">
                    <div
                      className="text-sm font-semibold text-slate-800 leading-snug break-words line-clamp-2"
                      title={item.label}
                    >
                      {item.label}
                    </div>
                  </div>
                  <div
                    className="text-xs mt-1.5 font-medium px-2 py-0.5 rounded-full"
                    style={{ backgroundColor: meta.pillBg, color: meta.color }}
                  >
                    {meta.label}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default RoundTimeline;
