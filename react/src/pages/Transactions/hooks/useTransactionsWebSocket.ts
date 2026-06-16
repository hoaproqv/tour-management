import { useEffect } from "react";

import { useQueryClient } from "@tanstack/react-query";

import type {
  PaginatedResponse,
  PassengerTransfer,
  RoundBusItem,
  TransactionItem,
} from "../../../api/trips";

const MQTT_FINALIZE_TOPIC =
  process.env.MQTT_FINALIZE_TOPIC || "round-finalize/#";
const MQTT_TRANSFER_TOPIC =
  process.env.MQTT_TRANSFER_TOPIC || "passenger-transfer/#";

export function useTransactionsWebSocket() {
  const queryClient = useQueryClient();

  useEffect(() => {
    let client: import("mqtt").MqttClient | null = null;
    let canceled = false;

    const applyRealtimeUpdate = (incoming: TransactionItem) => {
      queryClient.setQueryData<PaginatedResponse<TransactionItem>>(
        ["transactions"],
        (prev) => {
          if (!prev?.data) return prev;

          const next = Array.isArray(prev.data) ? [...prev.data] : [];
          const idx = next.findIndex((item) => item.id === incoming.id);

          if ((incoming as any).deleted) {
            if (idx >= 0) next.splice(idx, 1);
          } else {
            if (idx >= 0) {
              next[idx] = { ...next[idx], ...incoming };
            } else {
              next.unshift(incoming);
            }
          }

          return { ...prev, data: next };
        },
      );

      queryClient.invalidateQueries({
        queryKey: ["transactions"],
        refetchType: "none",
      });
    };

    const applyFinalizeUpdate = (incoming: {
      round_bus?: string | number;
      trip?: string | number;
      finalized_at?: string | null;
      round?: string | number;
      trip_bus?: string | number;
    }) => {
      if (!incoming?.round_bus) return;
      const roundBusId = String(incoming.round_bus);

      queryClient.setQueryData<PaginatedResponse<RoundBusItem>>(
        ["round-buses"],
        (prev) => {
          if (!prev?.data) return prev;
          const next = [...prev.data];
          const idx = next.findIndex((rb) => String(rb.id) === roundBusId);
          if (idx >= 0) {
            next[idx] = {
              ...next[idx],
              finalized_at: incoming.finalized_at ?? null,
            };
          }
          return { ...prev, data: next };
        },
      );

      queryClient.invalidateQueries({
        queryKey: ["round-buses"],
        refetchType: "none",
      });
    };

    const applyTransferUpdate = (incoming: {
      passenger?: string | number;
      to_trip_bus?: string | number | null;
      from_trip_bus?: string | number | null;
      trip?: string | number;
      id?: string | number;
      deleted?: boolean;
    }) => {
      if (!incoming?.passenger || !incoming.trip) return;
      const tripKey = String(incoming.trip);
      queryClient.setQueryData<PassengerTransfer[]>(
        ["passenger-transfers", tripKey],
        (prev) => {
          const list = Array.isArray(prev) ? [...prev] : [];
          const idx = list.findIndex(
            (t) => String(t.passenger) === String(incoming.passenger),
          );

          if (incoming.deleted) {
            if (idx >= 0) list.splice(idx, 1);
            return list;
          }

          const base: PassengerTransfer = {
            id: String(incoming.id ?? list[idx]?.id ?? incoming.passenger),
            passenger: String(incoming.passenger),
            from_trip_bus: incoming.from_trip_bus
              ? String(incoming.from_trip_bus)
              : null,
            to_trip_bus: incoming.to_trip_bus
              ? String(incoming.to_trip_bus)
              : list[idx]?.to_trip_bus || "",
            trip: tripKey,
            created_at: list[idx]?.created_at || new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };

          if (idx >= 0) {
            list[idx] = { ...list[idx], ...base };
          } else {
            list.push(base);
          }
          return list;
        },
      );

      queryClient.invalidateQueries({
        queryKey: ["passenger-transfers", tripKey],
        refetchType: "none",
      });
    };

    const connectMqtt = async () => {
      if (!process.env.MQTT_URL) return;
      try {
        const mqttModule = await import("mqtt");
        const mqtt =
          (
            mqttModule as unknown as {
              default?: typeof import("mqtt");
              connect: (typeof import("mqtt"))["connect"];
            }
          ).default ||
          (mqttModule as unknown as {
            connect: (typeof import("mqtt"))["connect"];
          });
        if (!mqtt?.connect) throw new Error("mqtt.connect not available");
        if (canceled) return;
        const topic = process.env.MQTT_TRANSACTIONS_TOPIC || "transactions/#";
        client = mqtt.connect(process.env.MQTT_URL, {
          username: process.env.MQTT_USERNAME,
          password: process.env.MQTT_PASSWORD,
        });
        client.on("connect", () => {
          client?.subscribe(topic);
          client?.subscribe(MQTT_FINALIZE_TOPIC);
          client?.subscribe(MQTT_TRANSFER_TOPIC);
          console.log(
            "✓ MQTT connected and subscribed to:",
            topic,
            "and",
            MQTT_FINALIZE_TOPIC,
            "and",
            MQTT_TRANSFER_TOPIC,
          );
        });
        client.on("message", (_topic, payload) => {
          try {
            const raw = payload?.toString?.() ?? "";
            const parsed = raw ? JSON.parse(raw) : null;
            const candidate =
              (parsed && (parsed.transaction || parsed.data)) || parsed;

            if (_topic.startsWith("round-finalize")) {
              if (
                candidate &&
                typeof candidate === "object" &&
                "round_bus" in candidate &&
                "trip" in candidate
              ) {
                applyFinalizeUpdate(
                  candidate as {
                    round_bus: string;
                    trip: string;
                    finalized_at?: string | null;
                  },
                );
                return;
              }
            }

            if (_topic.startsWith("passenger-transfer")) {
              if (candidate && typeof candidate === "object") {
                applyTransferUpdate(
                  candidate as {
                    passenger: string;
                    to_trip_bus?: string | null;
                    from_trip_bus?: string | null;
                    trip?: string;
                    id?: string;
                    deleted?: boolean;
                  },
                );
                return;
              }
            }

            if (
              candidate &&
              typeof candidate === "object" &&
              "id" in candidate &&
              ("deleted" in candidate ||
                ("passenger" in candidate && "round_bus" in candidate))
            ) {
              console.log(
                "✓ Received transaction update:",
                (candidate as { id: string }).id,
              );
              applyRealtimeUpdate(candidate as TransactionItem);
            } else {
              console.log("⚠ Unknown MQTT payload, refetching...");
              queryClient.invalidateQueries({ queryKey: ["transactions"] });
            }
          } catch (error) {
            console.error("MQTT message parse error:", error);
            queryClient.invalidateQueries({ queryKey: ["transactions"] });
          }
        });
        client.on("error", (error) => {
          console.error("MQTT error:", error);
        });
      } catch (error) {
        console.warn("MQTT not configured", error);
      }
    };

    connectMqtt();

    return () => {
      canceled = true;
      client?.end(true);
    };
  }, [queryClient]);
}
