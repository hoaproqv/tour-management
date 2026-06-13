import React from "react";

import {
  ArrowDownOutlined,
  ArrowUpOutlined,
  CheckCircleOutlined,
  LogoutOutlined,
  SwapOutlined,
} from "@ant-design/icons";
import {
  Alert,
  Button,
  Card,
  Empty,
  Popconfirm,
  Space,
  Table,
  Tag,
  Typography,
} from "antd";
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
  /** Finalize check-in phase (first round: finalize whole, middle/last: finalize after checkin) */
  onFinalize: (_roundBusId?: string) => void;
  /** Finalize check-out phase for intermediate stops → opens check-in phase */
  onFinalizeCheckout: (_roundBusId: string) => void;
  onCheckIn: (_passengerId: string, _roundBusId?: string) => void;
  onCheckOut: (_txn?: TransactionItem) => void;
  onCheckOutAll: (_checkedInRows: PassengerRow[]) => void;
  onSwitchBus: (
    _passengerId: string,
    _txn: TransactionItem | undefined,
    _roundBusId?: string,
  ) => void;
  busy: boolean;
  /** Position of this round within the trip's ordered stops */
  roundPosition: "first" | "middle" | "last";
  /** For middle rounds: true after "Chốt điểm danh xuống" was clicked */
  checkoutPhaseFinalized: boolean;
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
  onFinalizeCheckout,
  onCheckIn,
  onCheckOut,
  onCheckOutAll,
  onSwitchBus,
  busy,
  roundPosition,
  checkoutPhaseFinalized,
}: BusPaneProps) {
  // Determine current phase for this round-bus
  // first  → checkin-only
  // last   → checkout-only
  // middle → checkout phase first, then checkin phase after checkoutPhaseFinalized
  const phase: "checkin-only" | "checkout-only" | "checkout" | "checkin" =
    roundPosition === "first"
      ? "checkin-only"
      : roundPosition === "last"
        ? "checkout-only"
        : checkoutPhaseFinalized
          ? "checkin"
          : "checkout";

  const present = rows.filter((r) => r.status === "checkedInHere");
  const others = rows.filter((r) => r.status !== "checkedInHere");
  const pendingRows = rows.filter(
    (r) => r.isOwnedByBus && (r.status === "pending" || r.status === "checkedOut"),
  );

  /** Passengers still on the bus who need to check out (checkout phase) */
  const stillOnBus = present.filter((r) => r.isOwnedByBus);

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

    // ── Phase: check-out only (last round or checkout phase of middle round) ──
    if (phase === "checkout-only" || phase === "checkout") {
      if (row.status === "checkedInHere") {
        return (
          <Button
            size="small"
            icon={<ArrowDownOutlined />}
            onClick={() => onCheckOut(row.transaction)}
            loading={busy}
            style={{ borderColor: "#f97316", color: "#f97316", background: "#fff7ed" }}
          >
            Điểm danh xuống
          </Button>
        );
      }
      // Already checked out or not yet on bus — no action in this phase
      return <Text type="secondary" className="text-xs">—</Text>;
    }

    // ── Phase: check-in only (first round or checkin phase of middle round) ──
    if (row.status === "checkedInHere") {
      // Already on bus in checkin phase — show nothing useful
      return <Text type="secondary" className="text-xs">Đã lên xe</Text>;
    }
    if (row.status === "checkedInElsewhere") {
      return (
        <Button
          size="small"
          icon={<SwapOutlined />}
          onClick={() => onSwitchBus(row.passenger.id, row.transaction, roundBusId)}
          loading={busy}
        >
          Chuyển sang xe này
        </Button>
      );
    }
    return (
      <Button
        type="primary"
        size="small"
        icon={<ArrowUpOutlined />}
        onClick={() => onCheckIn(row.passenger.id, roundBusId)}
        loading={busy}
        style={{ background: "#16a34a", borderColor: "#16a34a" }}
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
          width: 190,
        },
      ];

  // ── Phase description banner ──
  const phaseBanner = () => {
    if (busFinalized) {
      return (
        <Alert
          type="success"
          icon={<CheckCircleOutlined />}
          message="Đã chốt điểm danh. Không thể chỉnh sửa."
          banner
          className="rounded-lg"
        />
      );
    }
    if (phase === "checkin-only") {
      return (
        <Alert
          type="info"
          icon={<ArrowUpOutlined />}
          message="Điểm xuất phát — chỉ điểm danh lên xe"
          banner
          className="rounded-lg"
        />
      );
    }
    if (phase === "checkout-only") {
      return (
        <Alert
          type="warning"
          icon={<ArrowDownOutlined />}
          message="Điểm cuối — chỉ điểm danh xuống xe"
          banner
          className="rounded-lg"
        />
      );
    }
    if (phase === "checkout") {
      return (
        <Alert
          type="warning"
          icon={<ArrowDownOutlined />}
          message="Đang ở điểm dừng — hãy điểm danh xuống trước, rồi chốt để mở điểm danh lên"
          banner
          className="rounded-lg"
        />
      );
    }
    // phase === "checkin"
    return (
      <Alert
        type="success"
        icon={<ArrowUpOutlined />}
        message="Đã chốt điểm danh xuống — hãy điểm danh lên cho hành khách tiếp tục"
        banner
        className="rounded-lg"
      />
    );
  };

  // ── Finalize button label & action ──
  const renderFinalizeButton = () => {
    if (!roundBusId || readOnlyBus || busFinalized) return null;

    if (phase === "checkout" || phase === "checkout-only") {
      const allOut = stillOnBus.length === 0;
      return (
        <Button
          danger
          disabled={!canModifyAttendance || !allOut}
          icon={<ArrowDownOutlined />}
          onClick={() => {
            if (phase === "checkout-only") {
              onFinalize(roundBusId);
            } else {
              onFinalizeCheckout(roundBusId);
            }
          }}
        >
          {phase === "checkout-only"
            ? "Chốt điểm danh xuống"
            : "Chốt điểm danh xuống — mở lên xe"}
        </Button>
      );
    }

    // phase === "checkin-only" or "checkin"
    const allBoarded = pendingRows.length === 0;
    return (
      <Button
        type="primary"
        disabled={!canModifyAttendance || !allBoarded}
        icon={<CheckCircleOutlined />}
        style={
          canModifyAttendance && allBoarded
            ? { background: "#16a34a", borderColor: "#16a34a" }
            : {}
        }
        onClick={() => onFinalize(roundBusId)}
      >
        Chốt điểm danh lên
      </Button>
    );
  };

  return (
    <div className="space-y-3">
      {/* Phase banner */}
      {phaseBanner()}

      {/* Counts + action bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Space size="small" wrap>
          <Tag color="green">Đang trên xe: {present.length}</Tag>
          <Tag color="blue">Chưa/đã xuống: {others.length}</Tag>
          {busFinalized && <Tag color="green">Đã chốt</Tag>}
          {!busFinalized && blockReason && <Tag color="red">{blockReason}</Tag>}
        </Space>
        {!readOnlyBus && (
          <Space wrap>
            {phase !== "checkout" && phase !== "checkout-only" && (
              <Button
                disabled={!canModifyAttendance || !roundBusId}
                onClick={onOpenCrossCheck}
              >
                Điểm danh thành viên xe khác
              </Button>
            )}
            {renderFinalizeButton()}
          </Space>
        )}
      </div>

      {!roundBusId && (
        <Card size="small" type="inner">
          Chưa có round-bus cho vòng này. Tạo round-bus trước để điểm danh.
        </Card>
      )}

      {/* Passenger tables — show based on phase */}
      <div className="grid md:grid-cols-2 gap-3">
        {/* Panel: Đang trên xe */}
        {(phase === "checkin-only" || phase === "checkin" || phase === "checkout" || phase === "checkout-only") && (
          <Card
            title={
              <span className="flex items-center gap-2">
                <ArrowUpOutlined className="text-green-600" />
                Đang trên xe
              </span>
            }
            size="small"
            styles={{ body: { padding: 0 } }}
            extra={
              !readOnlyBus &&
              canModifyAttendance &&
              present.length > 0 &&
              (phase === "checkout" || phase === "checkout-only") ? (
                <Popconfirm
                  title={`Điểm danh xuống ${present.length} hành khách?`}
                  description="Tất cả hành khách đang trên xe sẽ được điểm danh xuống."
                  okText="Xuống tất cả"
                  cancelText="Hủy"
                  okButtonProps={{ style: { background: "#f97316", borderColor: "#f97316" } }}
                  onConfirm={() => onCheckOutAll(present)}
                >
                  <Button
                    size="small"
                    icon={<LogoutOutlined />}
                    loading={busy}
                    style={{ borderColor: "#f97316", color: "#f97316" }}
                  >
                    Xuống tất cả
                  </Button>
                </Popconfirm>
              ) : null
            }
          >
            <Table scroll={{ x: "max-content" }}
              size="small"
              rowKey="key"
              dataSource={present}
              columns={columns}
              pagination={false}
              loading={loading}
              locale={{ emptyText: <Empty description="Chưa có ai trên xe" /> }}
            />
          </Card>
        )}

        {/* Panel: Chưa điểm danh / đã xuống / xe khác */}
        <Card
          title={
            <span className="flex items-center gap-2">
              <ArrowDownOutlined className="text-blue-500" />
              {phase === "checkout" || phase === "checkout-only"
                ? "Đã xuống / chưa lên"
                : "Chưa điểm danh / đã xuống / đang ở xe khác"}
            </span>
          }
          size="small"
          styles={{ body: { padding: 0 } }}
        >
          <Table scroll={{ x: "max-content" }}
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
