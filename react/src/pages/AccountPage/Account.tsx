import React from "react";

import { Card, Descriptions, Skeleton, Tag } from "antd";

import { useGetAccountInfo } from "../../hooks/useAuth";

import type { IUser } from "../../utils/types";

export const Account = () => {
  const { data: user, isLoading } = useGetAccountInfo();
  const userData = user as IUser | undefined;

  const renderValue = (value?: string | number | null) => value ?? "—";

  const statusTag = !userData ? (
    "—"
  ) : userData.is_active ? (
    <Tag color="green">Active</Tag>
  ) : (
    <Tag color="red">Inactive</Tag>
  );

  return (
    <div className="w-full bg-[#f4f7fb] min-h-screen p-6">
      <div className="bg-white shadow-sm rounded-2xl p-6 border border-slate-100">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.25em] text-sky-700 font-semibold">
              User Center
            </p>
            <h1 className="text-4xl font-bold text-slate-900 mt-3">
              Hồ sơ tài khoản
            </h1>
            <p className="text-slate-500 mt-2">
              Thông tin chi tiết người dùng trong hệ thống tour management.
            </p>
          </div>
        </div>

        <Card
          title={
            <span className="text-slate-900 font-semibold">
              Thông tin người dùng
            </span>
          }
          className="mt-8 bg-[#e5f2ff] border border-[#c5dff8] shadow-none"
          styles={{
            header: {
              backgroundColor: "#e5f2ff",
              borderBottom: "1px solid #c5dff8",
            },
            body: { backgroundColor: "white", borderRadius: 12, padding: 24 },
          }}
        >
          {isLoading ? (
            <Skeleton active paragraph={{ rows: 6 }} />
          ) : (
            <Descriptions
              column={{ xs: 1, sm: 1, md: 2 }}
              bordered
              styles={{
                label: {
                  width: "32%",
                  backgroundColor: "#f9fafb",
                  whiteSpace: "normal",
                  wordBreak: "break-word",
                },
                content: {
                  backgroundColor: "#fff",
                  whiteSpace: "normal",
                  wordBreak: "break-word",
                },
              }}
            >
              <Descriptions.Item label="Tên đăng nhập">
                {renderValue(userData?.username)}
              </Descriptions.Item>
              <Descriptions.Item label="Họ và tên">
                {renderValue(userData?.name)}
              </Descriptions.Item>
              <Descriptions.Item label="Email">
                {renderValue(userData?.email)}
              </Descriptions.Item>
              <Descriptions.Item label="Tenant">
                {renderValue(userData?.tenant)}
              </Descriptions.Item>
              <Descriptions.Item label="Role">
                {renderValue(userData?.role)}
              </Descriptions.Item>
              <Descriptions.Item label="Trạng thái">
                {statusTag}
              </Descriptions.Item>
            </Descriptions>
          )}
        </Card>
      </div>
    </div>
  );
};

export default Account;
