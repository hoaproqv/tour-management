import React from "react";

import { Button, Empty, Modal, Space, Table, Tabs } from "antd";

import type { PassengerRow } from "./types";
import type { TripBus } from "../../../api/trips";

interface CrossCheckModalProps {
  open: boolean;
  onClose: () => void;
  tripScopedTripBuses: TripBus[];
  targetBusId: string | null;
  rowsForBus: (_tripBusId: string) => PassengerRow[];
  tripBusLabelMap: Map<string, string>;
  roundLockedBySequence: boolean;
  roundAlreadyFinalized: boolean;
  activeRoundId?: string;
  roundBusIdFor: (_roundId: string | undefined, _tripBusId: string | undefined) => string | undefined;
  passengerTransfers: Record<string, Record<string, string>>;
  activeTripId?: string;
  statusTag: (_row: PassengerRow) => React.ReactNode;
  onPerform: (_passengerId: string) => void;
  onUndo: (_passengerId: string, _sourceTripBusId: string) => void;
}

export function CrossCheckModal({
  open,
  onClose,
  tripScopedTripBuses,
  targetBusId,
  rowsForBus,
  roundLockedBySequence,
  roundAlreadyFinalized,
  activeRoundId,
  roundBusIdFor,
  tripBusLabelMap,
  passengerTransfers,
  activeTripId,
  statusTag,
  onPerform,
  onUndo,
}: CrossCheckModalProps) {
  if (!targetBusId) {
    return (
      <Modal title="Điểm danh thành viên xe khác" open={open} onCancel={onClose} footer={null} width={860}>
        <Empty description="Chọn xe cần nhận thành viên" />
      </Modal>
    );
  }

  const targetRoundBusId = roundBusIdFor(activeRoundId, targetBusId);

  return (
    <Modal title="Điểm danh thành viên xe khác" open={open} onCancel={onClose} footer={null} width={860}>
      <Tabs
        items={tripScopedTripBuses
          .filter((b) => b.id !== targetBusId)
          .map((b) => {
            const sourceRows = rowsForBus(b.id);
            const sourceRowsFiltered = sourceRows.filter((r) => r.status === "pending");
            const sourceLabel = tripBusLabelMap.get(b.id) || "Bus";

            const columns = [
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
                    {row.transferredAway && row.transferTargetLabel ? (
                      <div className="text-xs text-purple-600">
                        Đã chuyển sang {row.transferTargetLabel}
                      </div>
                    ) : null}
                  </div>
                ),
              },
              {
                title: "Trạng thái",
                dataIndex: "status",
                render: (_: unknown, row: PassengerRow) => statusTag(row),
              },
              {
                title: "Hành động",
                dataIndex: "actions",
                width: 220,
                render: (_: unknown, row: PassengerRow) => {
                  const transferMap = passengerTransfers[activeTripId || ""] || {};
                  const overrideBus = transferMap[row.passenger.id];
                  const alreadyOnTarget =
                    overrideBus === targetBusId ||
                    row.txnBusId === targetBusId;

                  const disabledReason = !targetRoundBusId
                    ? "Chưa có round-bus cho xe nhận"
                    : roundLockedBySequence
                      ? "Round đang bị khoá"
                      : roundAlreadyFinalized
                        ? "Round đã chốt"
                        : undefined;

                  return (
                    <Space>
                      <Button
                        type="primary"
                        size="small"
                        disabled={Boolean(disabledReason) || alreadyOnTarget}
                        onClick={() => onPerform(row.passenger.id)}
                      >
                        Điểm danh sang xe này
                      </Button>
                      <Button
                        size="small"
                        disabled={Boolean(disabledReason) || !alreadyOnTarget}
                        onClick={() => onUndo(row.passenger.id, b.id)}
                      >
                        Huỷ chuyển
                      </Button>
                    </Space>
                  );
                },
              },
            ];

            return {
              key: b.id,
              label: sourceLabel,
              children: (
                <Table
                  size="small"
                  rowKey="key"
                  dataSource={sourceRowsFiltered}
                  columns={columns}
                  pagination={false}
                  locale={{ emptyText: <Empty description="Không có hành khách" /> }}
                />
              ),
            };
          })}
      />
    </Modal>
  );
}

export default CrossCheckModal;
