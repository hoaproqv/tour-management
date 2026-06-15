import React from "react";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Modal, Empty, Spin, Select, message } from "antd";

import { updateTripBus, type BusItem, type TripBus } from "../../../api/trips";

import type { EnrichedTrip } from "./types";
import type { IUser } from "../../../utils/types";

interface TripBusAssignmentModalProps {
  trip: EnrichedTrip | null;
  open: boolean;
  onClose: () => void;
  buses: BusItem[];
  loadingBuses: boolean;
  drivers: IUser[];
  fleetLeads: IUser[];
}

export default function TripBusAssignmentModal({
  trip,
  open,
  onClose,
  buses,
  loadingBuses,
  drivers,
  fleetLeads,
}: TripBusAssignmentModalProps) {
  const queryClient = useQueryClient();
  const tripBuses = trip?.buses || [];

  const mutation = useMutation({
    mutationFn: (data: { id: string; payload: Partial<TripBus> }) =>
      updateTripBus(data.id, data.payload),
    onSuccess: async () => {
      message.success("Cập nhật thành công");
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["trips"] }),
        queryClient.invalidateQueries({ queryKey: ["trip-buses"] }),
      ]);
    },
    onError: (error: any) => {
      const msg =
        error?.response?.data?.manager?.[0] ||
        error?.response?.data?.driver?.[0] ||
        "Cập nhật thất bại";
      message.error(msg);
    },
  });

  const getAssignedBusStr = (
    userId: string,
    currentTbId: string,
    type: "manager" | "driver",
  ) => {
    const assignedTb = tripBuses.find(
      (tb) => String(tb[type]) === userId && tb.id !== currentTbId,
    );
    if (!assignedTb) return null;
    const b = buses.find((b) => b.id === assignedTb.bus);
    return b ? b.registration_number || b.bus_code : "Xe khác";
  };

  const filteredFleetLeads = trip?.tenant
    ? fleetLeads.filter((m) => String(m.tenant) === String(trip.tenant))
    : fleetLeads;

  const filteredDrivers = trip?.tenant
    ? drivers.filter((d) => String(d.tenant) === String(trip.tenant))
    : drivers;

  return (
    <Modal
      open={open}
      onCancel={onClose}
      footer={null}
      title={trip ? `Xem Xe khách - ${trip.name}` : "Xem Xe khách"}
      width={720}
      destroyOnClose
    >
      <div className="mt-4">
        {loadingBuses ? (
          <div className="flex flex-col items-center justify-center py-8 text-slate-500">
            <Spin size="large" className="mb-4" />
            <span>Đang tải dữ liệu...</span>
          </div>
        ) : (
          <>
            <div className="mb-4">
              <span className="font-semibold text-slate-700">Tổng số xe: </span>
              <span className="text-blue-600 font-bold">
                {tripBuses.length}
              </span>
            </div>

            {tripBuses.length === 0 ? (
              <Empty description="Không có dữ liệu" className="my-8" />
            ) : (
              <div
                className="space-y-4 overflow-y-auto pr-2 custom-scrollbar"
                style={{ maxHeight: "calc(100vh - 250px)" }}
              >
                {tripBuses.map((tb, index) => {
                  const busObj = buses.find((b) => b.id === tb.bus);

                  return (
                    <div
                      key={tb.id || index}
                      className="p-4 border border-slate-200 rounded-lg bg-slate-50 flex flex-col md:flex-row gap-4"
                    >
                      {/* Bus info */}
                      <div className="flex-1 border-b md:border-b-0 md:border-r border-slate-200 pb-3 md:pb-0 md:pr-4">
                        <div className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">
                          Xe {index + 1}
                        </div>
                        <div className="font-bold text-slate-800 text-lg">
                          {busObj?.registration_number ||
                            busObj?.bus_code ||
                            `Xe ${index + 1}`}
                        </div>
                      </div>

                      {/* Staff info */}
                      <div className="flex-[2] grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {/* Manager */}
                        <div>
                          <div className="text-xs font-semibold text-slate-500 mb-1">
                            Trưởng xe
                          </div>
                          <Select
                            value={tb.manager || undefined}
                            className="w-full"
                            placeholder="Chọn trưởng xe"
                            loading={mutation.status === "pending"}
                            onChange={(val) =>
                              mutation.mutate({
                                id: tb.id,
                                payload: { manager: val },
                              })
                            }
                            options={filteredFleetLeads.map((m) => {
                              const assignedBus = getAssignedBusStr(
                                String(m.id),
                                tb.id,
                                "manager",
                              );
                              return {
                                value: m.id,
                                label: `${m.name} ${m.phone ? `- ${m.phone}` : ""}${assignedBus ? ` (Đã gán ở ${assignedBus})` : ""}`,
                                disabled: !!assignedBus,
                              };
                            })}
                          />
                        </div>

                        {/* Driver */}
                        <div>
                          <div className="text-xs font-semibold text-slate-500 mb-1">
                            Lái xe
                          </div>
                          <Select
                            value={tb.driver || undefined}
                            className="w-full"
                            placeholder="Chọn lái xe"
                            loading={mutation.status === "pending"}
                            onChange={(val) =>
                              mutation.mutate({
                                id: tb.id,
                                payload: { driver: val },
                              })
                            }
                            options={filteredDrivers.map((d) => {
                              const assignedBus = getAssignedBusStr(
                                String(d.id),
                                tb.id,
                                "driver",
                              );
                              return {
                                value: d.id,
                                label: `${d.name} ${d.phone ? `- ${d.phone}` : ""}${assignedBus ? ` (Đã gán ở ${assignedBus})` : ""}`,
                                disabled: !!assignedBus,
                              };
                            })}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>
    </Modal>
  );
}
