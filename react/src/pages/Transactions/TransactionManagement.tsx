import React, { useEffect, useMemo, useState } from "react";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Badge,
  Card,
  Empty,
  Input,
  Select,
  Space,
  Tabs,
  Tag,
  Typography,
  message,
} from "antd";
import dayjs from "dayjs";

import {
  createTransaction,
  getBuses,
  getPassengers,
  getPassengerTransfers,
  getRoundBuses,
  getRounds,
  getTransactions,
  getTripBuses,
  getTrips,
  finalizeRoundBus,
  upsertPassengerTransfer,
  deletePassengerTransfer,
  updateTransaction,
  type BusItem,
  type PaginatedResponse,
  type Passenger,
  type PassengerTransfer,
  type RoundBusItem,
  type RoundItem,
  type TransactionItem,
  type Trip,
  type TripBus,
} from "../../api/trips";
import { useGetAccountInfo } from "../../hooks/useAuth";
import { isAdminLike, isFleetLead, isTourManagerLike } from "../../utils/helper";

import { BusPane } from "./components/BusPane";
import { CrossCheckModal } from "./components/CrossCheckModal";
import { RoundTimeline } from "./components/RoundTimeline";

import type { PassengerRow, RoundVisualStatus, RowStatus } from "./components/types";
import type { IUser } from "../../utils/types";

const { Title, Text } = Typography;
const STORAGE_KEY = "transaction-attendance-filters";
const MQTT_FINALIZE_TOPIC = process.env.MQTT_FINALIZE_TOPIC || "round-finalize/#";
const MQTT_TRANSFER_TOPIC = process.env.MQTT_TRANSFER_TOPIC || "passenger-transfer/#";

export default function TransactionManagement() {
  const queryClient = useQueryClient();

  const [activeTripId, setActiveTripId] = useState<string>();
  const [activeTripBusId, setActiveTripBusId] = useState<string>();
  const [activeRoundId, setActiveRoundId] = useState<string>();
  const [search, setSearch] = useState("");
  const [crossCheck, setCrossCheck] = useState<{
    busId: string | null;
    sourceBusId?: string;
    passengerId?: string;
  }>({ busId: null });
  const { data: accountInfo } = useGetAccountInfo();
  const currentUser = accountInfo as IUser | undefined;

  useEffect(() => {
    if (typeof window === "undefined") return;
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw) as {
        activeTripId?: string;
        activeTripBusId?: string;
        activeRoundId?: string;
      };
      setActiveTripId(parsed.activeTripId);
      setActiveTripBusId(parsed.activeTripBusId);
      setActiveRoundId(parsed.activeRoundId);
    } catch {
      // ignore parse errors
    }
  }, []);

  const {
    data: tripsResponse,
    isLoading: loadingTrips,
    isFetching: fetchingTrips,
  } = useQuery<PaginatedResponse<Trip>>({
    queryKey: ["trips"],
    queryFn: () => getTrips({ page: 1, limit: 1000 }),
  });

  const {
    data: passengersResponse,
    isLoading: loadingPassengers,
    isFetching: fetchingPassengers,
  } = useQuery<PaginatedResponse<Passenger>>({
    queryKey: ["passengers"],
    queryFn: () => getPassengers({ page: 1, limit: 1000 }),
  });

  const {
    data: roundsResponse,
    isLoading: loadingRounds,
    isFetching: fetchingRounds,
  } = useQuery<PaginatedResponse<RoundItem>>({
    queryKey: ["rounds"],
    queryFn: () => getRounds({ page: 1, limit: 1000 }),
  });

  const {
    data: roundBusesResponse,
    isLoading: loadingRoundBuses,
    isFetching: fetchingRoundBuses,
  } = useQuery<PaginatedResponse<RoundBusItem>>({
    queryKey: ["round-buses"],
    queryFn: () => getRoundBuses({ page: 1, limit: 1000 }),
  });

  const {
    data: tripBusesResponse,
    isLoading: loadingTripBuses,
    isFetching: fetchingTripBuses,
  } = useQuery<PaginatedResponse<TripBus>>({
    queryKey: ["trip-buses"],
    queryFn: () => getTripBuses({ page: 1, limit: 1000 }),
  });

  const {
    data: busesResponse,
    isLoading: loadingBuses,
    isFetching: fetchingBuses,
  } = useQuery<PaginatedResponse<BusItem>>({
    queryKey: ["buses"],
    queryFn: () => getBuses({ page: 1, limit: 1000 }),
  });

  const {
    data: transactionsResponse,
    isLoading: loadingTransactions,
    isFetching: fetchingTransactions,
  } = useQuery<PaginatedResponse<TransactionItem>>({
    queryKey: ["transactions"],
    queryFn: () => getTransactions({ page: 1, limit: 1000 }),
  });

  const {
    data: passengerTransfersResponse,
    isLoading: loadingTransfers,
    isFetching: fetchingTransfers,
  } = useQuery<PassengerTransfer[]>({
    queryKey: ["passenger-transfers", activeTripId],
    queryFn: () => getPassengerTransfers({ trip: activeTripId }),
    enabled: Boolean(activeTripId),
  });

  const trips = useMemo(
    () => (Array.isArray(tripsResponse?.data) ? tripsResponse.data : []),
    [tripsResponse],
  );

  const activeTrip = useMemo(
    () => trips.find((t) => t.id === activeTripId),
    [trips, activeTripId],
  );

  const passengers = useMemo(
    () => (Array.isArray(passengersResponse?.data) ? passengersResponse.data : []),
    [passengersResponse],
  );

  const passengerHomeBusMap = useMemo(() => {
    const map = new Map<string, string | null>();
    passengers.forEach((p) => {
      map.set(p.id, p.original_bus ?? null);
    });
    return map;
  }, [passengers]);

  const rounds = useMemo(
    () => (Array.isArray(roundsResponse?.data) ? roundsResponse.data : []),
    [roundsResponse],
  );

  const roundBuses = useMemo(
    () => (Array.isArray(roundBusesResponse?.data) ? roundBusesResponse.data : []),
    [roundBusesResponse],
  );

  const tripBuses = useMemo(
    () => (Array.isArray(tripBusesResponse?.data) ? tripBusesResponse.data : []),
    [tripBusesResponse],
  );

  const isAdminUser = isAdminLike(currentUser);
  const isTourManagerUser = isTourManagerLike(currentUser);
  const isFleetLeadUser = isFleetLead(currentUser);
  const canManageAllBuses = isAdminUser || isTourManagerUser;

  const managedTripBusIds = useMemo(() => {
    const owned = new Set<string>();
    if (!currentUser?.id) return owned;
    const currentId = currentUser.id.toString();
    tripBuses.forEach((tb) => {
      if (tb.manager && tb.manager.toString() === currentId) {
        owned.add(tb.id);
      }
    });
    return owned;
  }, [currentUser, tripBuses]);

  const buses = useMemo(
    () => (Array.isArray(busesResponse?.data) ? busesResponse.data : []),
    [busesResponse],
  );

  const transactions = useMemo(
    () => (Array.isArray(transactionsResponse?.data) ? transactionsResponse.data : []),
    [transactionsResponse],
  );

  const passengerTransfers = useMemo(
    () => passengerTransfersResponse ?? [],
    [passengerTransfersResponse],
  );

  const passengerTransferMap = useMemo(() => {
    const map: Record<string, string> = {};
    passengerTransfers.forEach((t) => {
      map[t.passenger] = t.to_trip_bus;
    });
    return map;
  }, [passengerTransfers]);

  const transferByPassenger = useMemo(() => {
    const map = new Map<string, PassengerTransfer>();
    passengerTransfers.forEach((t) => {
      map.set(t.passenger, t);
    });
    return map;
  }, [passengerTransfers]);

  const passengerTransfersByTrip = useMemo(() => {
    const tripId = activeTripId || "";
    const result: Record<string, Record<string, string>> = { [tripId]: {} };
    passengerTransfers.forEach((t) => {
      if (!result[tripId]) result[tripId] = {};
      result[tripId][t.passenger] = t.to_trip_bus;
    });
    return result;
  }, [passengerTransfers, activeTripId]);

  const tripBusesByTrip = useMemo(() => {
    const map = new Map<string, TripBus[]>();
    tripBuses.forEach((tb) => {
      const list = map.get(tb.trip) ?? [];
      list.push(tb);
      map.set(tb.trip, list);
    });
    return map;
  }, [tripBuses]);

  const roundsByTrip = useMemo(() => {
    const map = new Map<string, RoundItem[]>();
    rounds.forEach((round) => {
      const list = map.get(round.trip) ?? [];
      list.push(round);
      map.set(round.trip, list);
    });
    return map;
  }, [rounds]);

  const roundToTrip = useMemo(() => {
    const map = new Map<string, string>();
    rounds.forEach((round) => {
      map.set(round.id, round.trip);
    });
    return map;
  }, [rounds]);

  const busLabelMap = useMemo(
    () =>
      new Map(buses.map((b) => [b.id, b.registration_number || b.bus_code])),
    [buses],
  );

  const tripBusLabelMap = useMemo(() => {
    const map = new Map<string, string>();
    tripBuses.forEach((tb) => {
      const label = busLabelMap.get(tb.bus) || "Bus";
      map.set(tb.id, label);
    });
    return map;
  }, [tripBuses, busLabelMap]);

  const roundBusByKey = useMemo(() => {
    const map = new Map<string, RoundBusItem>();
    roundBuses.forEach((rb) => {
      map.set(`${rb.round}-${rb.trip_bus}`, rb);
    });
    return map;
  }, [roundBuses]);

  const roundBusesByRound = useMemo(() => {
    const map = new Map<string, RoundBusItem[]>();
    roundBuses.forEach((rb) => {
      const list = map.get(rb.round) ?? [];
      list.push(rb);
      map.set(rb.round, list);
    });
    return map;
  }, [roundBuses]);

  const roundBusToRound = useMemo(() => {
    const map = new Map<string, string>();
    roundBuses.forEach((rb) => {
      map.set(rb.id, rb.round);
    });
    return map;
  }, [roundBuses]);

  const roundBusToTripBus = useMemo(() => {
    const map = new Map<string, string>();
    roundBuses.forEach((rb) => {
      map.set(rb.id, rb.trip_bus);
    });
    return map;
  }, [roundBuses]);

  const canOperateTripBus = (tripBusId?: string) => {
    if (!tripBusId) return false;
    if (canManageAllBuses) return true;
    if (isFleetLeadUser) return managedTripBusIds.has(tripBusId);
    return false;
  };

  const canOperateRoundBus = (roundBusId?: string) => {
    if (!roundBusId) return false;
    const tripBusId = roundBusToTripBus.get(roundBusId);
    return canOperateTripBus(tripBusId);
  };

  const finalizedRoundBuses = useMemo(() => {
    const map: Record<string, Record<string, string>> = {};
    roundBuses.forEach((rb) => {
      if (!rb.finalized_at) return;
      const tripId = roundToTrip.get(rb.round) || "";
      if (!tripId) return;
      const nextTrip = map[tripId] || {};
      nextTrip[rb.id] = rb.finalized_at;
      map[tripId] = nextTrip;
    });
    return map;
  }, [roundBuses, roundToTrip]);

  const transactionsForActiveRound = useMemo(() => {
    if (!activeRoundId) return [] as TransactionItem[];
    return transactions.filter(
      (tx) => roundBusToRound.get(tx.round_bus) === activeRoundId,
    );
  }, [transactions, activeRoundId, roundBusToRound]);

  const transactionByPassenger = useMemo(() => {
    const map = new Map<string, TransactionItem>();
    transactionsForActiveRound.forEach((tx) => {
      const existing = map.get(tx.passenger);
      if (!existing) {
        map.set(tx.passenger, tx);
        return;
      }
      const existingTime = dayjs(existing.check_in);
      const currentTime = dayjs(tx.check_in);
      if (currentTime.isAfter(existingTime)) {
        map.set(tx.passenger, tx);
      }
    });
    return map;
  }, [transactionsForActiveRound]);

  useEffect(() => {
    if (!activeTripId && trips.length) {
      setActiveTripId(trips[0].id);
    }
  }, [trips, activeTripId]);

  const tripScopedRound = useMemo(
    () => roundsByTrip.get(activeTripId || "") || [],
    [roundsByTrip, activeTripId],
  );

  const tripRoundsSorted = useMemo(() => {
    const list = [...tripScopedRound];
    list.sort((a, b) => {
      if (a.sequence !== b.sequence) return (a.sequence || 0) - (b.sequence || 0);
      return a.name.localeCompare(b.name);
    });
    return list;
  }, [tripScopedRound]);

  const isRoundFullyFinalized = useMemo(() => {
    const tripId = activeTripId;
    return (roundId: string) => {
      const trip = tripId || roundToTrip.get(roundId) || "";
      const buses = roundBusesByRound.get(roundId) ?? [];
      if (!buses.length) return false;
      return buses.every((rb) => Boolean(finalizedRoundBuses[trip]?.[rb.id]));
    };
  }, [activeTripId, finalizedRoundBuses, roundBusesByRound, roundToTrip]);

  const openRoundId = useMemo(() => {
    const first = tripRoundsSorted.find((r) => !isRoundFullyFinalized(r.id));
    return first?.id;
  }, [isRoundFullyFinalized, tripRoundsSorted]);

  const openRoundLabel = useMemo(() => {
    if (!openRoundId) return undefined;
    const round = tripRoundsSorted.find((r) => r.id === openRoundId);
    if (!round) return undefined;
    return `${round.sequence ? `#${round.sequence} ` : ""}${round.name}`;
  }, [openRoundId, tripRoundsSorted]);

  const tripLockedForAttendance = useMemo(
    () => (activeTrip ? activeTrip.status !== "doing" : true),
    [activeTrip],
  );

  const roundLockedBySequence = useMemo(() => {
    if (tripLockedForAttendance) return true;
    if (!activeRoundId) return false;
    if (!openRoundId) return true; // all rounds done -> lock edits
    return activeRoundId !== openRoundId;
  }, [activeRoundId, openRoundId, tripLockedForAttendance]);

  const roundAlreadyFinalized = useMemo(
    () => (activeRoundId ? isRoundFullyFinalized(activeRoundId) : false),
    [activeRoundId, isRoundFullyFinalized],
  );

  const canModifyRound = Boolean(
    !tripLockedForAttendance && openRoundId && activeRoundId === openRoundId && !roundAlreadyFinalized,
  );

  const roundBusIdFor = React.useCallback(
    (roundId: string | undefined, tripBusId: string | undefined) => {
      if (!roundId || !tripBusId) return undefined;
      return roundBusByKey.get(`${roundId}-${tripBusId}`)?.id;
    },
    [roundBusByKey],
  );

  const getRoundVisualStatus = React.useCallback(
    (roundId: string, index: number): RoundVisualStatus => {
      if (isRoundFullyFinalized(roundId)) return "past";
      if (tripLockedForAttendance) return "upcoming";
      if (openRoundId && roundId === openRoundId) return "current";

      const openIndex = openRoundId
        ? tripRoundsSorted.findIndex((r) => r.id === openRoundId)
        : -1;

      if (openIndex >= 0) {
        if (index < openIndex) return "past";
        if (index > openIndex) return "upcoming";
      }

      return "upcoming";
    },
    [isRoundFullyFinalized, openRoundId, tripLockedForAttendance, tripRoundsSorted],
  );

  const tripScopedTripBuses = useMemo(
    () => tripBusesByTrip.get(activeTripId || "") || [],
    [tripBusesByTrip, activeTripId],
  );

  useEffect(() => {
    if (!activeTripId) return;

    if (
      !activeTripBusId ||
      !tripScopedTripBuses.some((t) => t.id === activeTripBusId)
    ) {
      setActiveTripBusId(tripScopedTripBuses[0]?.id);
    }

    if (!activeRoundId || !tripScopedRound.some((r) => r.id === activeRoundId)) {
      setActiveRoundId(tripScopedRound[0]?.id);
    }
  }, [activeTripId, tripScopedTripBuses, tripScopedRound, activeTripBusId, activeRoundId]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!activeTripId && !activeTripBusId && !activeRoundId) return;
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ activeTripId, activeTripBusId, activeRoundId }),
    );
  }, [activeTripId, activeTripBusId, activeRoundId]);

  useEffect(() => {
    let client: import("mqtt").MqttClient | null = null;
    let canceled = false;

    const applyRealtimeUpdate = (incoming: TransactionItem) => {
      // Update cache optimistically
      queryClient.setQueryData<PaginatedResponse<TransactionItem>>(
        ["transactions"],
        (prev) => {
          if (!prev?.data) return prev;

          const next = Array.isArray(prev.data) ? [...prev.data] : [];
          const idx = next.findIndex((item) => item.id === incoming.id);

          if (idx >= 0) {
            // Update existing transaction
            next[idx] = { ...next[idx], ...incoming };
          } else {
            // Add new transaction
            next.unshift(incoming);
          }

          return { ...prev, data: next };
        },
      );

      // ALWAYS invalidate to trigger re-render across all dependent queries
      queryClient.invalidateQueries({
        queryKey: ["transactions"],
        refetchType: "none", // Don't refetch, just notify subscribers
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
          const idx = list.findIndex((t) => String(t.passenger) === String(incoming.passenger));

          if (incoming.deleted) {
            if (idx >= 0) list.splice(idx, 1);
            return list;
          }

          const base: PassengerTransfer = {
            id: String(incoming.id ?? list[idx]?.id ?? incoming.passenger),
            passenger: String(incoming.passenger),
            from_trip_bus: incoming.from_trip_bus ? String(incoming.from_trip_bus) : null,
            to_trip_bus: incoming.to_trip_bus ? String(incoming.to_trip_bus) : list[idx]?.to_trip_bus || "",
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
        const mqtt = (mqttModule as unknown as { default?: typeof import("mqtt"); connect: typeof import("mqtt")["connect"] }).default ||
          (mqttModule as unknown as { connect: typeof import("mqtt")["connect"] });
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
            const candidate = (parsed && (parsed.transaction || parsed.data)) || parsed;

            if (_topic.startsWith("round-finalize")) {
              if (
                candidate &&
                typeof candidate === "object" &&
                "round_bus" in candidate &&
                "trip" in candidate
              ) {
                applyFinalizeUpdate(candidate as { round_bus: string; trip: string; finalized_at?: string | null });
                return;
              }
            }

            if (_topic.startsWith("passenger-transfer")) {
              if (candidate && typeof candidate === "object") {
                applyTransferUpdate(candidate as {
                  passenger: string;
                  to_trip_bus?: string | null;
                  from_trip_bus?: string | null;
                  trip?: string;
                  id?: string;
                  deleted?: boolean;
                });
                return;
              }
            }

            if (
              candidate &&
              typeof candidate === "object" &&
              "id" in candidate &&
              "passenger" in candidate &&
              "round_bus" in candidate
            ) {
              console.log("✓ Received transaction update:", (candidate as { id: string }).id);
              // Apply the latest transaction locally so the UI updates instantly.
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
    onError: () => message.error("Điểm danh thất bại"),
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
    onError: () => message.error("Điểm danh xuống thất bại"),
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
    onSuccess: async (_data, variables) => {
      void variables;
      await queryClient.invalidateQueries({
        queryKey: ["passenger-transfers", activeTripId],
      });
    },
    onError: () => message.error("Lưu chuyển xe thất bại"),
  });

  const deleteTransferMutation = useMutation({
    mutationFn: async (transferId: string) => deletePassengerTransfer(transferId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["passenger-transfers", activeTripId],
      });
    },
    onError: () => message.error("Huỷ chuyển xe thất bại"),
  });

  const switchBusMutation = useMutation({
    mutationFn: async ({
      passengerId,
      fromTxn,
      targetRoundBusId,
      targetTripBusId: _targetTripBusId,
    }: {
      passengerId: string;
      fromTxn?: TransactionItem;
      targetRoundBusId: string;
      targetTripBusId?: string;
    }) => {
      const now = new Date().toISOString();
      void _targetTripBusId; // keep lint happy for unused value while retaining type for variables
      if (fromTxn && !fromTxn.check_out) {
        await updateTransaction(fromTxn.id, {
          passenger: fromTxn.passenger,
          round_bus: fromTxn.round_bus,
          check_in: fromTxn.check_in,
          check_out: now,
        });
      }

      return createTransaction({
        passenger: passengerId,
        round_bus: targetRoundBusId,
        check_in: now,
        check_out: null,
      });
    },
    onSuccess: async (_data, variables) => {
      message.success("Đã chuyển xe và điểm danh");
      const targetBusId = variables.targetTripBusId;
      if (targetBusId) {
        const existingTransfer = transferByPassenger.get(variables.passengerId);
        const currentAssignment = existingTransfer?.to_trip_bus || passengerHomeBusMap.get(variables.passengerId) || null;

        if (existingTransfer && targetBusId === passengerHomeBusMap.get(variables.passengerId)) {
          await deleteTransferMutation.mutateAsync(existingTransfer.id);
        } else {
          await upsertTransferMutation.mutateAsync({
            passengerId: variables.passengerId,
            toTripBusId: targetBusId,
            fromTripBusId: currentAssignment,
          });
        }
      }
      await queryClient.invalidateQueries({ queryKey: ["transactions"] });
    },
    onError: () => message.error("Chuyển xe thất bại"),
  });

  const finalizeRoundBusMutation = useMutation({
    mutationFn: async (roundBusId: string) => finalizeRoundBus(roundBusId, true),
    onSuccess: async () => {
      message.success("Đã chốt điểm danh. Round này sẽ khoá chỉnh sửa.");
      await queryClient.invalidateQueries({ queryKey: ["round-buses"] });
    },
    onError: () => message.error("Chốt điểm danh thất bại"),
  });

  const transactionsLoading =
    loadingTrips ||
    loadingPassengers ||
    loadingRounds ||
    loadingRoundBuses ||
    loadingTripBuses ||
    loadingBuses ||
    loadingTransactions ||
    loadingTransfers;

  const refreshing =
    fetchingTrips ||
    fetchingPassengers ||
    fetchingRounds ||
    fetchingRoundBuses ||
    fetchingTripBuses ||
    fetchingBuses ||
    fetchingTransactions ||
    fetchingTransfers;

  const tripPassengers = useMemo(() => {
    const term = search.trim().toLowerCase();
    const list = passengers.filter((p) => p.trip === activeTripId);
    if (!term) return list;
    return list.filter(
      (p) =>
        p.name.toLowerCase().includes(term) ||
        (p.phone || "").toLowerCase().includes(term) ||
        (p.note || "").toLowerCase().includes(term),
    );
  }, [passengers, activeTripId, search]);

  const rowsForBus = React.useCallback((tripBusId: string): PassengerRow[] => {
    const transferMap = passengerTransferMap;

    return tripPassengers
      .filter((p) => {
          const overrideBus = transferMap[p.id];
        const homeBusId = overrideBus ?? p.original_bus ?? null;
        if (homeBusId) return homeBusId === tripBusId || p.original_bus === tripBusId;
        return !p.original_bus || p.original_bus === tripBusId;
      })
      .map((p) => {
        const overrideBus = transferMap[p.id];
        const homeBusId = overrideBus ?? p.original_bus ?? null;
        const txn = transactionByPassenger.get(p.id);
        const txnBusId = txn ? roundBusToTripBus.get(txn.round_bus) : undefined;
        let status: RowStatus = "pending";
        if (txn) {
          if (txn.check_out) {
            status = "checkedOut";
          } else if (txnBusId === tripBusId) {
            status = "checkedInHere";
          } else if (txnBusId) {
            status = "checkedInElsewhere";
          }
        }

        const transferredAway =
          Boolean(p.original_bus) &&
          p.original_bus === tripBusId &&
          !!overrideBus &&
          overrideBus !== tripBusId;

        const transferredHere =
          !!overrideBus &&
          overrideBus === tripBusId &&
          !!p.original_bus &&
          p.original_bus !== tripBusId;

        const isOwnedByBus =
          (homeBusId ? homeBusId === tripBusId : !p.original_bus || p.original_bus === tripBusId) &&
          !transferredAway;

        return {
          key: p.id,
          passenger: p,
          transaction: txn,
          txnBusId,
          status,
          assignedBusId: p.original_bus,
          homeBusId,
          isOwnedByBus,
          transferredAway,
          transferredHere,
          transferTargetLabel: overrideBus ? tripBusLabelMap.get(overrideBus) : undefined,
        };
        });
      }, [passengerTransferMap, roundBusToTripBus, transactionByPassenger, tripBusLabelMap, tripPassengers]);

  const statusTag = (row: PassengerRow) => {
    const tags: React.ReactNode[] = [];

    if (row.status === "checkedInHere") tags.push(<Tag color="green">Đã lên xe</Tag>);
    else if (row.status === "checkedInElsewhere")
      tags.push(
        <Tag color="blue">
          Đang ở {tripBusLabelMap.get(row.txnBusId || "") || "xe khác"}
        </Tag>,
      );
    else if (row.status === "checkedOut") tags.push(<Tag color="orange">Đã xuống</Tag>);
    else tags.push(<Tag>Chưa điểm danh</Tag>);

    if (row.transferredAway && row.transferTargetLabel) {
      tags.push(
        <Tag color="purple">Đã chuyển sang {row.transferTargetLabel}</Tag>,
      );
    }

    if (row.transferredHere && row.passenger.original_bus) {
      tags.push(
        <Tag color="magenta">
          Nhận từ {tripBusLabelMap.get(row.passenger.original_bus) || "xe khác"}
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
      message.warning("Chưa cấu hình round-bus cho vòng này");
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
      targetTripBusId: roundBusToTripBus.get(targetRoundBusId),
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
    const fromTxn = transactionByPassenger.get(passengerId);
    handleSwitchBus(passengerId, fromTxn, targetRoundBusId);
  };

  const handleCrossCheckUndo = (passengerId: string, sourceTripBusId: string) => {
    if (tripLockedForAttendance) {
      message.warning("Chuyến đi chưa bắt đầu. Chỉ xem điểm danh.");
      return;
    }
    if (!activeRoundId) return;
    const sourceRoundBusId = roundBusIdFor(activeRoundId, sourceTripBusId);
    if (!sourceRoundBusId) {
      message.warning("Chưa cấu hình round-bus cho xe nguồn");
      return;
    }
    if (!canOperateRoundBus(sourceRoundBusId)) {
      message.warning("Bạn không được phép thao tác với xe này");
      return;
    }
    const fromTxn = transactionByPassenger.get(passengerId);
    handleSwitchBus(passengerId, fromTxn, sourceRoundBusId);
  };

  const loading = transactionsLoading || refreshing;
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

  const mutationBusy =
    checkInMutation.isPending ||
    checkOutMutation.isPending ||
    switchBusMutation.isPending ||
    upsertTransferMutation.isPending ||
    deleteTransferMutation.isPending ||
    finalizeRoundBusMutation.isPending ||
    refreshing ||
    transactionsLoading;

  const busTabs = tripScopedTripBuses
    .map((tb) => {
      const label = tripBusLabelMap.get(tb.id) || "Bus";
      const roundBusId = activeRoundId
        ? roundBusByKey.get(`${activeRoundId}-${tb.id}`)?.id
        : undefined;

      // Hide tabs that have no round-bus configured for the active round
      if (!roundBusId) return null;

      const rows = rowsForBus(tb.id);
      const presentCount = rows.filter((r) => r.status === "checkedInHere").length;
      const othersCount = rows.length - presentCount;
      const busReadOnly = tripLockedForAttendance || !canOperateTripBus(tb.id);
      const busFinalized = Boolean(finalizedRoundBuses[activeTripId || ""]?.[roundBusId]);

      const blockReason = busReadOnly
        ? tripLockedForAttendance
          ? "Chuyến đi chưa bắt đầu"
          : "Chỉ xem"
        : busFinalized
          ? "Đã chốt điểm danh"
          : roundLockedBySequence
            ? "Chưa hoàn tất round trước"
            : !openRoundId
              ? "Tất cả round đã hoàn thành"
              : undefined;

      const canModifyAttendance = Boolean(!busReadOnly && roundBusId && canModifyRound && !busFinalized);

      return {
        key: tb.id,
        label: (
          <Space size={4}>
            <span>{label}</span>
            <Badge
              count={presentCount}
              size="small"
              style={{ backgroundColor: "#16a34a" }}
              title="Đang trên xe"
            />
            <Badge
              count={othersCount}
              size="small"
              style={{ backgroundColor: "#3b82f6" }}
              title="Chưa lên / đã xuống / đang ở xe khác"
            />
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
                : setCrossCheck({ busId: tb.id, sourceBusId: undefined, passengerId: undefined })
            }
            onFinalize={handleFinalize}
            onCheckIn={handleCheckIn}
            onCheckOut={handleCheckOut}
            onSwitchBus={handleSwitchBus}
            busy={mutationBusy}
          />
        ),
      };
    })
    .filter((item): item is NonNullable<typeof item> => Boolean(item));

  return (
    <div className="w-full bg-[#f4f7fb] min-h-screen py-6">
      <div className="bg-white shadow-sm rounded-2xl p-6 border border-slate-100">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <p className="text-sm uppercase tracking-[0.25em] text-sky-700 font-semibold">
              Transaction
            </p>
            <Title level={2} style={{ margin: 0 }}>
              Điểm danh hành khách nhanh
            </Title>
            <Text type="secondary">
              Chọn trip, duyệt round theo checkpoint, chuyển tab xe và điểm danh không cần mở modal.
            </Text>
            {tripLockedForAttendance && (
              <div className="mt-2">
                <Tag color="default">Trip đang ở trạng thái planned – chỉ xem sơ đồ round, chưa thể điểm danh.</Tag>
              </div>
            )}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 w-full md:w-auto">
            <Select
              placeholder="Chọn trip"
              value={activeTripId}
              onChange={(val) => setActiveTripId(val)}
              options={trips.map((t) => ({ value: t.id, label: t.name }))}
              loading={loadingTrips}
              showSearch
              optionFilterProp="label"
            />
            <Input
              allowClear
              placeholder="Tìm tên / điện thoại / ghi chú"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        <RoundTimeline items={timelineItems} onSelect={setActiveRoundId} />

        <Card className="mt-6" styles={{ body: { padding: 0 } }}>
          <div className="p-4">
            {openRoundLabel && (
              <div className="mb-3">
                <Text type={roundLockedBySequence ? "warning" : "secondary"}>
                  Round đang mở: {openRoundLabel}. Hoàn tất round này để mở round tiếp theo.
                </Text>
              </div>
            )}
            {busTabs.length === 0 ? (
              <Empty
                description={
                  tripScopedTripBuses.length === 0
                    ? "Chưa có xe cho trip này"
                    : "Chưa cấu hình round-bus cho round này"
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
        roundLockedBySequence={roundLockedBySequence}
        roundAlreadyFinalized={roundAlreadyFinalized}
        activeRoundId={activeRoundId}
        roundBusIdFor={roundBusIdFor}
        passengerTransfers={passengerTransfersByTrip}
        activeTripId={activeTripId}
        statusTag={statusTag}
        onPerform={handleCrossCheckPerform}
        onUndo={handleCrossCheckUndo}
      />
    </div>
  );
}
