import React from "react";

import {
  ArrowDownOutlined,
  ArrowUpOutlined,
  MinusOutlined,
} from "@ant-design/icons";
import { Tag } from "antd";

import { DealTypeDisplay } from "../utils/constant";

import type { IDealItem } from "../utils/types";

export interface TradeItemProps {
  item: IDealItem;
}

const TradeItem: React.FC<TradeItemProps> = ({ item }) => {
  const getBgClass = () => {
    if (item.type_display === DealTypeDisplay.BUY) return "bg-green-500";
    if (item.type_display === DealTypeDisplay.SELL) return "bg-red-500";
    return "bg-yellow-500";
  };

  const getIcon = () => {
    if (item.type_display === DealTypeDisplay.BUY)
      return <ArrowUpOutlined className="text-xl font-bold" />;
    if (item.type_display === DealTypeDisplay.SELL)
      return <ArrowDownOutlined className="text-xl font-bold" />;
    return <MinusOutlined className="text-xl font-bold" />;
  };

  const getProfitColor = () => {
    if (item.profit > 0) return "text-green-500";
    if (item.profit < 0) return "text-red-500";
    return "text-gray-500";
  };

  return (
    <div className="flex items-center justify-between p-2 border-b hover:bg-[#f5f5f5] transition-colors duration-200 rounded-lg">
      <div
        className={`w-10 h-10 flex items-center justify-center rounded-xl p-2 text-white ${getBgClass()}`}
      >
        {getIcon()}
      </div>

      <div className="flex-1 px-4">
        <div className="font-semibold text-[#2c3e50] mb-1">
          {item.symbol} - {item.type_display}
          {item.entry_display && (
            <Tag
              color={
                item.entry_display.toLowerCase() === "in" ? "green" : "red"
              }
              className="ml-2"
            >
              {item.entry_display.toUpperCase()}
            </Tag>
          )}
        </div>
        <div className="text-sm text-[#6c757d]">
          {new Date(item.time).toLocaleString()} | Vol: {item.volume} | Price: $
          {item.price.toFixed(5)}
        </div>
      </div>

      <div className={`font-semibold ${getProfitColor()}`}>
        ${item.profit.toFixed(2)}
      </div>
    </div>
  );
};

export default TradeItem;
