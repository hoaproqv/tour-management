import React from "react";

import { Card, Empty, Modal, Tag, Typography } from "antd";

import type { EnrichedTrip } from "./types";
import type { Trip } from "../../../api/trips";

interface TripDetailModalProps {
  detail: { trip: EnrichedTrip; mode: "rounds" | "buses" } | null;
  onClose: () => void;
  busMap: Map<string | number, string>;
  userContactMap: Map<string | number, { name?: string; phone?: string }>;
  statusMeta: Record<Trip["status"], { label: string; color: string }>;
}

const { Text } = Typography;

export default function TripDetailModal({
  detail,
  onClose,
  busMap,
  userContactMap,
  statusMeta,
}: TripDetailModalProps) {
  return (
    <Modal
      open={!!detail}
      onCancel={onClose}
      footer={null}
      title={
        detail
          ? `${detail.mode === "rounds" ? "Round" : "Bus"} liên quan - ${detail.trip.name}`
          : ""
      }
      width={700}
    >
      {detail?.mode === "rounds" && (
        <div className="space-y-3">
          {detail.trip.rounds.length === 0 && <Empty description="Chưa có round" />}
          {detail.trip.rounds.map((round) => (
            <Card
              key={round.id}
              size="small"
              className="border-slate-200"
              styles={{ body: { padding: 12 } }}
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-semibold text-slate-900">{round.name}</div>
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

      {detail?.mode === "buses" && (
        <div className="space-y-3">
          {detail.trip.buses.length === 0 && <Empty description="Chưa có bus" />}
          {detail.trip.buses.map((tb) => {
            const driverKey = tb.driver ?? undefined;
            const driverContact = driverKey ? userContactMap.get(driverKey) : undefined;
            const managerContact = userContactMap.get(tb.manager);
            const driverPhone = driverContact?.phone || tb.driver_tel || "—";
            const driverName = driverContact?.name || tb.driver_name || "Tài xế";
            const managerName = managerContact?.name || "Trưởng xe";
            const managerPhone = managerContact?.phone || "—";

            return (
              <Card
                key={tb.id}
                size="small"
                className="border-slate-200"
                styles={{ body: { padding: 12 } }}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-semibold text-slate-900">
                      {busMap.get(tb.bus) || "Bus"}
                    </div>
                    <div className="text-xs text-slate-500">
                      {`Tài xế: ${driverName} · ${driverPhone}`}
                    </div>
                  </div>
                  <Text type="secondary">
                    {`Trưởng xe: ${managerName} · ${managerPhone}`}
                  </Text>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </Modal>
  );
}
