import React from "react";

import { Modal, Empty, Spin } from "antd";

import { type BusItem } from "../../../api/trips";

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
  const tripBuses = trip?.buses || [];

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
                  const managerUser = fleetLeads.find(
                    (m) => String(m.id) === String(tb.manager),
                  );
                  const driverUser = drivers.find(
                    (d) => String(d.id) === String(tb.driver),
                  );

                  return (
                    <div
                      key={tb.id || index}
                      className="px-4 py-3 border border-slate-200 rounded-lg bg-slate-50 flex flex-col md:flex-row md:items-center gap-4"
                    >
                      {/* Bus info */}
                      <div className="flex-1 border-b md:border-b-0 md:border-r border-slate-200 pb-3 md:pb-0 md:pr-4">
                        <div className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">
                          Xe {index + 1}
                        </div>
                        <div className="font-bold text-slate-800 text-lg leading-tight">
                          {busObj?.registration_number || `Xe ${index + 1}`}
                        </div>
                        {busObj?.bus_code && (
                          <div className="text-sm text-slate-500 mt-0.5">
                            Mã xe: {busObj.bus_code}
                          </div>
                        )}
                      </div>

                      {/* Staff info */}
                      <div className="flex-[2] grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {/* Manager */}
                        <div>
                          <div className="text-[11px] font-semibold text-slate-500 mb-0.5 uppercase tracking-wider">
                            Trưởng xe
                          </div>
                          <div className="text-[15px] font-medium text-slate-800">
                            {managerUser ? managerUser.name : "—"}
                          </div>
                        </div>

                        {/* Driver */}
                        <div>
                          <div className="text-[11px] font-semibold text-slate-500 mb-0.5 uppercase tracking-wider">
                            Lái xe
                          </div>
                          <div className="text-[15px] font-medium text-slate-800">
                            {driverUser ? driverUser.name : "—"}
                          </div>
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
