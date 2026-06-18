import React from "react";

import { Card, Empty, Modal, Tag } from "antd";

import type { EnrichedTrip } from "./types";
import type { Trip } from "../../../api/trips";

interface TripDetailModalProps {
  detail: { trip: EnrichedTrip; mode: "rounds" } | null;
  onClose: () => void;
  statusMeta: Record<Trip["status"], { label: string; color: string }>;
}

export default function TripDetailModal({
  detail,
  onClose,
  statusMeta,
}: TripDetailModalProps) {
  return (
    <Modal
      open={!!detail}
      onCancel={onClose}
      footer={null}
      title={detail ? `Round liên quan - ${detail.trip.name}` : ""}
      width={700}
    >
      {detail?.mode === "rounds" && (
        <div className="space-y-3">
          {detail.trip.rounds.length === 0 && (
            <Empty description="Chưa có round" />
          )}
          {detail.trip.rounds.map((round) => (
            <Card
              key={round.id}
              size="small"
              className="border-slate-200"
              styles={{ body: { padding: 12 } }}
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-semibold text-slate-900">
                    {round.name}
                  </div>
                  <div className="text-xs text-slate-500">
                    Thứ tự: {round.sequence} · {round.location}
                  </div>
                </div>
                <Tag color={statusMeta[round.status].color}>
                  {statusMeta[round.status].label}
                </Tag>
              </div>
            </Card>
          ))}
        </div>
      )}
    </Modal>
  );
}
