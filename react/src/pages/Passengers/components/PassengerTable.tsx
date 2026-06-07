import React, { useMemo } from "react";

import { DeleteOutlined, EditOutlined } from "@ant-design/icons";
import { Button, Card, Empty, Popconfirm, Table, Tooltip, Space } from "antd";
import dayjs from "dayjs";

import { type Passenger, type TripBus } from "../../../api/trips";

import type { ColumnsType } from "antd/es/table";

type PassengerTableProps = {
  data: Passenger[];
  isLoading: boolean;
  deleting: boolean;
  tripBusMap: Map<string, TripBus & { label: string }>;
  selectedTripId: string | "all";
  canManage: boolean;
  onDelete: (_id: string) => void;
  onEdit: (_passenger: Passenger) => void;
};

export default function PassengerTable({
  data,
  isLoading,
  deleting,
  tripBusMap,
  selectedTripId,
  canManage,
  onDelete,
  onEdit,
}: PassengerTableProps) {
  const columns: ColumnsType<Passenger> = useMemo(() => {
    const base: ColumnsType<Passenger> = [
      {
        title: "Tên",
        dataIndex: "name",
      },
      {
        title: "Điện thoại",
        dataIndex: "phone",
        render: (val: string) => val || "—",
      },
      {
        title: "Xe (trip đã lọc)",
        dataIndex: "assigned_trip_bus",
        render: (val: string | null) => {
          if (selectedTripId === "all") return "—";
          if (!val) return "Chưa gán";
          return tripBusMap.get(val)?.label || "—";
        },
      },
      {
        title: "Ghi chú",
        dataIndex: "note",
        render: (val: string) => val || "—",
      },
      {
        title: "Tạo lúc",
        dataIndex: "created_at",
        render: (val: string) => dayjs(val).format("DD/MM/YYYY HH:mm"),
      },
    ];

    if (!canManage) return base;

    return [
      ...base,
      {
        title: "Thao tác",
        dataIndex: "actions",
        render: (_: unknown, record: Passenger) => (
          <Space>
            <Tooltip title="Sửa">
              <Button
                type="text"
                icon={<EditOutlined />}
                onClick={() => onEdit(record)}
                style={{ color: "#2563eb" }}
              />
            </Tooltip>
            <Popconfirm
              title="Xóa hành khách?"
              description="Thao tác này không thể hoàn tác."
              onConfirm={() => onDelete(record.id)}
              okText="Xóa"
              cancelText="Hủy"
            >
              <Tooltip title="Xóa">
                <Button
                  type="text"
                  danger
                  icon={<DeleteOutlined />}
                  loading={deleting}
                />
              </Tooltip>
            </Popconfirm>
          </Space>
        ),
      },
    ];
  }, [canManage, deleting, onDelete, onEdit, selectedTripId, tripBusMap]);

  return (
    <Card className="mt-6" styles={{ body: { padding: 0 } }}>
      <Table
        size="small"
        rowKey="id"
        dataSource={data}
        loading={isLoading}
        pagination={{ pageSize: 10, showSizeChanger: false }}
        scroll={{ x: true }}
        columns={columns}
        locale={{
          emptyText: isLoading ? (
            <span>Đang tải...</span>
          ) : (
            <Empty description="Chưa có dữ liệu" />
          ),
        }}
      />
    </Card>
  );
}
