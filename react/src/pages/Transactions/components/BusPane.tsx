import React from "react";

import {
  ArrowDownOutlined,
  ArrowUpOutlined,
  CheckCircleOutlined,
  LogoutOutlined,
  SearchOutlined,
  EyeOutlined,
} from "@ant-design/icons";
import {
  Alert,
  Button,
  Card,
  Empty,
  Input,
  Popconfirm,
  Space,
  Table,
  Tag,
  Typography,
  Modal,
} from "antd";

import {
  removeAccents,
  compareVietnameseNames,
} from "../../../utils/helper";

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
  onFinalize: (_roundBusId?: string, _snapshotData?: any) => void;
  /** Finalize check-out phase for intermediate stops → opens check-in phase */
  onFinalizeCheckout: (_roundBusId: string, _snapshotData?: any) => void;
  onCheckIn: (_passengerId: string, _roundBusId?: string) => void;
  onCheckOut: (_txn?: TransactionItem) => void;
  onUndoCheckIn: (_txn?: TransactionItem) => void;
  onUndoCheckOut: (_txn?: TransactionItem) => void;
  onCheckOutAll: (_checkedInRows: PassengerRow[]) => void;
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
  onUndoCheckIn,
  onUndoCheckOut,
  onCheckOutAll,
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

  const [searchPresentInput, setSearchPresentInput] = React.useState("");
  const [searchOthersInput, setSearchOthersInput] = React.useState("");
  const [searchPresent, setSearchPresent] = React.useState("");
  const [searchOthers, setSearchOthers] = React.useState("");

  React.useEffect(() => {
    const timer = setTimeout(() => setSearchPresent(searchPresentInput), 300);
    return () => clearTimeout(timer);
  }, [searchPresentInput]);

  React.useEffect(() => {
    const timer = setTimeout(() => setSearchOthers(searchOthersInput), 300);
    return () => clearTimeout(timer);
  }, [searchOthersInput]);

  const filterRow = (r: PassengerRow, term: string) => {
    if (!term) return true;
    const t = removeAccents(term).trim().toLowerCase();
    return (
      removeAccents(r.passenger.name).toLowerCase().includes(t) ||
      removeAccents(r.passenger.phone || "")
        .toLowerCase()
        .includes(t) ||
      removeAccents(r.passenger.note || "")
        .toLowerCase()
        .includes(t) ||
      removeAccents(r.passenger.extra_info || "")
        .toLowerCase()
        .includes(t)
    );
  };

  const presentUnfiltered = rows.filter((r) => r.status === "checkedInHere");
  const othersUnfiltered = rows.filter((r) => {
    if (r.status === "checkedInHere") return false;
    
    if (r.transferredAway) {
      if (r.status === "checkedInElsewhere") return true;
      return false;
    }
    
    return true;
  });

  const sortPassengers = (a: PassengerRow, b: PassengerRow) => {
    if (a.transferredHere && !b.transferredHere) return -1;
    if (!a.transferredHere && b.transferredHere) return 1;

    return compareVietnameseNames(a.passenger.name, b.passenger.name);
  };

  const sortedPresentUnfiltered = [...presentUnfiltered].sort(sortPassengers);
  const sortedOthersUnfiltered = [...othersUnfiltered].sort(sortPassengers);

  const present = sortedPresentUnfiltered.filter((r) => filterRow(r, searchPresent));
  const others = sortedOthersUnfiltered.filter((r) => filterRow(r, searchOthers));

  const pendingRows = rows.filter(
    (r) =>
      r.isOwnedByBus && (r.status === "pending" || r.status === "checkedOut"),
  );

  /** Passengers still on the bus who need to check out (checkout phase) */
  const stillOnBus = presentUnfiltered.filter((r) => r.isOwnedByBus);

  const renderActions = (row: PassengerRow) => {
    if (!row.transaction && !row.isOwnedByBus) {
      return <Text type="secondary">Chưa cấu hình round-bus</Text>;
    }
    if (!row.isOwnedByBus) {
      return (
        <Tag color="purple">
          Đã chuyển sang {row.transferTargetLabel || "xe khác"}
        </Tag>
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
            style={{
              borderColor: "#f97316",
              color: "#f97316",
              background: "#fff7ed",
            }}
          >
            Điểm danh xuống
          </Button>
        );
      }
      if (row.status === "checkedOut" && row.transaction) {
        return (
          <div className="flex flex-col items-center gap-1">
            <Text type="secondary" className="text-xs">Đã xuống xe</Text>
            <Button type="link" danger size="small" className="p-0 h-auto text-xs" onClick={() => onUndoCheckOut(row.transaction)} loading={busy}>Hủy</Button>
          </div>
        );
      }
      // Already checked out or not yet on bus — no action in this phase
      return (
        <Text type="secondary" className="text-xs">
          —
        </Text>
      );
    }

    // ── Phase: check-in only (first round or checkin phase of middle round) ──
    if (row.status === "checkedInHere") {
      if (row.transaction) {
        return (
          <div className="flex flex-col items-center gap-1">
            <Text type="secondary" className="text-xs">Đã lên xe</Text>
            <Button type="link" danger size="small" className="p-0 h-auto text-xs" onClick={() => onUndoCheckIn(row.transaction)} loading={busy}>Hủy</Button>
          </div>
        );
      }
      // Already on bus in checkin phase — show nothing useful
      return (
        <Text type="secondary" className="text-xs">
          Đã lên xe
        </Text>
      );
    }
    // If checkedInElsewhere, just render the default check-in button
    // as per the new logic requirement.
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

  const showPassengerDetails = (passenger: any) => {
    Modal.info({
      title: "Thông tin hành khách",
      content: (
        <div className="mt-4 space-y-2">
          <div>
            <Text strong>Tên:</Text> {passenger.name}
          </div>
          <div>
            <Text strong>Số điện thoại:</Text> {passenger.phone || "—"}
          </div>
          {passenger.extra_info && (
            <div>
              <Text strong>Thông tin thêm:</Text> {passenger.extra_info}
            </div>
          )}
          <div>
            <Text strong>Ghi chú:</Text> {passenger.note || <Text type="secondary" italic>Không có</Text>}
          </div>
        </div>
      ),
      okText: "Đóng",
      maskClosable: true,
    });
  };

  const baseColumns = [
    {
      title: "Hành khách",
      dataIndex: "passenger",
      render: (_: unknown, row: PassengerRow) => (
        <div>
          <div className="flex items-stretch justify-between min-h-[24px]">
            <div className="font-semibold text-slate-900 text-sm flex items-center">
              {row.passenger.name}
            </div>
            <Button
              type="text"
              icon={<EyeOutlined className="text-slate-500" />}
              onClick={() => showPassengerDetails(row.passenger)}
              title="Xem chi tiết"
              className="flex items-center justify-center h-auto p-1"
            />
          </div>
        </div>
      ),
    },
    {
      title: "Trạng thái",
      dataIndex: "status",
      render: (_: unknown, row: PassengerRow) => (
        <Space direction="vertical" size={2}>
          {statusTag(row)}
          {!row.isOwnedByBus && readOnlyBus && (
            <div className="text-xs text-purple-600 mt-0.5">
              Đã chuyển sang {row.transferTargetLabel || "xe khác"}
            </div>
          )}
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
            const snapshotData = { rows };
            if (phase === "checkout-only") {
              onFinalize(roundBusId, snapshotData);
            } else {
              onFinalizeCheckout(roundBusId, snapshotData);
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
        onClick={() => {
          const snapshotData = { rows };
          onFinalize(roundBusId, snapshotData);
        }}
      >
        Chốt điểm danh lên
      </Button>
    );
  };

  const presentCount = presentUnfiltered.length;
  const othersCount = othersUnfiltered.filter((r) => r.isOwnedByBus).length;
  const transferredAwayCount = othersUnfiltered.filter((r) => !r.isOwnedByBus).length;

  return (
    <div className="space-y-3">
      {/* Phase banner */}
      {phaseBanner()}

      {/* Counts + action bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Space size="small" wrap>
          <Tag color="green">Đang trên xe: {presentCount}</Tag>
          <Tag color="blue">Chưa lên xe: {othersCount}</Tag>
          {transferredAwayCount > 0 && (
            <Tag color="purple">Đã sang xe khác: {transferredAwayCount}</Tag>
          )}
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
        {(phase === "checkin-only" ||
          phase === "checkin" ||
          phase === "checkout" ||
          phase === "checkout-only") && (
          <Card
            title={
              <div className="flex items-center gap-4 py-1">
                <span className="flex items-center gap-2 font-medium whitespace-nowrap">
                  <ArrowUpOutlined className="text-green-600" />
                  Đang trên xe
                </span>
                <Input
                  prefix={<SearchOutlined className="text-slate-400" />}
                  placeholder="Tìm nhanh..."
                  allowClear
                  value={searchPresentInput}
                  onChange={(e) => setSearchPresentInput(e.target.value)}
                  size="small"
                  className="font-normal w-32 sm:w-48"
                />
              </div>
            }
            size="small"
            styles={{ body: { padding: 0 } }}
            extra={
              !readOnlyBus &&
              canModifyAttendance &&
              presentUnfiltered.length > 0 &&
              (phase === "checkout" || phase === "checkout-only") ? (
                <Popconfirm
                  title={`Điểm danh xuống ${presentUnfiltered.length} hành khách?`}
                  description="Tất cả hành khách đang trên xe sẽ được điểm danh xuống."
                  okText="Xuống tất cả"
                  cancelText="Hủy"
                  okButtonProps={{
                    style: { background: "#f97316", borderColor: "#f97316" },
                  }}
                  onConfirm={() => onCheckOutAll(presentUnfiltered)}
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
            <Table
              scroll={{ x: "max-content" }}
              size="small"
              rowKey="key"
              dataSource={present}
              columns={columns}
              rowClassName={(record) => {
                if (record.transferredHere)
                  return "bg-pink-50 border-l-4 border-pink-400";
                if (record.transferredAway)
                  return "bg-purple-50 border-l-4 border-purple-400 opacity-80";
                return "";
              }}
              pagination={false}
              loading={loading}
              locale={{ emptyText: <Empty description="Chưa có ai trên xe" /> }}
            />
          </Card>
        )}

        {/* Panel: Chưa điểm danh / đã xuống / xe khác */}
        <Card
          title={
            <div className="flex items-center gap-4 py-1">
              <span className="flex items-center gap-2 font-medium whitespace-nowrap">
                <ArrowDownOutlined className="text-blue-500" />
                Chưa lên xe
              </span>
              <Input
                prefix={<SearchOutlined className="text-slate-400" />}
                placeholder="Tìm nhanh..."
                allowClear
                value={searchOthersInput}
                onChange={(e) => setSearchOthersInput(e.target.value)}
                size="small"
                className="font-normal w-32 sm:w-48"
              />
            </div>
          }
          size="small"
          styles={{ body: { padding: 0 } }}
        >
          <Table
            scroll={{ x: "max-content" }}
            size="small"
            rowKey="key"
            dataSource={others}
            columns={columns}
            rowClassName={(record) => {
              if (record.transferredHere)
                return "bg-pink-50 border-l-4 border-pink-400";
              if (record.transferredAway)
                return "bg-purple-50 border-l-4 border-purple-400 opacity-80";
              return "";
            }}
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
