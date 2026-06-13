import React, { useMemo } from "react";

import { DeleteOutlined, EditOutlined } from "@ant-design/icons";
import { Button, Card, Empty, Popconfirm, Table, Tooltip, Space, Tag } from "antd";

import { type Passenger } from "../../../api/trips";

import type { ColumnsType } from "antd/es/table";

type PassengerTableProps = {
  data: Passenger[];
  isLoading: boolean;
  deleting: boolean;
  canManage: boolean;
  onDelete: (_id: string) => void;
  onEdit: (_passenger: Passenger) => void;
  selectedRowKeys?: React.Key[];
  onSelectChange?: (_selectedRowKeys: React.Key[]) => void;
  isSelectionMode?: boolean;
};

export default function PassengerTable({
  data,
  isLoading,
  deleting,
  canManage,
  onDelete,
  onEdit,
  selectedRowKeys = [],
  onSelectChange,
  isSelectionMode,
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
        title: "Ghi chú",
        dataIndex: "note",
        render: (val: string) => val || "—",
      },
      {
        title: "Các chuyến đi",
        dataIndex: "trips",
        render: (trips: Array<{ id: string; name: string }> | undefined) => {
          if (!trips || trips.length === 0) return "—";
          return (
            <div className="flex flex-wrap gap-1 max-w-[250px]">
              {trips.map((t) => (
                <Tag key={t.id} color="cyan">
                  {t.name}
                </Tag>
              ))}
            </div>
          );
        },
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
  }, [canManage, deleting, onDelete, onEdit]);

  return (
    <Card className="mt-6" styles={{ body: { padding: 0 } }}>
      <Table
        size="small"
        rowKey="id"
        rowSelection={
          isSelectionMode && onSelectChange
            ? {
                selectedRowKeys,
                onChange: onSelectChange,
              }
            : undefined
        }
        dataSource={data}
        loading={isLoading}
        pagination={{ defaultPageSize: 10, showSizeChanger: true, pageSizeOptions: ["5", "10", "20", "50"] }}
        scroll={{ x: 'max-content' }}
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
