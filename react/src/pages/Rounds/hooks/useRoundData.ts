import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { message } from "antd";

import {
  bulkDeleteRounds,
  createRound,
  deleteRound,
  exportRounds,
  getRounds,
  getTripBuses,
  getTrips,
  reorderRounds,
  updateRound,
} from "../../../api/trips";

import type { RoundItem, RoundPayload, Trip } from "../../../api/trips";

export function useRoundData() {
  const queryClient = useQueryClient();

  const { data: tripsResponse } = useQuery({
    queryKey: ["trips"],
    queryFn: () => getTrips({ page: 1, limit: 1000 }),
  });
  const trips = (tripsResponse?.data as Trip[]) || [];

  const { data: tripBusesResponse } = useQuery({
    queryKey: ["tripBuses"],
    queryFn: () => getTripBuses({ page: 1, limit: 1000 }),
  });
  const tripBuses = (tripBusesResponse?.data as any[]) || [];

  const { data: roundsResponse, isLoading } = useQuery({
    queryKey: ["rounds"],
    queryFn: () => getRounds({ page: 1, limit: 1000 }),
  });
  const rounds = (roundsResponse?.data as RoundItem[]) || [];

  const reorderMutation = useMutation({
    mutationFn: (items: any[]) => reorderRounds(items),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rounds"] });
    },
    onError: () => {
      message.error("Lỗi khi sắp xếp lại");
    },
  });

  const createMutation = useMutation({
    mutationFn: (payload: RoundPayload) => createRound(payload),
    onSuccess: () => {
      message.success("Tạo chặng thành công");
      queryClient.invalidateQueries({ queryKey: ["rounds"] });
    },
    onError: (err: any) => {
      message.error(err?.response?.data?.detail || "Lỗi khi tạo chặng");
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: { id: string; payload: RoundPayload }) =>
      updateRound(data.id, data.payload),
    onSuccess: () => {
      message.success("Cập nhật chặng thành công");
      queryClient.invalidateQueries({ queryKey: ["rounds"] });
    },
    onError: (err: any) => {
      message.error(err?.response?.data?.detail || "Lỗi khi cập nhật");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteRound(id),
    onSuccess: () => {
      message.success("Xóa chặng thành công");
      queryClient.invalidateQueries({ queryKey: ["rounds"] });
    },
    onError: () => {
      message.error("Lỗi khi xóa chặng");
    },
  });

  const handleExport = async (tripId: string) => {
    try {
      const blob = await exportRounds(tripId);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `rounds_${tripId}.xlsx`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch {
      message.error("Lỗi khi export");
    }
  };

  const handleBulkDelete = async (
    selectedRowKeys: string[],
    onSuccess: () => void,
  ) => {
    const hide = message.loading("Đang xóa...", 0);
    try {
      await bulkDeleteRounds(selectedRowKeys as string[]);
      message.success(`Đã xóa ${selectedRowKeys.length} chặng`);
      await queryClient.invalidateQueries({ queryKey: ["rounds"] });
      onSuccess();
    } catch {
      message.error("Lỗi khi xóa chặng");
    } finally {
      hide();
    }
  };

  return {
    trips,
    tripBuses,
    rounds,
    isLoading,
    reorderMutation,
    createMutation,
    updateMutation,
    deleteMutation,
    handleExport,
    handleBulkDelete,
    createRound,
  };
}
