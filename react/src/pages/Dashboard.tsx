import React from "react";

import { TeamOutlined, CarOutlined, FieldTimeOutlined } from "@ant-design/icons";
import { useQuery } from "@tanstack/react-query";
import { Card, Skeleton, Tag } from "antd";

import { getDashboardOverview } from "../api/dashboard";

import type { DashboardOverview } from "../api/dashboard";

const Dashboard: React.FC = () => {
  const { data, isLoading } = useQuery<DashboardOverview>({
    queryKey: ["dashboard-overview"],
    queryFn: getDashboardOverview,
  });

  const metrics = [
    {
      key: "trips",
      title: "Chuyến đi",
      total: data?.trips.total ?? 0,
      breakdown: [
        { label: "Đang đi", value: data?.trips.doing ?? 0, color: "orange" },
        { label: "Đã hoàn thành", value: data?.trips.done ?? 0, color: "green" },
        {
          label: "Lên kế hoạch",
          value: data?.trips.planned ?? 0,
          color: "blue",
        },
      ],
      icon: <CarOutlined className="text-2xl text-sky-700" />,
    },
    {
      key: "passengers",
      title: "Hành khách",
      total: data?.passengers.total ?? 0,
      breakdown: [
        { label: "Đang đi", value: data?.passengers.doing ?? 0, color: "orange" },
        { label: "Đã đi xong", value: data?.passengers.done ?? 0, color: "green" },
        {
          label: "Chờ khởi hành",
          value: data?.passengers.planned ?? 0,
          color: "blue",
        },
      ],
      icon: <TeamOutlined className="text-2xl text-sky-700" />,
    },
    {
      key: "buses",
      title: "Xe bus",
      total: data?.buses.total ?? 0,
      breakdown: [
        { label: "Đang chạy", value: data?.buses.doing ?? 0, color: "orange" },
        { label: "Đã hoàn thành", value: data?.buses.done ?? 0, color: "green" },
        {
          label: "Sẵn sàng",
          value: data?.buses.planned ?? 0,
          color: "blue",
        },
      ],
      icon: <FieldTimeOutlined className="text-2xl text-sky-700" />,
    },
  ];

  return (
    <div className="w-full bg-[#f4f7fb] min-h-screen p-6">
      <div className="bg-white shadow-sm rounded-2xl p-6 border border-slate-100">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.25em] text-sky-700 font-semibold">
              Main Navigation
            </p>
            <h1 className="text-4xl font-bold text-slate-900 mt-3">
              Dashboard
            </h1>
            <p className="text-slate-500 mt-2">
              Tổng quan nhanh về chuyến, hành khách và xe bus trong hệ thống tour.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-10">
          {metrics.map((metric) => (
            <Card
              key={metric.key}
              className="bg-[#e5f2ff] border border-[#c5dff8] hover:shadow-lg transition-shadow"
              styles={{ body: { padding: "24px" } }}
            >
              {isLoading ? (
                <Skeleton active paragraph={{ rows: 3 }} title={{ width: 140 }} />
              ) : (
                <div className="flex flex-col gap-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-lg text-slate-700 italic">
                        {metric.title}
                      </p>
                      <p className="text-4xl font-bold text-slate-900 mt-2">
                        {metric.total}
                      </p>
                      <p className="text-xs uppercase tracking-[0.2em] text-slate-500 mt-1">
                        Tổng cộng
                      </p>
                    </div>
                    <div className="bg-white rounded-full h-12 w-12 flex items-center justify-center shadow-sm">
                      {metric.icon}
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {metric.breakdown.map((item) => (
                      <Tag
                        key={`${metric.key}-${item.label}`}
                        color={item.color}
                        className="px-3 py-1 text-sm"
                      >
                        <span className="font-semibold">{item.value}</span>
                        <span className="ml-2 text-slate-700">{item.label}</span>
                      </Tag>
                    ))}
                  </div>
                </div>
              )}
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
