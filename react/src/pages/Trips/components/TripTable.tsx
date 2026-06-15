import React from "react";

import { ApartmentOutlined, CarOutlined, DeleteOutlined, EditOutlined, TeamOutlined } from "@ant-design/icons";
import { Button, Empty, Popconfirm, Space, Table, Tag, Tooltip } from "antd";

import type { EnrichedTrip } from "./types";
import type { Trip } from "../../../api/trips";

interface TripTableProps {
  trips: EnrichedTrip[];
  loading: boolean;
  statusMeta: Record<Trip["status"], { label: string; color: string }>;
  onEdit: (_trip: EnrichedTrip) => void;
  onViewRounds: (_trip: EnrichedTrip) => void;
  onViewBuses: (_trip: EnrichedTrip) => void;
  onAssignPassengers: (_trip: EnrichedTrip) => void;
  onDelete: (_trip: EnrichedTrip) => void;
  canManage?: boolean;
  selectedRowKeys?: React.Key[];
  onSelectChange?: (_selectedRowKeys: React.Key[]) => void;
  isSelectionMode?: boolean;
}

export default function TripTable({
  trips,
  loading,
  statusMeta,
  onEdit,
  onViewRounds,
  onViewBuses,
  onAssignPassengers,
  onDelete,
  canManage = true,
  selectedRowKeys = [],
  onSelectChange,
  isSelectionMode,
}: TripTableProps) {
  return (
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
      dataSource={trips}
      loading={loading}
      pagination={{ defaultPageSize: 10, showSizeChanger: true, pageSizeOptions: ["5", "10", "20", "50"] }}
      scroll={{ x: 'max-content' }}
      columns={[
        {
          title: "Tên",
          dataIndex: "name",
          render: (_: unknown, record: EnrichedTrip) => (
            <div>
              <div className="font-semibold text-slate-900">{record.name}</div>
              <div className="text-xs text-slate-500 mt-1">
                {record.start_date} → {record.end_date}
              </div>
            </div>
          ),
        },
        {
          title: "Mô tả",
          dataIndex: "description",
          render: (val: string) => <span className="text-slate-600">{val || "—"}</span>,
        },
        {
          title: "Số xe",
          dataIndex: "busCount",
          render: (_: number, record: EnrichedTrip) => <Tag color="processing">{record.busCount}</Tag>,
        },
        {
          title: "Số round",
          dataIndex: "roundCount",
          render: (_: number, record: EnrichedTrip) => <Tag color="geekblue">{record.roundCount}</Tag>,
        },
        {
          title: "Tình trạng",
          dataIndex: "status",
          render: (val: Trip["status"]) => {
            const meta = statusMeta[val];
            return (
              <Tooltip title="Trạng thái được cập nhật tự động theo giao dịch">
                <Tag color={meta.color}>{meta.label}</Tag>
              </Tooltip>
            );
          },
        },
        {
          title: "Thao tác",
          dataIndex: "actions",
          render: (_: unknown, record: EnrichedTrip) => (
            <Space>
              {canManage && (
                <Tooltip title="Sửa trip">
                  <Button
                    type="text"
                    icon={<EditOutlined />}
                    onClick={() => onEdit(record)}
                    style={{ color: "#2563eb" }}
                  />
                </Tooltip>
              )}
              {canManage && (
                <Popconfirm
                  title="Xóa trip?"
                  description="Xóa trip sẽ xóa kèm round, bus và phân công liên quan."
                  okText="Xóa"
                  cancelText="Hủy"
                  onConfirm={() => onDelete(record)}
                >
                  <Tooltip title="Xóa trip">
                    <Button
                      type="text"
                      danger
                      icon={<DeleteOutlined />}
                    />
                  </Tooltip>
                </Popconfirm>
              )}
              <Tooltip title="Xem Hành khách">
                <Button
                  type="text"
                  icon={<TeamOutlined />}
                  onClick={() => onAssignPassengers(record)}
                  style={{ color: "#16a34a" }}
                />
              </Tooltip>
              <Tooltip title="Xem hành trình">
                <Button
                  type="text"
                  icon={<ApartmentOutlined />}
                  onClick={() => onViewRounds(record)}
                  style={{ color: "#f59e0b" }}
                />
              </Tooltip>
              <Tooltip title="Xem Xe khách">
                <Button
                  type="text"
                  icon={<CarOutlined />}
                  onClick={() => onViewBuses(record)}
                  style={{ color: "#0ea5e9" }}
                />
              </Tooltip>
            </Space>
          ),
        },
      ]}
      locale={{
        emptyText: loading ? <span>Đang tải...</span> : <Empty description="Chưa có dữ liệu" />,
      }}
    />
  );
}
