import React, { useEffect, useMemo, useState } from "react";

import { SendOutlined } from "@ant-design/icons";
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

import { type TransactionItem } from "../../api/trips";
import { useGlobalTripFilter } from "../../hooks/useGlobalTripFilter";
import { isTourManagerLike } from "../../utils/helper";

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
    roundBusToTripBus,
    canOperateRoundBus,
    finalizedRoundBuses,
    checkoutFinalizedRoundBuses,
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
    roundBuses,
    passengerBusAtStartOfRound,
  } = useTransactionsData(activeTripId, activeRoundId);

  const {
    checkInMutation,
    checkOutMutation,
    undoCheckInMutation,
    undoCheckOutMutation,
    bulkCheckOutMutation,
    switchBusMutation,
    undoTransferMutation,
    finalizeRoundBusMutation,
    finalizeRoundBusCheckoutMutation,
    startTripMutation,
    isMutationBusy,
  } = useTransactionsMutations({
    activeTripId,
    activeRoundId,
    passengerHomeBusMap,
    transferByPassenger,
  });

  const mutationBusy =
    isMutationBusy ||
    checkInMutation.isPending ||
    checkOutMutation.isPending ||
    undoCheckInMutation.isPending ||
    undoCheckOutMutation.isPending ||
    bulkCheckOutMutation.isPending ||
    switchBusMutation.isPending ||
    undoTransferMutation.isPending ||
    finalizeRoundBusMutation.isPending ||
    finalizeRoundBusCheckoutMutation.isPending ||
    startTripMutation.isPending;

  useTransactionsWebSocket();

  // Restore active view state
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (!activeTripId && parsed.activeTripId) {
          // handled by useGlobalTripFilter in real app, but we mirror it just in case
        }
        if (!activeTripBusId && parsed.activeTripBusId) {
          setActiveTripBusId(parsed.activeTripBusId);
        }
      }
    } catch {
      //
    }
  }, [activeTripId, activeTripBusId, activeRoundId]);

  // Save active view state
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!activeTripId && !activeTripBusId) return;
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ activeTripId, activeTripBusId }),
    );
  }, [activeTripId, activeTripBusId]);

  // Ensure valid selection when data loads
  useEffect(() => {
    if (!activeTripId) return;

    if (
      !activeTripBusId ||
      !visibleTripBuses.some((t) => String(t.id) === String(activeTripBusId))
    ) {
      setActiveTripBusId(String(visibleTripBuses[0]?.id));
    }

    if (
      !activeRoundId ||
      !tripScopedRound.some((r) => String(r.id) === String(activeRoundId))
    ) {
      setActiveRoundId(String(openRoundId || tripScopedRound[0]?.id));
    }
  }, [
    activeTripId,
    visibleTripBuses,
    tripScopedRound,
    activeTripBusId,
    activeRoundId,
    openRoundId,
  ]);

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
        `Có ${unassignedPassengers.length} hành khách chưa được gán xe. Vui lòng gán xe cho tất cả hành khách trước khi xuất phát!`,
      );
    }

    if (rounds.length === 0) {
      return message.error("Chuyến đi chưa được cấu hình chặng nào!");
    }

    if (tripStatusInfo?.isOverdue) {
      return message.error("Chuyến đi đã quá hạn, không thể xuất phát!");
    }

    const targetDate = activeTabDay || activeTripObj?.start_date;
    const targetDateDayjs = dayjs(targetDate).startOf("day");
    const todayDayjs = dayjs().startOf("day");

    if (targetDateDayjs.isBefore(todayDayjs, "day")) {
      return message.error("Đã quá ngày xuất phát, không thể bắt đầu chuyến đi!");
    }
    if (targetDateDayjs.isAfter(todayDayjs, "day")) {
      return message.error("Chưa đến ngày bắt đầu chuyến đi!");
    }

    startTripMutation.mutate(activeTripId);
  };

  const rowsForBus = React.useCallback(
    (tripBusId: string): PassengerRow[] => {
      if (activeRoundId) {
        const targetRoundBusId = roundBusIdFor(activeRoundId, tripBusId);
        const roundBus = targetRoundBusId
          ? roundBuses.find((rb) => String(rb.id) === String(targetRoundBusId))
          : undefined;
        if (roundBus?.finalized_at && roundBus?.snapshot_data?.rows) {
          return roundBus.snapshot_data.rows;
        }
      }

      const transferMap = passengerTransferMap;

      return tripPassengers
        .filter((p) => {
          const overrideBus = transferMap[p.id];
          const baseAssigned =
            (p as { assigned_trip_bus?: string | null }).assigned_trip_bus ??
            null;
          const homeBusId = overrideBus ?? baseAssigned ?? null;
          const busAtStart = passengerBusAtStartOfRound.get(String(p.id));

          if (String(homeBusId) === String(tripBusId)) return true;
          
          if (String(busAtStart) === String(tripBusId)) return true;

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
            let isCheckedOut = false;
            if (txn.check_out) {
              const viewedRoundBusId = roundBusIdFor(activeRoundId, tripBusId);
              const roundBusFinalizedAt = viewedRoundBusId
                ? finalizedRoundBuses[activeTripId || ""]?.[viewedRoundBusId]
                : undefined;

              if (!roundBusFinalizedAt) {
                // If the current round is not finalized, the checkout must have happened now.
                isCheckedOut = true;
              } else {
                // If the round is finalized, we only consider them checked out if checkout happened before/near finalize time.
                const checkOutTime = dayjs(txn.check_out);
                isCheckedOut = checkOutTime.isBefore(
                  dayjs(roundBusFinalizedAt).add(15, "minute"),
                );
              }
            }

            if (isCheckedOut) {
              status = "checkedOut";
            } else if (String(txnBusId) === String(tripBusId)) {
              status = "checkedInHere";
            } else if (txnBusId) {
              status = "checkedInElsewhere";
            }
          }

          const transferredAway =
            Boolean(baseAssigned) &&
            String(baseAssigned) === String(tripBusId) &&
            !!overrideBus &&
            String(overrideBus) !== String(tripBusId);

          const transferredHere =
            !!overrideBus &&
            String(overrideBus) === String(tripBusId) &&
            !!baseAssigned &&
            String(baseAssigned) !== String(tripBusId);

          const isOwnedByBus =
            (homeBusId
              ? String(homeBusId) === String(tripBusId)
              : !baseAssigned || String(baseAssigned) === String(tripBusId)) &&
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
      activeRoundId,
      activeTripId,
      finalizedRoundBuses,
      roundBusIdFor,
      roundBuses,
      passengerBusAtStartOfRound,
    ],
  );

  const statusTag = (row: PassengerRow) => {
    const tags: React.ReactNode[] = [];
    const activeRoundIndex = tripRoundsSorted.findIndex(
      (r) => String(r.id) === String(activeRoundId),
    );
    const isLastRound = tripRoundsSorted.length > 0 && activeRoundIndex === tripRoundsSorted.length - 1;

    if (row.status === "checkedInHere") {
      const timeStr = row.transaction?.check_in
        ? ` ${dayjs(row.transaction.check_in).format("HH:mm")}`
        : "";
      tags.push(<Tag color="green">Đã lên xe{timeStr}</Tag>);
    } else if (row.status === "checkedInElsewhere") {
      const timeStr = row.transaction?.check_in
        ? ` ${dayjs(row.transaction.check_in).format("HH:mm")}`
        : "";
      tags.push(<Tag color="green">Đã điểm danh{timeStr}</Tag>);
    } else if (row.status === "checkedOut") {
      if (isLastRound) {
        const timeStr = row.transaction?.check_out
          ? ` lúc ${dayjs(row.transaction.check_out).format("HH:mm")}`
          : "";
        tags.push(<Tag color="orange">Đã xuống xe{timeStr}</Tag>);
      } else {
        const timeStr = row.transaction?.check_out
          ? ` (xuống ${dayjs(row.transaction.check_out).format("HH:mm")})`
          : "";
        tags.push(<Tag color="orange">Chưa lên xe{timeStr}</Tag>);
      }
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

  const handleUndoCheckIn = (txn: TransactionItem | undefined) => {
    if (tripLockedForAttendance) return;
    if (!txn) return;
    if (!canOperateRoundBus(txn.round_bus)) {
      message.warning("Bạn không được phép thao tác với xe này");
      return;
    }
    undoCheckInMutation.mutate(txn);
  };

  const handleUndoCheckOut = (txn: TransactionItem | undefined) => {
    if (tripLockedForAttendance) return;
    if (!txn) return;
    if (!canOperateRoundBus(txn.round_bus)) {
      message.warning("Bạn không được phép thao tác với xe này");
      return;
    }
    undoCheckOutMutation.mutate(txn);
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

    bulkCheckOutMutation.mutate({
      transactionIds: toCheckOut.map((r) => r.transaction!.id),
      checkOutTime: now,
    });
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

  const handleFinalize = (roundBusId?: string, snapshotData?: any) => {
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

    finalizeRoundBusMutation.mutate({
      roundBusId,
      finalized: true,
      snapshotData,
    });
  };

  const handleCrossCheckPerform = (passengerId: string) => {
    if (tripLockedForAttendance) {
      message.warning("Chuyến đi chưa bắt đầu. Chỉ xem điểm danh.");
      return;
    }
    if (!activeRoundId || !crossCheck.busId) return;
    const targetRoundBusId = roundBusIdFor(
      String(activeRoundId),
      crossCheck.busId,
    );
    if (!targetRoundBusId) {
      message.warning("Chưa cấu hình round-bus cho xe này");
      return;
    }
    if (!canOperateRoundBus(String(targetRoundBusId))) {
      message.warning("Bạn không được phép thao tác với xe này");
      return;
    }
    const fromTxn = transactionByPassenger.get(String(passengerId));
    if (fromTxn && !fromTxn.check_out) {
      message.warning(
        "Hành khách này đã lên xe khác, không thể điểm danh chéo.",
      );
      return;
    }
    handleSwitchBus(passengerId, fromTxn, String(targetRoundBusId));
  };

  const handleCrossCheckUndo = (passengerId: string) => {
    if (tripLockedForAttendance) {
      message.warning("Chuyến đi chưa bắt đầu. Chỉ xem điểm danh.");
      return;
    }
    undoTransferMutation.mutate({ passengerId });
  };

  const [activeTabDay, setActiveTabDay] = useState<string>("");

  const tripDays = useMemo(() => {
    if (!activeTripObj?.start_date || !activeTripObj?.end_date) return [];
    const start = dayjs(activeTripObj.start_date);
    const end = dayjs(activeTripObj.end_date);
    const days = [];
    let current = start;
    while (current.isBefore(end) || current.isSame(end, "day")) {
      days.push(current.format("YYYY-MM-DD"));
      current = current.add(1, "day");
    }
    return days;
  }, [activeTripObj]);

  useEffect(() => {
    if (tripDays.length > 0 && (!activeTabDay || !tripDays.includes(activeTabDay))) {
      // By default, try to find the day of the openRoundId
      if (openRoundId) {
        const openRound = tripRoundsSorted.find(r => String(r.id) === String(openRoundId));
        if (openRound?.round_date) {
          const openDay = openRound.round_date;
          if (tripDays.includes(openDay)) {
            setActiveTabDay(openDay);
            return;
          }
        }
      }
      setActiveTabDay(tripDays[0]);
    } else if (tripDays.length === 0) {
      setActiveTabDay("");
    }
  }, [tripDays, activeTabDay, openRoundId, tripRoundsSorted]);

  const loading = isLoadingData || isRefreshingData;
  const timelineItems = useMemo(() => {
    const items = tripRoundsSorted.map((round, index) => ({
      id: round.id,
      label: round.location || round.name,
      number: round.sequence ?? index + 1,
      status: getRoundVisualStatus(String(round.id), index),
      isActive: String(activeRoundId) === String(round.id),
      round_date: round.round_date,
      estimate_time: round.estimate_time,
    }));
    
    if (!activeTabDay) return items;
    return items.filter(r => r.round_date && r.round_date === activeTabDay);
  }, [tripRoundsSorted, getRoundVisualStatus, activeRoundId, activeTabDay]);

  const activeRoundIndex = tripRoundsSorted.findIndex(
    (r) => String(r.id) === String(activeRoundId),
  );
  const roundPosition: "first" | "middle" | "last" = React.useMemo(() => {
    if (activeRoundIndex < 0 || tripRoundsSorted.length === 0) return "first";
    if (activeRoundIndex === 0) return "first";
    if (activeRoundIndex === tripRoundsSorted.length - 1) return "last";
    return "middle";
  }, [activeRoundIndex, tripRoundsSorted.length]);

  const isCheckoutFinalizedForTripBus = React.useCallback(
    (tripBusId: string) => {
      if (roundPosition === "first") return true;
      const rbId = activeRoundId
        ? roundBusIdFor(String(activeRoundId), tripBusId)
        : undefined;
      if (!rbId) return false;
      return Boolean(
        checkoutFinalizedRoundBuses[activeTripId || ""]?.[String(rbId)],
      );
    },
    [
      roundPosition,
      activeRoundId,
      activeTripId,
      roundBusIdFor,
      checkoutFinalizedRoundBuses,
    ],
  );

  const isCheckinFinalizedForTripBus = React.useCallback(
    (tripBusId: string) => {
      const rbId = activeRoundId
        ? roundBusIdFor(String(activeRoundId), tripBusId)
        : undefined;
      if (!rbId) return false;
      return Boolean(finalizedRoundBuses[activeTripId || ""]?.[String(rbId)]);
    },
    [activeRoundId, activeTripId, roundBusIdFor, finalizedRoundBuses],
  );

  const handleFinalizeCheckout = (
    roundBusId: string | number,
    snapshotData?: any,
  ) => {
    if (!canOperateRoundBus(String(roundBusId))) {
      message.warning("Bạn không được phép thao tác với xe này");
      return;
    }
    finalizeRoundBusCheckoutMutation.mutate({
      roundBusId: String(roundBusId),
      finalized: true,
      snapshotData,
    });
  };

  const handleFinalizeCheckin = (
    roundBusId?: string | number,
    snapshotData?: any,
  ) => {
    if (!roundBusId) return;
    handleFinalize(String(roundBusId), snapshotData);
  };

  const busTabs = visibleTripBuses
    .map((tb) => {
      const label = tripBusLabelMap.get(String(tb.id)) || "Bus";
      const roundBusId = activeRoundId
        ? roundBusIdFor(String(activeRoundId), String(tb.id))
        : undefined;

      if (!roundBusId) return null;

      const rows = rowsForBus(String(tb.id));

      const presentCount = rows.filter(
        (r) => r.status === "checkedInHere",
      ).length;
      const othersCount = rows.filter(
        (r) => r.status !== "checkedInHere" && r.isOwnedByBus,
      ).length;
      const transferredAwayCount = rows.filter((r) => !r.isOwnedByBus).length;

      const busFinalized = Boolean(
        activeTripId && finalizedRoundBuses[activeTripId]?.[String(roundBusId)],
      );

      let blockReason: string | undefined;
      if (tripLockedForAttendance) blockReason = "Chuyến đi chưa diễn ra.";
      else if (roundLockedBySequence)
        blockReason = "Vui lòng điểm danh xong checkpoint trước đó.";
      else if (busFinalized) blockReason = "Đã chốt danh sách.";
      else if (!canOperateRoundBus(String(roundBusId)))
        blockReason = "Chỉ Trưởng xe mới được quyền thao tác.";
      else if (!canModifyRound)
        blockReason = "Bạn không có quyền quản lý chuyến đi này.";

      const busReadOnly = Boolean(blockReason) || busFinalized;
      const canModifyAttendance =
        canModifyRound && !tripLockedForAttendance && !busFinalized;

      return {
        key: String(tb.id),
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
            roundBusId={String(roundBusId)}
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
            onUndoCheckIn={handleUndoCheckIn}
            onUndoCheckOut={handleUndoCheckOut}
            onCheckOutAll={(checkedInRows) =>
              handleCheckOutAll(checkedInRows, String(roundBusId))
            }
            roundPosition={roundPosition}
            checkoutPhaseFinalized={Boolean(
              checkoutFinalizedRoundBuses[activeTripId || ""]?.[
                String(roundBusId)
              ],
            )}
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
              value={
                trips.some((t) => String(t.id) === activeTripId)
                  ? activeTripId
                  : undefined
              }
              onChange={(val) => setActiveTripId(val)}
              options={trips.map((t) => ({
                value: String(t.id),
                label: t.name,
              }))}
              loading={isLoadingData}
              showSearch
              optionFilterProp="label"
              className="w-full sm:w-64"
              notFoundContent="Không có chuyến đi"
            />
            {tripStatusInfo && (() => {
              if (tripStatusInfo.status !== "planned" || tripStatusInfo.isOverdue) return null;
              const targetDate = activeTabDay || activeTripObj?.start_date;
              if (!targetDate) return null;

              const targetDateDayjs = dayjs(targetDate).startOf("day");
              const todayDayjs = dayjs().startOf("day");

              const isSameDay = targetDateDayjs.isSame(todayDayjs, "day");
              const isPastDay = targetDateDayjs.isBefore(todayDayjs, "day");
              const isFutureDay = targetDateDayjs.isAfter(todayDayjs, "day");
              
              return (
                <div className="flex items-center gap-3">
                  {isFutureDay && (
                    <Button 
                      disabled
                      className="font-medium text-slate-500 bg-slate-100 border-none"
                    >
                      Xuất phát ngày {dayjs(targetDate).format("DD/MM/YYYY")}
                    </Button>
                  )}
                  {isPastDay && (
                    <Button 
                      type="dashed"
                      danger
                      className="font-medium cursor-default"
                      style={{ pointerEvents: "none" }}
                    >
                      Đã quá ngày xuất phát
                    </Button>
                  )}
                  {isSameDay && isTourManagerLike(currentUser) && (
                    <Button
                      type="primary"
                      icon={<SendOutlined />}
                      className="font-bold tracking-wide shadow-md hover:shadow-lg"
                      style={{
                        backgroundColor: "#16a34a",
                        borderColor: "#16a34a",
                      }}
                      onClick={handleStartTrip}
                      loading={startTripMutation.isPending}
                    >
                      XUẤT PHÁT
                    </Button>
                  )}
                </div>
              );
            })()}
          </div>
        </div>

        {tripDays.length > 0 && (
          <div className="mb-4">
            <Tabs
              activeKey={activeTabDay}
              onChange={setActiveTabDay}
              items={tripDays.map((dayStr) => ({
                key: dayStr,
                label: dayjs(dayStr).format("DD/MM/YYYY"),
              }))}
            />
          </div>
        )}

        {timelineItems.length > 0 ? (
          <RoundTimeline items={timelineItems} onSelect={setActiveRoundId} />
        ) : (
          <div className="py-8 text-center text-slate-500 bg-slate-50 rounded-xl border border-slate-100">
            Không có lịch trình di chuyển trong ngày này.
          </div>
        )}

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
        isCheckoutFinalizedForTripBus={isCheckoutFinalizedForTripBus}
        isCheckinFinalizedForTripBus={isCheckinFinalizedForTripBus}
      />
    </div>
  );
}
