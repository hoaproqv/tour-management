import React from "react";

import { TeamOutlined, CarOutlined, FieldTimeOutlined, BankOutlined, UserOutlined } from "@ant-design/icons";
import { useQuery } from "@tanstack/react-query";
import { Card, Skeleton, Tag, Table, Typography } from "antd";
import dayjs from "dayjs";

import { getDashboardOverview } from "../api/dashboard";
import { useGetAccountInfo } from "../hooks/useAuth";

import type { DashboardOverview } from "../api/dashboard";
import type { IUser } from "../utils/types";

// Admin Dashboard Component
const AdminDashboard = ({ data, isLoading }: { data?: DashboardOverview["admin_overview"]; isLoading: boolean }) => {
  return (
    <div className="w-full bg-[#f4f7fb] h-full md:py-6">
      <div className="bg-white shadow-sm rounded-xl md:rounded-2xl p-4 md:p-6 border border-slate-100">
        <div>
          <p className="text-xs md:text-sm uppercase tracking-[0.25em] text-indigo-700 font-semibold">
            Quản trị hệ thống
          </p>
          <h1 className="text-2xl md:text-4xl font-bold text-slate-900 mt-1 md:mt-3">
            Admin Dashboard
          </h1>
          <p className="text-sm md:text-base text-slate-500 mt-1 md:mt-2">
            Tổng quan về Công ty (Tenant) và Người dùng trên toàn bộ hệ thống.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6 md:mt-10">
          {/* Tenant Stats */}
          <Card
            className="bg-[#f3e8ff] border border-[#e9d5ff] hover:shadow-lg transition-shadow"
            styles={{ body: { padding: 0 } }}
          >
            {isLoading ? (
              <Skeleton active paragraph={{ rows: 2 }} title={{ width: 140 }} />
            ) : (
              <div className="flex flex-col gap-2 p-4 md:p-5 h-full justify-center">
                <div className="flex items-start justify-between">
                  <div className="flex flex-col">
                    <p className="text-sm md:text-base text-slate-700 italic">Tổng số Công ty</p>
                    <div className="flex items-baseline gap-2 mt-1">
                      <p className="text-3xl md:text-4xl font-bold text-slate-900">{data?.tenants.total ?? 0}</p>
                    </div>
                  </div>
                  <div className="bg-white rounded-full h-10 w-10 md:h-14 md:w-14 flex items-center justify-center shadow-sm shrink-0">
                    <BankOutlined className="text-2xl text-purple-600" />
                  </div>
                </div>
              </div>
            )}
          </Card>

          {/* User Stats */}
          <Card
            className="bg-[#e0e7ff] border border-[#c7d2fe] hover:shadow-lg transition-shadow"
            styles={{ body: { padding: 0 } }}
          >
            {isLoading ? (
              <Skeleton active paragraph={{ rows: 2 }} title={{ width: 140 }} />
            ) : (
              <div className="flex flex-col gap-2 p-4 md:p-5 h-full justify-center">
                <div className="flex items-start justify-between">
                  <div className="flex flex-col">
                    <p className="text-sm md:text-base text-slate-700 italic">Người dùng</p>
                    <div className="flex items-baseline gap-2 mt-1">
                      <p className="text-3xl md:text-4xl font-bold text-slate-900">{data?.users.total ?? 0}</p>
                      <p className="text-[10px] md:text-xs uppercase tracking-[0.1em] text-slate-500">Tài khoản</p>
                    </div>
                  </div>
                  <div className="bg-white rounded-full h-10 w-10 md:h-14 md:w-14 flex items-center justify-center shadow-sm shrink-0">
                    <UserOutlined className="text-2xl text-indigo-600" />
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 mt-1">
                  <Tag color="green" className="m-0 text-xs px-2 py-0.5">
                    <span className="font-semibold">{data?.users.active ?? 0}</span> Hoạt động
                  </Tag>
                  <Tag color="red" className="m-0 text-xs px-2 py-0.5">
                    <span className="font-semibold">{data?.users.inactive ?? 0}</span> Vô hiệu hóa
                  </Tag>
                </div>
              </div>
            )}
          </Card>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mt-8">
          {/* Recent Tenants */}
          <div className="bg-white border border-slate-100 shadow-sm rounded-xl p-4 md:p-6 flex flex-col">
            <Typography.Title level={4} className="!mb-4 !text-slate-800">Công ty mới đăng ký</Typography.Title>
            <Table
              scroll={{ x: "max-content" }}
              dataSource={data?.recent_tenants}
              rowKey="id"
              pagination={false}
              size="small"
              loading={isLoading}
              columns={[
                { title: "Tên công ty", dataIndex: "name", render: (text) => <span className="font-medium text-slate-700">{text}</span> },
                { title: "Ngày tạo", dataIndex: "created_at", render: (date) => <span className="text-slate-600">{date ? dayjs(date).format("DD/MM/YYYY") : "—"}</span> },
              ]}
            />
          </div>

          {/* Recent Users */}
          <div className="bg-white border border-slate-100 shadow-sm rounded-xl p-4 md:p-6 flex flex-col">
            <Typography.Title level={4} className="!mb-4 !text-slate-800">Người dùng mới</Typography.Title>
            <Table
              scroll={{ x: "max-content" }}
              dataSource={data?.recent_users}
              rowKey="id"
              pagination={false}
              size="small"
              loading={isLoading}
              columns={[
                { title: "Họ tên", dataIndex: "name", render: (text) => <span className="font-medium text-slate-700">{text}</span> },
                { title: "Email", dataIndex: "email" },
                { 
                  title: "Vai trò", 
                  dataIndex: "role", 
                  render: (r) => {
                    const roleMap: Record<string, { label: string; color: string }> = {
                      tour_manager: { label: "Quản lý chuyến đi", color: "geekblue" },
                      fleet_lead: { label: "Trưởng xe", color: "cyan" },
                      driver: { label: "Lái xe", color: "green" },
                      admin: { label: "Quản trị viên", color: "purple" }
                    };
                    const meta = roleMap[r];
                    if (!r) return "—";
                    return meta ? <Tag color={meta.color}>{meta.label}</Tag> : <Tag color="default">{r}</Tag>;
                  }
                },
                { title: "Công ty", dataIndex: "tenant_name", render: (t) => t || "—" },
              ]}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

// Tenant Dashboard Content Component
const TenantDashboard = ({ data, isLoading }: { data?: DashboardOverview; isLoading: boolean }) => {
  const metrics = [
    {
      key: "trips",
      title: "Chuyến đi",
      total: data?.trips.total ?? 0,
      breakdown: [
        { label: "Đang đi", value: data?.trips.doing ?? 0, color: "orange" },
        { label: "Đã hoàn thành", value: data?.trips.done ?? 0, color: "green" },
        { label: "Lên kế hoạch", value: data?.trips.planned ?? 0, color: "blue" },
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
        { label: "Chờ khởi hành", value: data?.passengers.planned ?? 0, color: "blue" },
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
        { label: "Sẵn sàng", value: data?.buses.planned ?? 0, color: "blue" },
      ],
      icon: <FieldTimeOutlined className="text-2xl text-sky-700" />,
    },
  ];

  return (
    <div className="w-full bg-[#f4f7fb] h-full md:py-6">
      <div className="bg-white shadow-sm rounded-xl md:rounded-2xl p-4 md:p-6 border border-slate-100">
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
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
          
          {/* Tenant Info Banner */}
          {data?.tenant_info && (
            <div className="bg-sky-50 border border-sky-100 rounded-lg p-4 lg:w-1/3 shadow-sm flex items-start gap-4">
              <div className="bg-white rounded-full h-12 w-12 flex items-center justify-center shrink-0 shadow-sm">
                <BankOutlined className="text-2xl text-sky-600" />
              </div>
              <div className="flex flex-col flex-1">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-1">Công ty của bạn</span>
                <span className="text-lg font-bold text-slate-800">{data.tenant_info.name}</span>
                {data.tenant_info.phone && <span className="text-sm text-slate-600 mt-1"><span className="font-semibold text-slate-700">SĐT:</span> {data.tenant_info.phone}</span>}
                {data.tenant_info.address && <span className="text-sm text-slate-600 mt-0.5 line-clamp-2" title={data.tenant_info.address}><span className="font-semibold text-slate-700">Địa chỉ:</span> {data.tenant_info.address}</span>}
              </div>
            </div>
          )}
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

                  <div className="flex flex-nowrap w-full gap-1 xl:gap-2 mt-auto pt-1">
                    {metric.breakdown.map((item) => (
                      <Tag
                        key={`${metric.key}-${item.label}`}
                        color={item.color}
                        className="m-0 flex-1 flex items-center justify-center px-0.5 py-1 sm:px-1 xl:px-2 overflow-hidden"
                      >
                        <span className="font-bold text-xs xl:text-sm shrink-0">{item.value}</span>
                        <span className="ml-0.5 xl:ml-1 text-slate-700 truncate text-[10px] md:text-[9px] lg:text-[10px] xl:text-xs" title={item.label}>{item.label}</span>
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

          {/* Arriving Locations */}
          <div className="bg-white border border-slate-100 shadow-sm rounded-xl p-4 md:p-6 flex flex-col">
            <div className="mb-4">
              <Typography.Title level={4} className="!mb-0 !text-slate-800">
                Địa điểm đang đến
              </Typography.Title>
              <Typography.Text className="text-slate-500">
                Các chặng đang trong quá trình di chuyển
              </Typography.Text>
            </div>
            <Table scroll={{ x: "max-content" }}
              dataSource={data?.arriving_locations}
              rowKey="id"
              pagination={false}
              size="small"
              loading={isLoading}
              className="custom-table overflow-x-auto"
              columns={[
                {
                  title: "Chuyến đi",
                  dataIndex: "trip_name",
                  key: "trip_name",
                  render: (text) => <span className="font-medium text-slate-700">{text}</span>,
                },
                {
                  title: "Chặng / Địa điểm",
                  key: "round_location",
                  render: (_, record) => (
                    <div className="flex flex-col">
                      <span className="text-slate-800 text-sm">{record.round_name}</span>
                      <span className="text-slate-500 text-xs line-clamp-1" title={record.location}>{record.location}</span>
                    </div>
                  ),
                },
                {
                  title: "Cập nhật",
                  dataIndex: "updated_at",
                  key: "updated_at",
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

const Dashboard: React.FC = () => {
  const { data: accountInfo, isLoading: loadingAccount } = useGetAccountInfo();
  const currentUser = accountInfo as IUser | undefined;
  
  const roleName = String(currentUser?.role_name || "").toLowerCase();
  const isAdmin = currentUser?.is_superuser || currentUser?.is_staff || roleName === "admin";

  const { data, isLoading } = useQuery<DashboardOverview>({
    queryKey: ["dashboard-overview"],
    queryFn: getDashboardOverview,
  });

  if (loadingAccount) {
    return <div className="p-8 flex justify-center"><Skeleton active /></div>;
  }

  if (isAdmin) {
    return <AdminDashboard data={data?.admin_overview} isLoading={isLoading} />;
  }

  return <TenantDashboard data={data} isLoading={isLoading} />;
};

export default Dashboard;
