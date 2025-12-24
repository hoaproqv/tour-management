import React from "react";

import {
  BarChartOutlined,
  ClockCircleOutlined,
  DollarOutlined,
  InfoCircleOutlined,
  LineChartOutlined,
} from "@ant-design/icons";
import { faCoins } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { Card } from "antd";

import SectionHeader from "../components/SectionHeader";
import StatCard from "../components/StatCard";
import TradeItem from "../components/TradeItem";
import { useGetListDeal } from "../hooks/useMT5Api";
import useSubscribeMessage from "../hooks/useSubscribeFirebase";
import { MessageFirebasePath } from "../utils/constant";

const Dashboard: React.FC = () => {
  const { message: summaryData } = useSubscribeMessage(
    MessageFirebasePath.SUMMARY,
  );

  const {
    open_positions_count: openPositionsCount = 0,
    pending_orders_count: pendingOrdersCount = 0,
    closed_deals_count: closedOrdersCount = 0,
    total_profit: totalProfit = 0,
    current_profit: currentProfit = 0,
    win_rate: winRate = 0,
    avg_profit: avgProfit = 0,
  } = summaryData || {};

  const { data: listDealData } = useGetListDeal();
  const recentDeals = listDealData?.deals || [];

  return (
    <div className="flex flex-col gap-5 p-4 bg-background w-full">
      {/* Header */}
      <SectionHeader
        title="Trading Dashboard"
        description="Monitor your trading performance and manage positions"
        marketOpen={true}
      ></SectionHeader>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={<LineChartOutlined />}
          label="Open Positions"
          value={openPositionsCount}
          changeLabel="No change"
          colorClass="bg-blue-500"
        />
        <StatCard
          icon={<ClockCircleOutlined />}
          label="Pending Orders"
          value={pendingOrdersCount}
          changeLabel="No change"
          colorClass="bg-amber-400"
        />
        <StatCard
          icon={<DollarOutlined />}
          label="Total Profit"
          value={`$${totalProfit.toFixed(2)}`}
          changeLabel="All Deals"
          colorClass={
            totalProfit > 0
              ? "bg-green-500"
              : totalProfit < 0
                ? "bg-red-500"
                : "bg-gray-400"
          }
        />
        <StatCard
          icon={<FontAwesomeIcon icon={faCoins} />}
          label="Current Profit"
          value={`$${currentProfit.toFixed(2)}`}
          changeLabel="Open Positions"
          colorClass={
            currentProfit > 0
              ? "bg-green-500"
              : currentProfit < 0
                ? "bg-red-500"
                : "bg-gray-400"
          }
        />
      </div>

      {/* Recent Activity */}
      <Card className="animate-fade-in-right">
        <h5 className="text-xl font-semibold mb-4 flex items-center gap-2 text-[#2c3e50] ml-2">
          <BarChartOutlined /> Recent Activity
        </h5>
        {recentDeals.length ? (
          recentDeals.map((item, idx) => <TradeItem key={idx} item={item} />)
        ) : (
          <div className="text-center text-gray-400 py-10">
            <LineChartOutlined className="text-4xl mb-3" />
            <p>No recent deals</p>
            <small>Your recent deals will appear here</small>
          </div>
        )}
      </Card>

      {/* Summary */}
      <Card className="animate-fade-in-up">
        <h5 className="text-xl font-semibold mb-4 flex items-center gap-2 text-[#2c3e50]">
          <InfoCircleOutlined /> Trading Summary
        </h5>
        <div className="grid grid-cols-1 md:grid-cols-3 text-center gap-4">
          <div>
            <div className="text-center">
              <div className="text-4xl font-bold text-blue-600 mb-1">
                {closedOrdersCount}
              </div>
              <div className="text-gray-500 text-[0.95rem] uppercase">
                Closed Trades
              </div>
            </div>
          </div>
          <div>
            <div className="text-center">
              <div className="text-4xl font-bold text-orange-500 mb-1">
                {winRate.toFixed(2)}%
              </div>
              <div className="text-gray-500 text-[0.95rem] uppercase">
                Win Rate
              </div>
            </div>
          </div>
          <div>
            <div className="text-center">
              <div
                className="text-4xl font-bold mb-1"
                style={{
                  color:
                    avgProfit > 0
                      ? "#28a745"
                      : avgProfit < 0
                        ? "#dc3545"
                        : "#6c757d",
                }}
              >
                ${avgProfit.toFixed(2)}
              </div>
              <div className="text-gray-500 text-[0.95rem] uppercase">
                Avg. Profit
              </div>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
};

// const InfoIcon = () => <i className="fas fa-info-circle text-indigo-500" />;

export default Dashboard;
