import { useMutation, useQueryClient } from "@tanstack/react-query";
import { message } from "antd";

import {
  createTransaction,
  updateTransaction,
  bulkCheckOutTransactions,
  upsertPassengerTransfer,
  deletePassengerTransfer,
  switchBus,
  undoTransfer,
  finalizeRoundBus,
  finalizeRoundBusCheckout,
  updateTripPartial,
  deleteTransaction,
  type TransactionItem,
  type PassengerTransfer,
} from "../../../api/trips";
import { extractApiError } from "../../../utils/helper";

export function useTransactionsMutations({
  activeTripId,
  activeRoundId,
  passengerHomeBusMap,
  transferByPassenger,
}: {
  activeTripId: string | undefined;
  activeRoundId: string | undefined;
  passengerHomeBusMap: Map<string, string | null>;
  transferByPassenger: Map<string, PassengerTransfer>;
}) {
  const queryClient = useQueryClient();

  const checkInMutation = useMutation({
    mutationFn: async ({
      passengerId,
      roundBusId,
    }: {
      passengerId: string;
      roundBusId: string;
    }) => {
      const now = new Date().toISOString();
      return createTransaction({
        passenger: passengerId,
        round_bus: roundBusId,
        check_in: now,
        check_out: null,
      });
    },
    onSuccess: async () => {
      message.success("Đã điểm danh lên xe");
      await queryClient.invalidateQueries({ queryKey: ["transactions"] });
    },
    onError: (error: any) => {
      message.error(extractApiError(error, "Điểm danh thất bại"));
    },
  });

  const checkOutMutation = useMutation({
    mutationFn: async (txn: TransactionItem) => {
      const now = new Date().toISOString();
      return updateTransaction(txn.id, {
        passenger: txn.passenger,
        round_bus: txn.round_bus,
        check_in: txn.check_in,
        check_out: now,
      });
    },
    onSuccess: async () => {
      message.success("Đã điểm danh xuống xe");
      await queryClient.invalidateQueries({ queryKey: ["transactions"] });
    },
    onError: (error: any) =>
      message.error(extractApiError(error, "Điểm danh xuống thất bại")),
  });

  const undoCheckInMutation = useMutation({
    mutationFn: async (txn: TransactionItem) => {
      return deleteTransaction(String(txn.id));
    },
    onSuccess: async () => {
      message.success("Đã hủy điểm danh lên xe");
      await queryClient.invalidateQueries({ queryKey: ["transactions"] });
    },
    onError: (error: any) =>
      message.error(extractApiError(error, "Hủy điểm danh lên thất bại")),
  });

  const undoCheckOutMutation = useMutation({
    mutationFn: async (txn: TransactionItem) => {
      return updateTransaction(txn.id, {
        passenger: txn.passenger,
        round_bus: txn.round_bus,
        check_in: txn.check_in,
        check_out: null,
      });
    },
    onSuccess: async () => {
      message.success("Đã hủy điểm danh xuống xe");
      await queryClient.invalidateQueries({ queryKey: ["transactions"] });
    },
    onError: (error: any) =>
      message.error(extractApiError(error, "Hủy điểm danh xuống thất bại")),
  });

  const bulkCheckOutMutation = useMutation({
    mutationFn: async ({
      transactionIds,
      checkOutTime,
    }: {
      transactionIds: (string | number)[];
      checkOutTime: string;
    }) => {
      return bulkCheckOutTransactions({
        transaction_ids: transactionIds,
        check_out: checkOutTime,
      });
    },
    onSuccess: async () => {
      message.success("Đã điểm danh xuống xe hàng loạt");
      await queryClient.invalidateQueries({ queryKey: ["transactions"] });
    },
    onError: (error: any) =>
      message.error(
        extractApiError(error, "Điểm danh xuống hàng loạt thất bại"),
      ),
  });

  const upsertTransferMutation = useMutation({
    mutationFn: async ({
      passengerId,
      toTripBusId,
      fromTripBusId,
    }: {
      passengerId: string;
      toTripBusId: string;
      fromTripBusId?: string | null;
    }) =>
      upsertPassengerTransfer({
        passenger: passengerId,
        to_trip_bus: toTripBusId,
        from_trip_bus: fromTripBusId ?? null,
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["passenger-transfers", activeTripId],
      });
    },
    onError: (error: any) =>
      message.error(extractApiError(error, "Lưu chuyển xe thất bại")),
  });

  const deleteTransferMutation = useMutation({
    mutationFn: async (transferId: string) =>
      deletePassengerTransfer(transferId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["passenger-transfers", activeTripId],
      });
    },
    onError: (error: any) =>
      message.error(extractApiError(error, "Huỷ chuyển xe thất bại")),
  });

  const switchBusMutation = useMutation({
    mutationFn: async ({
      passengerId,
      fromTxn,
      targetRoundBusId,
      targetTripBusId,
    }: {
      passengerId: string;
      fromTxn?: TransactionItem;
      targetRoundBusId: string;
      targetTripBusId?: string;
    }) => {
      const existingTransfer = transferByPassenger.get(String(passengerId));
      const currentAssignment =
        existingTransfer?.to_trip_bus ||
        passengerHomeBusMap.get(String(passengerId)) ||
        null;

      const transferAction =
        existingTransfer &&
        targetTripBusId === passengerHomeBusMap.get(String(passengerId))
          ? "delete"
          : "upsert";

      return switchBus({
        passenger_id: passengerId,
        from_txn_id: fromTxn?.id,
        target_round_bus_id: targetRoundBusId,
        target_trip_bus_id: targetTripBusId || "",
        from_trip_bus_id: currentAssignment,
        trip_id: activeTripId || "",
        transfer_action: transferAction,
        existing_transfer_id: existingTransfer?.id,
      } as any);
    },
    onSuccess: async () => {
      message.success("Đã chuyển xe và điểm danh");
      await queryClient.invalidateQueries({ queryKey: ["transactions"] });
      await queryClient.invalidateQueries({
        queryKey: ["passenger-transfers", activeTripId],
      });
    },
    onError: (error: any) => {
      message.error(extractApiError(error, "Chuyển xe thất bại"));
    },
  });

  const undoTransferMutation = useMutation({
    mutationFn: async ({ passengerId }: { passengerId: string }) => {
      if (!activeRoundId || !activeTripId) throw new Error("Missing context");
      await undoTransfer({
        passenger_id: passengerId,
        round_id: activeRoundId,
        trip_id: activeTripId,
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["transactions"] });
      await queryClient.invalidateQueries({
        queryKey: ["passenger-transfers", activeTripId],
      });
    },
    onError: (error: any) =>
      message.error(extractApiError(error, "Huỷ chuyển thất bại")),
  });

  const finalizeRoundBusMutation = useMutation({
    mutationFn: async ({
      roundBusId,
      finalized,
      snapshotData,
    }: {
      roundBusId: string;
      finalized: boolean;
      snapshotData?: any;
    }) => {
      return finalizeRoundBus(roundBusId, finalized, undefined, snapshotData);
    },
    onSuccess: async () => {
      message.success("Đã cập nhật trạng thái xe");
      await queryClient.invalidateQueries({ queryKey: ["round-buses"] });
      await queryClient.invalidateQueries({ queryKey: ["trips"] });
    },
    onError: (error: any) =>
      message.error(extractApiError(error, "Cập nhật trạng thái xe thất bại")),
  });

  const finalizeRoundBusCheckoutMutation = useMutation({
    mutationFn: async ({
      roundBusId,
      finalized,
      snapshotData,
    }: {
      roundBusId: string;
      finalized: boolean;
      snapshotData?: any;
    }) => {
      return finalizeRoundBusCheckout(
        roundBusId,
        finalized,
        undefined,
        snapshotData,
      );
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["round-buses"] });
    },
    onError: (error: any) =>
      message.error(extractApiError(error, "Cập nhật trạng thái xe thất bại")),
  });

  const startTripMutation = useMutation({
    mutationFn: async (tripId: string) =>
      updateTripPartial(tripId, { status: "doing" }),
    onSuccess: async () => {
      message.success("Đã bắt đầu chuyến đi!");
      await queryClient.invalidateQueries({ queryKey: ["trips"] });
    },
    onError: (error: any) => {
      message.error(extractApiError(error, "Không thể bắt đầu chuyến đi"));
    },
  });

  const isMutationBusy =
    checkInMutation.isPending ||
    checkOutMutation.isPending ||
    switchBusMutation.isPending ||
    upsertTransferMutation.isPending ||
    deleteTransferMutation.isPending ||
    undoTransferMutation.isPending ||
    finalizeRoundBusMutation.isPending;

  return {
    checkInMutation,
    checkOutMutation,
    undoCheckInMutation,
    undoCheckOutMutation,
    bulkCheckOutMutation,
    upsertTransferMutation,
    deleteTransferMutation,
    switchBusMutation,
    undoTransferMutation,
    finalizeRoundBusMutation,
    finalizeRoundBusCheckoutMutation,
    startTripMutation,
    isMutationBusy,
  };
}
