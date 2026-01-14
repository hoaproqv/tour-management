import React from "react";

import { FlagOutlined } from "@ant-design/icons";
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

const styles: Record<RoundVisualStatus, { color: string; bg: string; connector: string; label: string }> = {
  past: { color: "#6b7280", bg: "#e5e7eb", connector: "#9ca3af", label: "Đã đi" },
  current: { color: "#16a34a", bg: "#dcfce7", connector: "#16a34a", label: "Đang đến" },
  upcoming: { color: "#0ea5e9", bg: "#e0f2fe", connector: "#0ea5e9", label: "Chưa đến" },
};

export function RoundTimeline({ items, onSelect }: RoundTimelineProps) {
  if (!items.length) return null;

  return (
    <div className="mt-4 bg-slate-50 border border-slate-100 rounded-xl p-4">
      <div className="flex items-center justify-between gap-3 mb-3">
        <Text strong>Tiến trình round</Text>
        <Text type="secondary">Chọn checkpoint để xem và điểm danh</Text>
      </div>
      <div className="overflow-x-auto pb-2">
        <div className="flex items-center min-w-max">
          {items.map((item, index) => {
            const meta = styles[item.status];
            const leftColor = index > 0
              ? (items[index].status === "current" ? styles.current.connector : styles[items[index].status].connector)
              : "transparent";
            const rightColor = index < items.length - 1
              ? (items[index + 1].status === "current"
                ? styles.current.connector
                : styles[items[index + 1].status].connector)
              : "transparent";

            return (
              <button
                key={item.id}
                onClick={() => onSelect(item.id)}
                className="flex flex-col items-center min-w-[160px] focus:outline-none"
                aria-pressed={item.isActive}
              >
                <div className="flex items-center w-full h-[60px]">
                  {index > 0 ? (
                    <div className="h-[3px] flex-1" style={{ backgroundColor: leftColor }} />
                  ) : (
                    <div className="h-[3px] flex-1 opacity-0" />
                  )}
                  <div
                    className={`relative w-10 h-10 rounded-full flex items-center justify-center shadow-sm transition-transform ${
                      item.isActive ? "scale-[1.05]" : ""
                    }`}
                    style={{
                      backgroundColor: meta.bg,
                      color: meta.color,
                      border: `2px solid ${meta.color}`,
                      boxShadow: item.isActive
                        ? "0 0 0 4px rgba(239,68,68,0.4)"
                        : "0 0 0 0 rgba(0,0,0,0)",
                    }}
                  >
                    {item.status === "past" && (
                      <FlagOutlined
                        style={{ position: "absolute", top: -10, right: -12, color: meta.color }}
                      />
                    )}
                    <span className="text-sm font-bold leading-none">{item.number}</span>
                  </div>
                  {index < items.length - 1 ? (
                    <div className="h-[3px] flex-1" style={{ backgroundColor: rightColor }} />
                  ) : (
                    <div className="h-[3px] flex-1 opacity-0" />
                  )}
                </div>
                <div className="mt-2 text-center">
                  <div className="text-sm font-semibold text-slate-900 leading-tight">{item.label}</div>
                  <div className="text-xs" style={{ color: meta.color }}>{meta.label}</div>
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
