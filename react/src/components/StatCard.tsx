// components/StatCard.tsx
import React from "react";

import { MinusOutlined } from "@ant-design/icons";
import { Card } from "antd";

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  changeLabel: string;
  colorClass?: string;
  valueClassName?: string;
}

const StatCard: React.FC<StatCardProps> = ({
  icon,
  label,
  value,
  changeLabel,
  colorClass = "",
  valueClassName = "",
}) => {
  return (
    <Card className="w-full text-center rounded-xl bg-white shadow-[0_4px_6px_rgba(0,0,0,0.07)] transition-transform duration-300 hover:-translate-y-1 hover:shadow-[0_15px_40px_rgba(0,0,0,0.10)]">
      <div className="flex justify-center">
        <div
          className={`max-w-[55px] w-full text-white text-2xl aspect-square flex justify-center items-center rounded-xl ${colorClass}`}
        >
          {icon}
        </div>
      </div>
      <div
        className={`text-4xl font-bold mt-4 text-[#2c3e50] ${valueClassName}`}
      >
        {typeof value === "string" && value.includes(".") && value.length > 8
          ? value.replace(/\./g, ".\n")
          : value}
      </div>
      <div className="text-gray-500 text-[0.95rem] font-[500] tracking-wide mt-1">
        {label}
      </div>
      {changeLabel && (
        <div className="inline-flex items-center gap-1 bg-gray-100 text-gray-600 text-xs px-2 py-1 rounded mt-4">
          <MinusOutlined /> {changeLabel}
        </div>
      )}
    </Card>
  );
};

export default StatCard;
