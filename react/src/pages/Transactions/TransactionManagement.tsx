import React, { useEffect, useMemo, useState } from "react";

import { useQueryClient } from "@tanstack/react-query";
import {
  Badge,
  Card,
  Empty,
  Select,
  Space,
  Tabs,
  Tag,
  Typography,
  message,
  Button,
} from "antd";
import dayjs from "dayjs";

import { updateTransaction, type TransactionItem } from "../../api/trips";
import { useGlobalTripFilter } from "../../hooks/useGlobalTripFilter";
import { isFleetLead } from "../../utils/helper";

import { BusPane } from "./components/BusPane";
import { CrossCheckModal } from "./components/CrossCheckModal";
import { RoundTimeline } from "./components/RoundTimeline";
import {
  useTransactionsData,
  useTransactionsMutations,
  useTransactionsWebSocket,
} from "./hooks";

import type { PassengerRow, RowStatus } from "./components/types";

const { Title, Text } = Typography;
const STORAGE_KEY = "transaction-state";

export default function TransactionManagement() {
  const queryClient = useQueryClient();

  const [activeTripBusId, setActiveTripBusId] = useState<string>();
  const [activeRoundId, setActiveRoundId] = useState<string>();
  const [crossCheck, setCrossCheck] = useState<{
    busId: string | null;
    sourceBusId?: string;
    passengerId?: string;
  }>({ busId: null });

  const [activeTripId, setActiveTripId] = useGlobalTripFilter(true) as [
    string,
    (_val: string) => void,
  ];

  const {
    currentUser,
    trips,
    tripPassengers,
    passengerHomeBusMap,
    rounds,
    tripBuses,
    passengerTransferMap,
    transferByPassenger,
    passengerTransfersByTrip,
    tripBusLabelMap,
    roundBusByKey,
    roundBusToTripBus,
    canOperateTripBus,
    canOperateRoundBus,
    finalizedRoundBuses,
    transactionByPassenger,
    tripScopedRound,
    tripRoundsSorted,
    openRoundId,
    openRoundLabel,
    tripLockedForAttendance,
    roundLockedBySequence,
    canModifyRound,
    roundBusIdFor,
    getRoundVisualStatus,
    tripScopedTripBuses,
    isDriverOrManager,
    visibleTripBuses,
    activeTripObj,
    tripStatusInfo,
    isLoadingData,
    isRefreshingData,
  } = useTransactionsData(activeTripId, activeRoundId);

  const {
    checkInMutation,
    checkOutMutation,
    switchBusMutation,
    undoTransferMutation,
    finalizeRoundBusMutation,
    startTripMutation,
    isMutationBusy,
  } = useTransactionsMutations({
    activeTripId,
    activeRoundId,
    passengerHomeBusMap,
    transferByPassenger,
  });

  useTransactionsWebSocket();

  useEffect(() => {
    if (!activeTripId && trips.length) {
      setActiveTripId(trips[0].id);
    }
  }, [trips, activeTripId, setActiveTripId]);

  useEffect(() => {
    if (!activeTripId) return;

    if (
      !activeTripBusId ||
      !visibleTripBuses.some((t) => String(t.id) === String(activeTripBusId))
    ) {
      setActiveTripBusId(visibleTripBuses[0]?.id);
    }

    if (
      !activeRoundId ||
      !tripScopedRound.some((r) => String(r.id) === String(activeRoundId))
    ) {
      setActiveRoundId(tripScopedRound[0]?.id);
    }
  }, [
    activeTripId,
    visibleTripBuses,
    tripScopedRound,
    activeTripBusId,
    activeRoundId,
  ]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!activeTripId && !activeTripBusId && !activeRoundId) return;
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ activeTripId, activeTripBusId, activeRoundId }),
    );
  }, [activeTripId, activeTripBusId, activeRoundId]);

  const handleStartTrip = () => {
    if (!activeTripId) return;

    if (tripBuses.length === 0) {
      return message.error("Chuyến đi chưa được gán xe khách nào!");
    }

    if (tripPassengers.length === 0) {
      return message.error("Chuyến đi chưa có hành khách nào!");
    }

    const unassignedPassengers = tripPassengers.filter(
      (p) => !(p as { assigned_trip_bus?: string | null }).assigned_trip_bus,
    );
    if (unassignedPassengers.length > 0) {
      return message.error(
        "Có hành khách chưa được gán xe. Vui lòng kiểm tra lại!",
      );
    }

    if (rounds.length === 0) {
      return message.error("Chuyến đi chưa được cấu hình chặng nào!");
    }

    if (tripStatusInfo?.isOverdue) {
      return message.error("Chuyến đi đã quá hạn, không thể xuất phát!");
    }

    if (!tripStatusInfo?.isStarted) {
      return message.error("Chưa đến ngày bắt đầu chuyến đi!");
    }

    startTripMutation.mutate(activeTripId);
  };

  const rowsForBus = React.useCallback(
    (tripBusId: string): PassengerRow[] => {
      const transferMap = passengerTransferMap;

      return tripPassengers
        .filter((p) => {
          const overrideBus = transferMap[p.id];
          const baseAssigned =
            (p as { assigned_trip_bus?: string | null }).assigned_trip_bus ??
            null;
          const homeBusId = overrideBus ?? baseAssigned ?? null;
          if (homeBusId)
            return (
              String(homeBusId) === String(tripBusId) ||
              String(baseAssigned) === String(tripBusId)
            );
          return false;
        })
        .map((p) => {
          const overrideBus = transferMap[p.id];
          const baseAssigned =
            (p as { assigned_trip_bus?: string | null }).assigned_trip_bus ??
            null;
          const homeBusId = overrideBus ?? baseAssigned ?? null;
          const txn = transactionByPassenger.get(String(p.id));
          const txnBusId = txn
            ? roundBusToTripBus.get(String(txn.round_bus))
            : undefined;
          let status: RowStatus = "pending";
          if (txn) {
            if (txn.check_out) {
              status = "checkedOut";
            } else if (String(txnBusId) === String(tripBusId)) {
              status = "checkedInHere";
            } else if (txnBusId) {
              status = "checkedInElsewhere";
            }
          }

          const transferredAway =
            Boolean(baseAssigned) &&
            baseAssigned === tripBusId &&
            !!overrideBus &&
            overrideBus !== tripBusId;

          const transferredHere =
            !!overrideBus &&
            overrideBus === tripBusId &&
            !!baseAssigned &&
            baseAssigned !== tripBusId;

          const isOwnedByBus =
            (homeBusId
              ? homeBusId === tripBusId
              : !baseAssigned || baseAssigned === tripBusId) &&
            !transferredAway;

          const availableForCrossCheck = !txn || !!txn.check_out;

          return {
            key: p.id,
            passenger: p,
            transaction: txn,
            txnBusId,
            status,
            assignedBusId: baseAssigned,
            homeBusId,
            isOwnedByBus,
            transferredAway,
            transferredHere,
            transferTargetLabel: overrideBus
              ? tripBusLabelMap.get(String(overrideBus))
              : undefined,
            availableForCrossCheck,
          };
        });
    },
    [
      passengerTransferMap,
      roundBusToTripBus,
      transactionByPassenger,
      tripBusLabelMap,
      tripPassengers,
    ],
  );

  const statusTag = (row: PassengerRow) => {
    const tags: React.ReactNode[] = [];

    if (row.status === "checkedInHere") {
      const timeStr = row.transaction?.check_in ? ` ${dayjs(row.transaction.check_in).format("HH:mm")}` : "";
      tags.push(<Tag color="green">Đã lên xe{timeStr}</Tag>);
    } else if (row.status === "checkedInElsewhere") {
      const timeStr = row.transaction?.check_in ? ` ${dayjs(row.transaction.check_in).format("HH:mm")}` : "";
      tags.push(<Tag color="green">Đã điểm danh{timeStr}</Tag>);
    } else if (row.status === "checkedOut") {
      const timeStr = row.transaction?.check_out ? ` (xuống ${dayjs(row.transaction.check_out).format("HH:mm")})` : "";
      tags.push(<Tag color="orange">Chưa lên xe{timeStr}</Tag>);
    } else {
      tags.push(<Tag>Chưa lên xe</Tag>);
    }

    if (
      row.transferredHere &&
      (row.passenger as { assigned_trip_bus?: string | null }).assigned_trip_bus
    ) {
      tags.push(
        <Tag color="magenta">
          Nhận từ
          {tripBusLabelMap.get(
            String(
              (row.passenger as { assigned_trip_bus?: string | null })
                .assigned_trip_bus || "",
            ),
          ) || "xe khác"}
        </Tag>,
      );
    }

    return (
      <Space direction="vertical" size={2}>
        {tags.map((item, idx) => (
          <span key={idx}>{item}</span>
        ))}
      </Space>
    );
  };

  const handleCheckIn = (passengerId: string, roundBusId?: string) => {
    if (tripLockedForAttendance) {
      message.warning("Chuyến đi chưa bắt đầu. Chỉ xem điểm danh.");
      return;
    }
    if (!roundBusId) {
      message.warning("Chưa cấu hình round-bus cho vòng này");
      return;
    }
    if (!canOperateRoundBus(roundBusId)) {
      message.warning("Bạn không được phép thao tác với xe này");
      return;
    }
    checkInMutation.mutate({ passengerId, roundBusId });
  };

  const handleCheckOut = (txn: TransactionItem | undefined) => {
    if (tripLockedForAttendance) {
      message.warning("Chuyến đi chưa bắt đầu. Chỉ xem điểm danh.");
      return;
    }
    if (!txn) return;
    if (!canOperateRoundBus(txn.round_bus)) {
      message.warning("Bạn không được phép thao tác với xe này");
      return;
    }
    checkOutMutation.mutate(txn);
  };

  const handleCheckOutAll = (
    checkedInRows: PassengerRow[],
    roundBusId?: string,
  ) => {
    if (tripLockedForAttendance) {
      message.warning("Chuyến đi chưa bắt đầu. Chỉ xem điểm danh.");
      return;
    }
    if (!roundBusId) return;
    if (!canOperateRoundBus(roundBusId)) {
      message.warning("Bạn không được phép thao tác với xe này");
      return;
    }
    const now = new Date().toISOString();
    const toCheckOut = checkedInRows.filter(
      (r) =>
        r.status === "checkedInHere" &&
        r.transaction &&
        !r.transaction.check_out,
    );
    if (toCheckOut.length === 0) return;
    // Fire all in parallel — acceptable since they are independent transactions
    Promise.all(
      toCheckOut.map((r) =>
        updateTransaction(r.transaction!.id, {
          passenger: r.transaction!.passenger,
          round_bus: r.transaction!.round_bus,
          check_in: r.transaction!.check_in,
          check_out: now,
        }),
      ),
    )
      .then(() => {
        message.success(`Điểm danh xuống ${toCheckOut.length} hành khách`);
        return queryClient.invalidateQueries({ queryKey: ["transactions"] });
      })
      .catch(() => message.error("Điểm danh xuống thất bại"));
  };

  const handleSwitchBus = (
    passengerId: string,
    fromTxn: TransactionItem | undefined,
    targetRoundBusId?: string,
  ) => {
    if (tripLockedForAttendance) {
      message.warning("Chuyến đi chưa bắt đầu. Chỉ xem điểm danh.");
      return;
    }
    if (!targetRoundBusId) {
      message.warning("Chưa cấu hình Chặng - Xe khách cho vòng này");
      return;
    }

    if (!canOperateRoundBus(targetRoundBusId)) {
      message.warning("Bạn không được phép thao tác với xe này");
      return;
    }

    switchBusMutation.mutate({
      passengerId,
      fromTxn,
      targetRoundBusId,
      targetTripBusId: roundBusToTripBus.get(String(targetRoundBusId)),
    });
  };

  const handleFinalize = (roundBusId?: string) => {
    if (tripLockedForAttendance) {
      message.warning("Chuyến đi chưa bắt đầu. Chỉ xem điểm danh.");
      return;
    }
    if (!roundBusId) {
      message.warning("Chưa cấu hình round-bus cho vòng này");
      return;
    }

    if (!canOperateRoundBus(roundBusId)) {
      message.warning("Bạn không được phép thao tác với xe này");
      return;
    }

    finalizeRoundBusMutation.mutate(roundBusId);
  };

  const handleCrossCheckPerform = (passengerId: string) => {
    if (tripLockedForAttendance) {
      message.warning("Chuyến đi chưa bắt đầu. Chỉ xem điểm danh.");
      return;
    }
    if (!activeRoundId || !crossCheck.busId) return;
    const targetRoundBusId = roundBusIdFor(activeRoundId, crossCheck.busId);
    if (!targetRoundBusId) {
      message.warning("Chưa cấu hình round-bus cho xe này");
      return;
    }
    if (!canOperateRoundBus(targetRoundBusId)) {
      message.warning("Bạn không được phép thao tác với xe này");
      return;
    }
    const fromTxn = transactionByPassenger.get(String(passengerId));
    if (fromTxn && !fromTxn.check_out) {
      message.warning("Hành khách này đã lên xe khác, không thể điểm danh chéo.");
      return;
    }
    handleSwitchBus(passengerId, fromTxn, targetRoundBusId);
  };

  const handleCrossCheckUndo = (passengerId: string) => {
    if (tripLockedForAttendance) {
      message.warning("Chuyến đi chưa bắt đầu. Chỉ xem điểm danh.");
      return;
    }
    undoTransferMutation.mutate({ passengerId });
  };

  const loading = isLoadingData || isRefreshingData;
  const timelineItems = useMemo(
    () =>
      tripRoundsSorted.map((round, index) => ({
        id: round.id,
        label: round.location || round.name,
        number: round.sequence ?? index + 1,
        status: getRoundVisualStatus(round.id, index),
        isActive: activeRoundId === round.id,
      })),
    [tripRoundsSorted, getRoundVisualStatus, activeRoundId],
  );

  const mutationBusy = isMutationBusy || loading;

  // Track which round-buses have completed the "checkout" phase for intermediate stops
  const [checkoutDoneRbs, setCheckoutDoneRbs] = React.useState<Set<string>>(
    new Set(),
  );

  // Position of the currently viewed round within the trip
  const activeRoundIndex = tripRoundsSorted.findIndex(
    (r) => String(r.id) === String(activeRoundId),
  );
  const roundPosition: "first" | "middle" | "last" = React.useMemo(() => {
    if (activeRoundIndex < 0 || tripRoundsSorted.length === 0) return "first";
    if (activeRoundIndex === 0) return "first";
    if (activeRoundIndex === tripRoundsSorted.length - 1) return "last";
    return "middle";
  }, [activeRoundIndex, tripRoundsSorted.length]);

  // Finalise the checkout phase for a middle stop — opens check-in phase
  const handleFinalizeCheckout = (roundBusId: string) => {
    if (!canOperateRoundBus(roundBusId)) {
      message.warning("Bạn không được phép thao tác với xe này");
      return;
    }
    setCheckoutDoneRbs((prev) => new Set([...prev, roundBusId]));
    message.success("Đã chốt điểm danh xuống. Bây giờ có thể điểm danh lên.");
  };

  // Finalise check-in phase (or first-round-only finalize)
  const handleFinalizeCheckin = (roundBusId?: string) => {
    if (!roundBusId) return;
    handleFinalize(roundBusId);
    // Clear checkout-done flag when entire round-bus is finalized
    setCheckoutDoneRbs((prev) => {
      const next = new Set(prev);
      next.delete(roundBusId);
      return next;
    });
  };

  const busTabs = visibleTripBuses
    .map((tb) => {
      const label = tripBusLabelMap.get(String(tb.id)) || "Bus";
      const roundBusId = activeRoundId
        ? roundBusByKey.get(`${activeRoundId}-${tb.id}`)?.id
        : undefined;

      // Hide tabs that have no round-bus configured for the active round
      if (!roundBusId) return null;

      const rows = rowsForBus(tb.id);
      const presentCount = rows.filter(
        (r) => r.status === "checkedInHere",
      ).length;
      const othersCount = rows.filter(
        (r) => r.status !== "checkedInHere" && r.isOwnedByBus
      ).length;
      const transferredAwayCount = rows.filter(
        (r) => !r.isOwnedByBus
      ).length;
      const busReadOnly = tripLockedForAttendance || !canOperateTripBus(tb.id);
      const busFinalized = Boolean(
        finalizedRoundBuses[activeTripId || ""]?.[roundBusId],
      );

      const blockReason = busReadOnly
        ? !canOperateTripBus(tb.id)
          ? "Chỉ xem"
          : undefined
        : busFinalized
          ? "Đã chốt điểm danh"
          : roundLockedBySequence
            ? "Chưa hoàn tất Chặng trước"
            : !openRoundId
              ? "Tất cả Chặng đã hoàn thành"
              : undefined;

      const canModifyAttendance = Boolean(
        !busReadOnly && roundBusId && canModifyRound && !busFinalized,
      );

      return {
        key: tb.id,
        label: (
          <Space size={4}>
            <span>{label}</span>
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
            {transferredAwayCount > 0 && (
              <Badge
                count={transferredAwayCount}
                size="small"
                style={{ backgroundColor: "#a855f7" }}
                title="Đã sang xe khác"
              />
            )}
            {busFinalized && <Tag color="green">Đã chốt</Tag>}
          </Space>
        ),
        children: (
          <BusPane
            roundBusId={roundBusId}
            rows={rows}
            loading={loading}
            busFinalized={busFinalized}
            blockReason={blockReason}
            readOnlyBus={busReadOnly}
            canModifyAttendance={canModifyAttendance}
            statusTag={statusTag}
            onOpenCrossCheck={() =>
              busReadOnly
                ? undefined
                : setCrossCheck({
                    busId: tb.id,
                    sourceBusId: undefined,
                    passengerId: undefined,
                  })
            }
            onFinalize={handleFinalizeCheckin}
            onFinalizeCheckout={handleFinalizeCheckout}
            onCheckIn={handleCheckIn}
            onCheckOut={handleCheckOut}
            onCheckOutAll={(checkedInRows) =>
              handleCheckOutAll(checkedInRows, roundBusId)
            }
            roundPosition={roundPosition}
            checkoutPhaseFinalized={checkoutDoneRbs.has(roundBusId)}
            busy={mutationBusy}
          />
        ),
      };
    })
    .filter((item): item is NonNullable<typeof item> => Boolean(item));

  return (
    <div className="w-full bg-[#f4f7fb] h-full py-6">
      <div className="bg-white shadow-sm rounded-2xl p-6 border border-slate-100">
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 mb-2">
          <div className="flex-1 min-w-[250px] pr-4">
            <p className="text-sm uppercase tracking-[0.25em] text-sky-700 font-semibold">
              Transaction
            </p>
            <Title level={2} style={{ margin: 0 }}>
              Điểm danh hành khách
            </Title>
            <Text type="secondary">
              Chọn trip, duyệt round theo checkpoint, chuyển tab xe và điểm danh
              không cần mở modal.
            </Text>
            {tripStatusInfo && (
              <div className="mt-2 flex items-center gap-2">
                {tripStatusInfo.status === "planned" &&
                  tripStatusInfo.isOverdue && (
                    <Tag color="error" className="m-0">
                      Chuyến đi đã quá hạn
                    </Tag>
                  )}
                {tripStatusInfo.status === "planned" &&
                  !tripStatusInfo.isOverdue && (
                    <Tag color="red" className="m-0">
                      Chuyến đi chưa bắt đầu
                    </Tag>
                  )}
                {tripStatusInfo.status === "doing" && (
                  <Tag color="blue" className="m-0">
                    Đang thực hiện
                  </Tag>
                )}
                {tripStatusInfo.status === "done" && (
                  <Tag color="green" className="m-0">
                    Đã hoàn thành
                  </Tag>
                )}
              </div>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-3 w-full xl:w-auto">
            {/* Search moved to BusPane component */}
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mt-6 mb-4 p-4 bg-slate-50/50 border border-slate-100 rounded-xl">
          <div className="flex flex-wrap items-center gap-3">
            <span className="font-medium text-slate-700 whitespace-nowrap">
              Chuyến đi:
            </span>
            <Select
              placeholder="Chọn chuyến đi"
              value={activeTripId}
              onChange={(val) => setActiveTripId(val)}
              options={trips.map((t) => ({
                value: String(t.id),
                label: t.name,
              }))}
              loading={isLoadingData}
              showSearch
              optionFilterProp="label"
              className="w-full sm:w-64"
            />
            {tripStatusInfo && (
              <div className="flex items-center gap-3">
                {tripStatusInfo.status === "planned" &&
                  !tripStatusInfo.isOverdue &&
                  !tripStatusInfo.isStarted &&
                  activeTripObj?.start_date && (
                    <Tag color="cyan" className="m-0 text-sm">
                      Bắt đầu:{" "}
                      {dayjs(activeTripObj.start_date).format("DD/MM/YYYY")}
                    </Tag>
                  )}
                {tripStatusInfo.status === "planned" &&
                  !tripStatusInfo.isOverdue &&
                  tripStatusInfo.isStarted &&
                  isFleetLead(currentUser) && (
                    <Button
                      type="primary"
                      style={{
                        backgroundColor: "#22c55e",
                        borderColor: "#22c55e",
                      }}
                      onClick={handleStartTrip}
                      loading={startTripMutation.isPending}
                    >
                      Xuất phát
                    </Button>
                  )}
              </div>
            )}
          </div>
        </div>

        <RoundTimeline items={timelineItems} onSelect={setActiveRoundId} />

        <Card className="mt-6" styles={{ body: { padding: 0 } }}>
          <div className="p-4">
            {openRoundLabel && (
              <div className="mb-3">
                <Text type={roundLockedBySequence ? "warning" : "secondary"}>
                  Chặng đang diễn ra: {openRoundLabel}. Vui lòng chốt điểm danh
                  chặng này để có thể điểm danh ở chặng tiếp theo.
                </Text>
              </div>
            )}
            {busTabs.length === 0 ? (
              <Empty
                description={
                  tripScopedTripBuses.length === 0
                    ? "Chưa có xe cho Chuyến đi này"
                    : isDriverOrManager && visibleTripBuses.length === 0
                      ? "Bạn chưa được phân công phụ trách xe nào trong chuyến đi này."
                      : "Chưa cấu hình Chặng - Xe khách cho Chuyến đi này"
                }
              />
            ) : (
              <Tabs
                items={busTabs}
                activeKey={activeTripBusId ?? busTabs[0]?.key ?? ""}
                onChange={(val) => setActiveTripBusId(val)}
              />
            )}
          </div>
        </Card>
      </div>

      <CrossCheckModal
        open={Boolean(crossCheck.busId)}
        onClose={() => setCrossCheck({ busId: null })}
        tripScopedTripBuses={tripScopedTripBuses}
        targetBusId={crossCheck.busId || null}
        rowsForBus={rowsForBus}
        tripBusLabelMap={tripBusLabelMap}
        passengerTransfers={passengerTransfersByTrip}
        activeTripId={activeTripId}
        statusTag={statusTag}
        onPerform={handleCrossCheckPerform}
        onUndo={handleCrossCheckUndo}
      />
    </div>
  );
}
