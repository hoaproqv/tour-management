import React from "react";

import { TeamOutlined, CarOutlined, FieldTimeOutlined } from "@ant-design/icons";
import { useQuery } from "@tanstack/react-query";
import { Card, Skeleton, Tag, Table, Typography } from "antd";
import dayjs from "dayjs";

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
    <div className="w-full bg-[#f4f7fb] h-full md:py-6">
      <div className="bg-white shadow-sm rounded-xl md:rounded-2xl p-4 md:p-6 border border-slate-100">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs md:text-sm uppercase tracking-[0.25em] text-sky-700 font-semibold">
              Main Navigation
            </p>
            <h1 className="text-2xl md:text-4xl font-bold text-slate-900 mt-1 md:mt-3">
              Dashboard
            </h1>
            <p className="text-sm md:text-base text-slate-500 mt-1 md:mt-2">
              Tổng quan nhanh về chuyến, hành khách và xe bus trong hệ thống chuyến đi.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6 md:mt-10">
          {metrics.map((metric) => (
            <Card
              key={metric.key}
              className="bg-[#e5f2ff] border border-[#c5dff8] hover:shadow-lg transition-shadow [&>.ant-card-body]:p-3 md:[&>.ant-card-body]:p-6"
              styles={{ body: { padding: 0 } }}
            >
              {isLoading ? (
                <Skeleton active paragraph={{ rows: 3 }} title={{ width: 140 }} />
              ) : (
                <div className="flex flex-col gap-3 md:gap-4 p-4 md:p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex flex-col">
                      <p className="text-base md:text-lg text-slate-700 italic">
                        {metric.title}
                      </p>
                      <div className="flex items-baseline gap-2 mt-0.5 md:mt-2">
                        <p className="text-3xl md:text-4xl font-bold text-slate-900">
                          {metric.total}
                        </p>
                        <p className="text-[10px] md:text-xs uppercase tracking-[0.1em] text-slate-500">
                          Tổng cộng
                        </p>
                      </div>
                    </div>
                    <div className="bg-white rounded-full h-10 w-10 md:h-12 md:w-12 flex items-center justify-center shadow-sm shrink-0">
                      {metric.icon}
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-1.5 md:gap-2">
                    {metric.breakdown.map((item) => (
                      <Tag
                        key={`${metric.key}-${item.label}`}
                        color={item.color}
                        className="m-0 px-2 py-0.5 md:px-3 md:py-1 text-[11px] md:text-sm"
                      >
                        <span className="font-semibold">{item.value}</span>
                        <span className="ml-1 md:ml-2 text-slate-700">{item.label}</span>
                      </Tag>
                    ))}
                  </div>
                </div>
              )}
            </Card>
          ))}
        </div>

        {/* Recent Data Sections */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mt-8">
          {/* Recent Trips */}
          <div className="bg-white border border-slate-100 shadow-sm rounded-xl p-4 md:p-6 flex flex-col">
            <div className="mb-4">
              <Typography.Title level={4} className="!mb-0 !text-slate-800">
                Chuyến đi gần đây
              </Typography.Title>
              <Typography.Text className="text-slate-500">
                5 chuyến đi được cập nhật mới nhất
              </Typography.Text>
            </div>
            <Table scroll={{ x: "max-content" }}
              dataSource={data?.recent_trips}
              rowKey="id"
              pagination={false}
              size="small"
              loading={isLoading}
              className="custom-table overflow-x-auto"
              columns={[
                {
                  title: "Tên chuyến",
                  dataIndex: "name",
                  key: "name",
                  render: (text) => <span className="font-medium text-slate-700">{text}</span>,
                },
                {
                  title: "Ngày bắt đầu",
                  dataIndex: "start_date",
                  key: "start_date",
                  render: (date) => (
                    <span className="text-slate-600">
                      {date ? dayjs(date).format("DD/MM/YYYY") : "—"}
                    </span>
                  ),
                },
                {
                  title: "Trạng thái",
                  dataIndex: "status",
                  key: "status",
                  render: (status) => {
                    const colors = {
                      planned: "blue",
                      doing: "orange",
                      done: "green",
                    };
                    const labels = {
                      planned: "Lên kế hoạch",
                      doing: "Đang đi",
                      done: "Hoàn thành",
                    };
                    return (
                      <Tag color={colors[status as keyof typeof colors]}>
                        {labels[status as keyof typeof labels] || status}
                      </Tag>
                    );
                  },
                },
              ]}
            />
          </div>

          {/* Recent Transactions */}
          <div className="bg-white border border-slate-100 shadow-sm rounded-xl p-4 md:p-6 flex flex-col">
            <div className="mb-4">
              <Typography.Title level={4} className="!mb-0 !text-slate-800">
                Hoạt động điểm danh
              </Typography.Title>
              <Typography.Text className="text-slate-500">
                5 lượt check-in gần nhất trên hệ thống
              </Typography.Text>
            </div>
            <Table scroll={{ x: "max-content" }}
              dataSource={data?.recent_transactions}
              rowKey="id"
              pagination={false}
              size="small"
              loading={isLoading}
              className="custom-table overflow-x-auto"
              columns={[
                {
                  title: "Hành khách",
                  dataIndex: "passenger_name",
                  key: "passenger_name",
                  render: (text) => <span className="font-medium text-slate-700">{text}</span>,
                },
                {
                  title: "Điểm đến / Xe",
                  key: "round_bus",
                  render: (_, record) => (
                    <div className="flex flex-col">
                      <span className="text-slate-800 text-sm">{record.round_name}</span>
                      <span className="text-slate-500 text-xs">{record.bus_number}</span>
                    </div>
                  ),
                },
                {
                  title: "Thời gian",
                  dataIndex: "check_in",
                  key: "check_in",
                  render: (date) => (
                    <span className="text-slate-600 text-sm">
                      {date ? dayjs(date).format("HH:mm DD/MM") : "—"}
                    </span>
                  ),
                },
              ]}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
