import React, { useState, useEffect } from "react";

import { CheckCircleOutlined, UndoOutlined, SearchOutlined, EyeOutlined } from "@ant-design/icons";
import { Button, Empty, Modal, Space, Table, Tabs, Input, Badge, Tag, Typography } from "antd";

import { useDebounce } from "../../../hooks/useDebounce";
import { removeAccents } from "../../../utils/helper";

import type { PassengerRow } from "./types";
import type { TripBus } from "../../../api/trips";

const { Text } = Typography;

interface CrossCheckModalProps {
  open: boolean;
  onClose: () => void;
  tripScopedTripBuses: TripBus[];
  targetBusId: string | null;
  rowsForBus: (_tripBusId: string) => PassengerRow[];
  tripBusLabelMap: Map<string, string>;
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
  tripBusLabelMap,
  passengerTransfers,
  activeTripId,
  statusTag,
  onPerform,
  onUndo,
}: CrossCheckModalProps) {
  const [searchText, setSearchText] = useState("");
  const debouncedSearchText = useDebounce(searchText, 300);

  useEffect(() => {
    if (open) {
      setSearchText("");
    }
  }, [open]);

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

  if (!targetBusId) {
    return (
      <Modal title="Điểm danh thành viên xe khác" open={open} onCancel={onClose} footer={null} width={860}>
        <Empty description="Chọn xe cần nhận thành viên" />
      </Modal>
    );
  }

  return (
    <Modal title="Điểm danh thành viên xe khác" open={open} onCancel={onClose} footer={null} width={860} destroyOnClose>
      <div className="mb-4">
        <Input
          placeholder="Tìm kiếm hành khách (tên, số điện thoại)..."
          prefix={<SearchOutlined className="text-slate-400" />}
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          allowClear
        />
      </div>
      <Tabs
        items={tripScopedTripBuses
          .filter((b) => b.id !== targetBusId)
          .map((b) => {
            const sourceRows = rowsForBus(b.id);
            const sourceRowsFiltered = sourceRows
              .filter((r) => {
                if (!debouncedSearchText) return true;
                const term = removeAccents(debouncedSearchText).toLowerCase();
                const nameMatch = removeAccents(r.passenger.name).toLowerCase().includes(term);
                const phoneMatch = r.passenger.phone && removeAccents(r.passenger.phone).toLowerCase().includes(term);
                const noteMatch = r.passenger.note && removeAccents(r.passenger.note).toLowerCase().includes(term);
                return nameMatch || phoneMatch || noteMatch;
              })
              .sort((a, bRow) => {
                const transferMap = passengerTransfers[activeTripId || ""] || {};
                const aTransferredToTarget = transferMap[a.passenger.id] === targetBusId;
                const bTransferredToTarget = transferMap[bRow.passenger.id] === targetBusId;

                if (aTransferredToTarget && !bTransferredToTarget) return -1;
                if (!aTransferredToTarget && bTransferredToTarget) return 1;

                const aIsPending = a.status === "pending" ? 0 : 1;
                const bIsPending = bRow.status === "pending" ? 0 : 1;
                return aIsPending - bIsPending;
              });

            const presentCount = sourceRows.filter((r) => r.status === "checkedInHere").length;
            const othersCount = sourceRows.length - presentCount;
            const labelStr = tripBusLabelMap.get(String(b.id)) || "Bus";
            const sourceLabel = (
              <Space size={4}>
                <span>{labelStr}</span>
                <Badge
                  count={presentCount}
                  showZero
                  size="small"
                  style={{ backgroundColor: "#16a34a" }}
                  title="Đang trên xe"
                />
                <Badge
                  count={othersCount}
                  showZero
                  size="small"
                  style={{ backgroundColor: "#3b82f6" }}
                  title="Chưa lên xe"
                />
              </Space>
            );

            const columns = [
              {
                title: "Hành khách",
                dataIndex: "passenger",
                render: (_: unknown, row: PassengerRow) => (
                  <div>
                    <div className="flex items-stretch justify-between min-h-[24px]">
                      <div className="font-semibold text-slate-900 text-sm flex items-center">{row.passenger.name}</div>
                      <Button
                        type="text"
                        icon={<EyeOutlined className="text-slate-500" />}
                        onClick={() => showPassengerDetails(row.passenger)}
                        title="Xem chi tiết"
                        className="flex items-center justify-center h-auto p-1"
                      />
                    </div>
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
                render: (_: unknown, row: PassengerRow) => {
                  if (
                    row.status === "checkedInElsewhere" &&
                    String(row.txnBusId) === String(targetBusId)
                  ) {
                    return <Tag color="green">Đã lên xe này</Tag>;
                  }
                  return statusTag(row);
                },
              },
              {
                title: "Hành động",
                dataIndex: "actions",
                width: 250,
                render: (_: unknown, row: PassengerRow) => {
                  const transferMap = passengerTransfers[activeTripId || ""] || {};
                  const overrideBus = transferMap[row.passenger.id];
                  const hasTransferredToTarget = overrideBus === targetBusId;
                  const isCheckedInTarget = String(row.txnBusId) === String(targetBusId);

                  if (hasTransferredToTarget) {
                    return (
                      <Space>
                        {row.availableForCrossCheck && !isCheckedInTarget && (
                          <Button
                            type="primary"
                            size="small"
                            icon={<CheckCircleOutlined />}
                            onClick={() => onPerform(row.passenger.id)}
                          >
                            Điểm danh sang xe này
                          </Button>
                        )}
                        <Button
                          size="small"
                          icon={<UndoOutlined />}
                          onClick={() => onUndo(row.passenger.id, String(b.id))}
                          style={{
                            borderColor: "#f43f5e",
                            color: "#f43f5e",
                            backgroundColor: "#fff1f2",
                          }}
                        >
                          Huỷ chuyển
                        </Button>
                      </Space>
                    );
                  }

                  return row.availableForCrossCheck ? (
                    <Button
                      type="primary"
                      size="small"
                      icon={<CheckCircleOutlined />}
                      onClick={() => onPerform(row.passenger.id)}
                    >
                      Điểm danh sang xe này
                    </Button>
                  ) : null;
                },
              },
            ];

            return {
              key: String(b.id),
              label: sourceLabel,
              children: (
                <Table
                  dataSource={sourceRowsFiltered}
                  columns={columns}
                  rowKey={(r) => r.passenger.id}
                  pagination={false}
                  size="small"
                  locale={{ emptyText: "Không có thành viên nào" }}
                />
              ),
            };
          })}
      />
    </Modal>
  );
}

export default CrossCheckModal;
