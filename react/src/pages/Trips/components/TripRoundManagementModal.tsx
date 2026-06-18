import React, { useEffect, useState } from "react";

import { useQuery } from "@tanstack/react-query";
import { Modal, Spin, Tag } from "antd";

import { getRounds } from "../../../api/trips";

import type { EnrichedTrip } from "./types";
import type { RoundItem } from "../../../api/trips";

const statusMeta: Record<
  RoundItem["status"],
  { label: string; color: string }
> = {
  planned: { label: "Chưa đi", color: "blue" },
  doing: { label: "Đang đi", color: "orange" },
  done: { label: "Đã đi", color: "green" },
};

interface TripRoundManagementModalProps {
  trip: EnrichedTrip | null;
  open: boolean;
  onClose: () => void;
}

export default function TripRoundManagementModal({
  trip,
  open,
  onClose,
}: TripRoundManagementModalProps) {
  const [rounds, setRounds] = useState<RoundItem[]>([]);

  const { data, isLoading } = useQuery({
    queryKey: ["rounds", trip?.id],
    queryFn: () => getRounds({ trip: trip?.id, page: 1, limit: 1000 }),
    enabled: open && Boolean(trip?.id),
  });

  useEffect(() => {
    const list = Array.isArray((data as any)?.data) ? (data as any).data : [];
    const sorted = [...list].sort(
      (a: RoundItem, b: RoundItem) => a.sequence - b.sequence,
    );
    setRounds(sorted);
  }, [data]);

  return (
    <Modal
      open={open}
      onCancel={onClose}
      footer={null}
      title={trip ? `Xem hành trình - ${trip.name}` : "Xem hành trình"}
      width={640}
      destroyOnClose
    >
      {isLoading ? (
        <div className="flex justify-center py-8">
          <Spin />
        </div>
      ) : (
        <div className="mt-4">
          {rounds.length === 0 && (
            <div className="text-center text-slate-400 py-6 text-sm">
              Chưa có điểm dừng nào.
            </div>
          )}

          <div
            className="space-y-2 overflow-y-auto pr-1 custom-scrollbar"
            style={{ maxHeight: "calc(100vh - 280px)" }}
          >
            {rounds.map((round) => (
              <div
                key={round.id}
                className="flex items-center gap-3 bg-white border border-slate-200 rounded-lg px-4 py-3"
              >
                {/* Sequence badge */}
                <span className="shrink-0 w-8 h-8 rounded-full bg-blue-50 text-blue-600 text-sm flex items-center justify-center font-bold border border-blue-100">
                  {round.sequence}
                </span>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-[14px] text-slate-800 truncate">
                    {round.name}
                  </div>
                  <div className="text-[12px] text-slate-500 truncate mt-0.5">
                    {round.location || "Chưa có địa chỉ chi tiết"}
                  </div>
                </div>

                {/* Status tag */}
                <Tag
                  color={statusMeta[round.status].color}
                  className="shrink-0 !m-0 text-[12px] px-2 py-0.5"
                >
                  {statusMeta[round.status].label}
                </Tag>
              </div>
            ))}
          </div>
        </div>
      )}
    </Modal>
  );
}
