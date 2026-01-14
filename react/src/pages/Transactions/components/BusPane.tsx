import React from "react";

import { Button, Card, Empty, Space, Table, Tag, Typography } from "antd";
import dayjs from "dayjs";

import type { PassengerRow } from "./types";
import type { TransactionItem } from "../../../api/trips";

const { Text } = Typography;

interface BusPaneProps {
  roundBusId?: string;
  rows: PassengerRow[];
  loading: boolean;
  busFinalized: boolean;
  blockReason?: string;
  readOnlyBus: boolean;
  canModifyAttendance: boolean;
  statusTag: (_row: PassengerRow) => React.ReactNode;
  onOpenCrossCheck: () => void;
  onFinalize: (_roundBusId?: string) => void;
  onCheckIn: (_passengerId: string, _roundBusId?: string) => void;
  onCheckOut: (_txn?: TransactionItem) => void;
  onSwitchBus: (_passengerId: string, _txn: TransactionItem | undefined, _roundBusId?: string) => void;
  busy: boolean;
}

export function BusPane({
  roundBusId,
  rows,
  loading,
  busFinalized,
  blockReason,
  readOnlyBus,
  canModifyAttendance,
  statusTag,
  onOpenCrossCheck,
  onFinalize,
  onCheckIn,
  onCheckOut,
  onSwitchBus,
  busy,
}: BusPaneProps) {
  const present = rows.filter((r) => r.status === "checkedInHere");
  const others = rows.filter((r) => r.status !== "checkedInHere");

  const actionableRows = rows.filter((r) => r.isOwnedByBus);
  const missingRows = actionableRows.filter(
    (r) => r.status === "pending" || r.status === "checkedOut",
  );
  const readyToFinalize = missingRows.length === 0;

  const renderActions = (row: PassengerRow) => {
    if (readOnlyBus) {
      return <Text type="secondary">Chỉ xem</Text>;
    }

    if (!roundBusId) {
      return <Text type="secondary">Chưa cấu hình round-bus</Text>;
    }

    if (!row.isOwnedByBus) {
      return (
        <Text type="secondary">
          Đã chuyển sang {row.transferTargetLabel || "xe khác"}
        </Text>
      );
    }

    if (!canModifyAttendance) {
      return <Text type="secondary">{blockReason || "Đang bị khoá"}</Text>;
    }

    if (row.status === "checkedInHere") {
      return (
        <Button
          size="small"
          onClick={() => onCheckOut(row.transaction)}
          loading={busy}
        >
          Điểm danh xuống
        </Button>
      );
    }

    if (row.status === "checkedInElsewhere") {
      return (
        <Space>
          <Button
            size="small"
            onClick={() => onSwitchBus(row.passenger.id, row.transaction, roundBusId)}
            loading={busy}
          >
            Chuyển sang xe này
          </Button>
        </Space>
      );
    }

    return (
      <Button
        type="primary"
        size="small"
        onClick={() => onCheckIn(row.passenger.id, roundBusId)}
        loading={busy}
      >
        Điểm danh lên
      </Button>
    );
  };

  const baseColumns = [
    {
      title: "Hành khách",
      dataIndex: "passenger",
      render: (_: unknown, row: PassengerRow) => (
        <div>
          <div className="font-semibold text-slate-900">{row.passenger.name}</div>
          <div className="text-xs text-slate-500">{row.passenger.phone || "—"}</div>
          {row.passenger.note ? (
            <div className="text-xs text-slate-500">{row.passenger.note}</div>
          ) : null}
        </div>
      ),
    },
    {
      title: "Trạng thái",
      dataIndex: "status",
      render: (_: unknown, row: PassengerRow) => (
        <Space direction="vertical" size={2}>
          {statusTag(row)}
          {row.transaction ? (
            <Text type="secondary" className="text-xs">
              {row.transaction.check_out
                ? `Xuống: ${dayjs(row.transaction.check_out).format("HH:mm:ss")}`
                : `Lên: ${dayjs(row.transaction.check_in).format("HH:mm:ss")}`}
            </Text>
          ) : null}
        </Space>
      ),
    },
  ];

  const columns = readOnlyBus
    ? baseColumns
    : [
        ...baseColumns,
        {
          title: "Hành động",
          dataIndex: "actions",
          render: (_: unknown, row: PassengerRow) => renderActions(row),
          width: 180,
        },
      ];

  return (
    <div className="space-y-3">
      <Space size="small" wrap>
        <Tag color="blue">Chưa/đã xuống: {others.length}</Tag>
        <Tag color="green">Đang trên xe: {present.length}</Tag>
        {busFinalized && <Tag color="green">Đã chốt</Tag>}
        {!busFinalized && blockReason && <Tag color="red">{blockReason}</Tag>}
      </Space>
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div className="space-y-1">
          {!readyToFinalize && !busFinalized && (
            <Text type="secondary">
              Còn {missingRows.length} khách chưa lên xe nào ở round này.
            </Text>
          )}
          {busFinalized && (
            <Text strong type="success">
              Đã chốt điểm danh. Không thể chỉnh sửa.
            </Text>
          )}
        </div>
        {!readOnlyBus && (
          <Space wrap>
            <Button
              disabled={!canModifyAttendance || !roundBusId}
              onClick={onOpenCrossCheck}
            >
              Điểm danh thành viên xe khác
            </Button>
            <Button
              type="primary"
              disabled={!readyToFinalize || !canModifyAttendance}
              onClick={() => onFinalize(roundBusId)}
            >
              Chốt điểm danh
            </Button>
          </Space>
        )}
      </div>
      {!roundBusId && (
        <Card size="small" type="inner">
          Chưa có round-bus cho vòng này. Tạo round-bus trước để điểm danh.
        </Card>
      )}
      <div className="grid md:grid-cols-2 gap-3">
        <Card
          title="Đang trên xe"
          size="small"
          styles={{ body: { padding: 0 } }}
        >
          <Table
            size="small"
            rowKey="key"
            dataSource={present}
            columns={columns}
            pagination={false}
            loading={loading}
            locale={{ emptyText: <Empty description="Chưa có ai trên xe" /> }}
          />
        </Card>
        <Card
          title="Chưa điểm danh / đã xuống / đang ở xe khác"
          size="small"
          styles={{ body: { padding: 0 } }}
        >
          <Table
            size="small"
            rowKey="key"
            dataSource={others}
            columns={columns}
            pagination={false}
            loading={loading}
            locale={{
              emptyText: <Empty description="Không có hành khách" />,
            }}
          />
        </Card>
      </div>
    </div>
  );
}

export default BusPane;
