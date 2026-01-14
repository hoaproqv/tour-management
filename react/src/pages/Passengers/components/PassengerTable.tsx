import React, { useMemo } from "react";

import { Button, Card, Empty, Popconfirm, Space, Table } from "antd";
import dayjs from "dayjs";

import { type Passenger, type TripBus } from "../../../api/trips";

import type { ColumnsType } from "antd/es/table";

type PassengerTableProps = {
  data: Passenger[];
  isLoading: boolean;
  deleting: boolean;
  tripMap: Map<string, string>;
  tripBusMap: Map<string, TripBus & { label: string }>;
  onDelete: (_id: string) => void;
  onEdit: (_passenger: Passenger) => void;
};

export default function PassengerTable({
  data,
  isLoading,
  deleting,
  tripMap,
  tripBusMap,
  onDelete,
  onEdit,
}: PassengerTableProps) {
  const columns: ColumnsType<Passenger> = useMemo(
    () => [
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
        title: "Trip",
        dataIndex: "trip",
        render: (val: string) => tripMap.get(val) || "—",
      },
      {
        title: "Xe gốc",
        dataIndex: "original_bus",
        render: (val: string | null) => {
          const match = val ? tripBusMap.get(val) : undefined;
          return match?.label || "—";
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
      {
        title: "Thao tác",
        dataIndex: "actions",
        render: (_: unknown, record: Passenger) => (
          <Space>
            <Button type="link" onClick={() => onEdit(record)}>
              Sửa
            </Button>
            <Popconfirm
              title="Xóa passenger?"
              onConfirm={() => onDelete(record.id)}
              okText="Xóa"
              cancelText="Hủy"
            >
              <Button type="link" danger loading={deleting}>
                Xóa
              </Button>
            </Popconfirm>
          </Space>
        ),
      },
    ],
    [deleting, onDelete, onEdit, tripBusMap, tripMap],
  );

  return (
    <Card className="mt-6" styles={{ body: { padding: 0 } }}>
      <Table
        rowKey="id"
        dataSource={data}
        loading={isLoading}
        pagination={{ pageSize: 10, showSizeChanger: false }}
        scroll={{ x: true }}
        columns={columns}
        locale={{
          emptyText: isLoading ? <span>Đang tải...</span> : <Empty description="Chưa có dữ liệu" />,
        }}
      />
    </Card>
  );
}
