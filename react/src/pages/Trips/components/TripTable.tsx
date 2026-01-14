import React from "react";

import { Button, Empty, Space, Table, Tag } from "antd";

import type { EnrichedTrip } from "./types";
import type { Trip } from "../../../api/trips";

interface TripTableProps {
  trips: EnrichedTrip[];
  loading: boolean;
  statusMeta: Record<Trip["status"], { label: string; color: string }>;
  onEdit: (_trip: EnrichedTrip) => void;
  onViewRounds: (_trip: EnrichedTrip) => void;
  onViewBuses: (_trip: EnrichedTrip) => void;
  canManage?: boolean;
}

export default function TripTable({
  trips,
  loading,
  statusMeta,
  onEdit,
  onViewRounds,
  onViewBuses,
  canManage = true,
}: TripTableProps) {
  return (
    <Table
      rowKey="id"
      dataSource={trips}
      loading={loading}
      pagination={{ pageSize: 8, showSizeChanger: false }}
      scroll={{ x: true }}
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
            return <Tag color={meta.color}>{meta.label}</Tag>;
          },
        },
        {
          title: "Thao tác",
          dataIndex: "actions",
          render: (_: unknown, record: EnrichedTrip) => (
            <Space>
              {canManage && (
                <Button type="link" onClick={() => onEdit(record)}>
                  Sửa
                </Button>
              )}
              <Button type="link" onClick={() => onViewRounds(record)}>
                Xem Round liên quan
              </Button>
              <Button type="link" onClick={() => onViewBuses(record)}>
                Xem Bus liên quan
              </Button>
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
