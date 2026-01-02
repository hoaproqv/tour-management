import React from "react";

import {
  TeamOutlined,
  CarOutlined,
  EnvironmentOutlined,
} from "@ant-design/icons";
import { useQuery } from "@tanstack/react-query";
import { Card, Skeleton } from "antd";

import { getDashboardOverview } from "../api/dashboard";

const Dashboard: React.FC = () => {
  const { data, isLoading } = useQuery({
    queryKey: ["dashboard-overview"],
    queryFn: getDashboardOverview,
  });

  const metrics = [
    {
      title: "Tổng số trip",
      value: data?.tripsCount ?? 0,
      icon: <CarOutlined className="text-2xl text-sky-700" />,
    },
    {
      title: "Tổng số round",
      value: data?.roundsCount ?? 0,
      icon: <EnvironmentOutlined className="text-2xl text-sky-700" />,
    },
    {
      title: "Số lượng passengers",
      value: data?.passengersCount ?? 0,
      icon: <TeamOutlined className="text-2xl text-sky-700" />,
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
              Tổng quan nhanh về chuyến, vòng và hành khách trong hệ thống tour.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-10">
          {metrics.map((metric) => (
            <Card
              key={metric.title}
              className="bg-[#e5f2ff] border border-[#c5dff8] hover:shadow-md transition-shadow"
              bodyStyle={{ padding: "24px" }}
            >
              {isLoading ? (
                <Skeleton active paragraph={{ rows: 1 }} title={false} />
              ) : (
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-lg text-slate-700 italic">
                      {metric.title}
                    </p>
                    <p className="text-3xl font-bold text-slate-900 mt-3">
                      {metric.value}
                    </p>
                  </div>
                  <div className="bg-white rounded-full h-12 w-12 flex items-center justify-center shadow-sm">
                    {metric.icon}
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
