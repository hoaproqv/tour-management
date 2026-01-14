import React, { useEffect, useMemo, useState } from "react";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Badge,
  Button,
  Card,
  Empty,
  Input,
  Select,
  Space,
  Table,
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
  getRoundBuses,
  getRounds,
  getTransactions,
  getTripBuses,
  getTrips,
  updateTransaction,
  type BusItem,
  type PaginatedResponse,
  type Passenger,
  type RoundBusItem,
  type RoundItem,
  type TransactionItem,
  type Trip,
  type TripBus,
} from "../../api/trips";

const { Title, Text } = Typography;
const STORAGE_KEY = "transaction-attendance-filters";

type RowStatus = "pending" | "checkedInHere" | "checkedInElsewhere" | "checkedOut";

interface PassengerRow {
  key: string;
  passenger: Passenger;
  transaction?: TransactionItem;
  txnBusId?: string;
  status: RowStatus;
  assignedBusId: string | null;
}

export default function TransactionManagement() {
  const queryClient = useQueryClient();

  const [activeTripId, setActiveTripId] = useState<string>();
  const [activeTripBusId, setActiveTripBusId] = useState<string>();
  const [activeRoundId, setActiveRoundId] = useState<string>();
  const [search, setSearch] = useState("");

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

  const trips = useMemo(
    () => (Array.isArray(tripsResponse?.data) ? tripsResponse.data : []),
    [tripsResponse],
  );

  const passengers = useMemo(
    () => (Array.isArray(passengersResponse?.data) ? passengersResponse.data : []),
    [passengersResponse],
  );

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

  const buses = useMemo(
    () => (Array.isArray(busesResponse?.data) ? busesResponse.data : []),
    [busesResponse],
  );

  const transactions = useMemo(
    () => (Array.isArray(transactionsResponse?.data) ? transactionsResponse.data : []),
    [transactionsResponse],
  );

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
        refetchType: "none" // Don't refetch, just notify subscribers
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
          console.log("✓ MQTT connected and subscribed to:", topic);
        });
        client.on("message", (_topic, payload) => {
          try {
            const raw = payload?.toString?.() ?? "";
            const parsed = raw ? JSON.parse(raw) : null;
            const candidate =
              (parsed && (parsed.transaction || parsed.data)) || parsed;

            if (
              candidate &&
              typeof candidate === "object" &&
              "id" in candidate &&
              "passenger" in candidate &&
              "round_bus" in candidate
            ) {
              console.log("✓ Received transaction update:", candidate.id);
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

  const switchBusMutation = useMutation({
    mutationFn: async ({
      passengerId,
      fromTxn,
      targetRoundBusId,
    }: {
      passengerId: string;
      fromTxn?: TransactionItem;
      targetRoundBusId: string;
    }) => {
      const now = new Date().toISOString();
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
    onSuccess: async () => {
      message.success("Đã chuyển xe và điểm danh");
      await queryClient.invalidateQueries({ queryKey: ["transactions"] });
    },
    onError: () => message.error("Chuyển xe thất bại"),
  });

  const transactionsLoading =
    loadingTrips ||
    loadingPassengers ||
    loadingRounds ||
    loadingRoundBuses ||
    loadingTripBuses ||
    loadingBuses ||
    loadingTransactions;

  const refreshing =
    fetchingTrips ||
    fetchingPassengers ||
    fetchingRounds ||
    fetchingRoundBuses ||
    fetchingTripBuses ||
    fetchingBuses ||
    fetchingTransactions;

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

  const rowsForBus = (tripBusId: string): PassengerRow[] => {
    return tripPassengers
      .filter((p) => p.original_bus === tripBusId || !p.original_bus)
      .map((p) => {
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
        return {
          key: p.id,
          passenger: p,
          transaction: txn,
          txnBusId,
          status,
          assignedBusId: p.original_bus,
        };
      });
  };

  const statusTag = (row: PassengerRow) => {
    if (row.status === "checkedInHere") return <Tag color="green">Đã lên xe</Tag>;
    if (row.status === "checkedInElsewhere")
      return (
        <Tag color="blue">
          Đang ở {tripBusLabelMap.get(row.txnBusId || "") || "xe khác"}
        </Tag>
      );
    if (row.status === "checkedOut") return <Tag color="orange">Đã xuống</Tag>;
    return <Tag>Chưa điểm danh</Tag>;
  };

  const handleCheckIn = (passengerId: string, roundBusId?: string) => {
    if (!roundBusId) {
      message.warning("Chưa cấu hình round-bus cho vòng này");
      return;
    }
    checkInMutation.mutate({ passengerId, roundBusId });
  };

  const handleCheckOut = (txn: TransactionItem | undefined) => {
    if (!txn) return;
    checkOutMutation.mutate(txn);
  };

  const handleSwitchBus = (
    passengerId: string,
    fromTxn: TransactionItem | undefined,
    targetRoundBusId?: string,
  ) => {
    if (!targetRoundBusId) {
      message.warning("Chưa cấu hình round-bus cho vòng này");
      return;
    }

    switchBusMutation.mutate({
      passengerId,
      fromTxn,
      targetRoundBusId,
    });
  };

  const loading = transactionsLoading || refreshing;

  const renderActions = (row: PassengerRow, roundBusId?: string) => {
    const busy =
      checkInMutation.isPending ||
      checkOutMutation.isPending ||
      switchBusMutation.isPending ||
      refreshing ||
      transactionsLoading;

    if (!roundBusId) {
      return <Text type="secondary">Chưa cấu hình round-bus</Text>;
    }

    if (row.status === "checkedInHere") {
      return (
        <Button
          size="small"
          onClick={() => handleCheckOut(row.transaction)}
          loading={busy}
        >
          Điểm danh xuống
        </Button>
      );
    }

    if (row.status === "checkedInElsewhere") {
      return (
        <Space>
          <Button
            size="small"
            onClick={() => handleSwitchBus(row.passenger.id, row.transaction, roundBusId)}
            loading={busy}
          >
            Chuyển sang xe này
          </Button>
        </Space>
      );
    }

    return (
      <Button
        type="primary"
        size="small"
        onClick={() => handleCheckIn(row.passenger.id, roundBusId)}
        loading={busy}
      >
        Điểm danh lên
      </Button>
    );
  };

  const renderBusPane = (tripBusId: string) => {
    const roundBusId = activeRoundId
      ? roundBusByKey.get(`${activeRoundId}-${tripBusId}`)?.id
      : undefined;
    const rows = rowsForBus(tripBusId);
    const present = rows.filter((r) => r.status === "checkedInHere");
    const others = rows.filter((r) => r.status !== "checkedInHere");

    const columns = [
      {
        title: "Hành khách",
        dataIndex: "passenger",
        render: (_: unknown, row: PassengerRow) => (
          <div>
            <div className="font-semibold text-slate-900">{row.passenger.name}</div>
            <div className="text-xs text-slate-500">
              {row.passenger.phone || "—"}
            </div>
            {row.passenger.note ? (
              <div className="text-xs text-slate-500">{row.passenger.note}</div>
            ) : null}
          </div>
        ),
      },
      {
        title: "Trạng thái",
        dataIndex: "status",
        render: (_: unknown, row: PassengerRow) => (
          <Space direction="vertical" size={2}>
            {statusTag(row)}
            {row.transaction ? (
              <Text type="secondary" className="text-xs">
                {row.transaction.check_out
                  ? `Xuống: ${dayjs(row.transaction.check_out).format("HH:mm:ss")}`
                  : `Lên: ${dayjs(row.transaction.check_in).format("HH:mm:ss")}`}
              </Text>
            ) : null}
          </Space>
        ),
      },
      {
        title: "Hành động",
        dataIndex: "actions",
        render: (_: unknown, row: PassengerRow) => renderActions(row, roundBusId),
        width: 180,
      },
    ];

    return (
      <div className="space-y-3">
        <Space size="small" wrap>
          <Tag color="blue">Chưa/đã xuống: {others.length}</Tag>
          <Tag color="green">Đang trên xe: {present.length}</Tag>
        </Space>
        {!roundBusId && (
          <Card size="small" type="inner">
            Chưa có round-bus cho vòng này. Tạo round-bus trước để điểm danh.
          </Card>
        )}
        <div className="grid md:grid-cols-2 gap-3">
          <Card
            title="Đang trên xe"
            size="small"
            styles={{ body: { padding: 0 } }}
          >
            <Table
              size="small"
              rowKey="key"
              dataSource={present}
              columns={columns}
              pagination={false}
              loading={loading}
              locale={{ emptyText: <Empty description="Chưa có ai trên xe" /> }}
            />
          </Card>
          <Card
            title="Chưa điểm danh / đã xuống / đang ở xe khác"
            size="small"
            styles={{ body: { padding: 0 } }}
          >
            <Table
              size="small"
              rowKey="key"
              dataSource={others}
              columns={columns}
              pagination={false}
              loading={loading}
              locale={{
                emptyText: <Empty description="Không có hành khách" />,
              }}
            />
          </Card>
        </div>
      </div>
    );
  };

  const busTabs = tripScopedTripBuses.map((tb) => {
    const label = tripBusLabelMap.get(tb.id) || "Bus";
    const roundBusId = activeRoundId
      ? roundBusByKey.get(`${activeRoundId}-${tb.id}`)?.id
      : undefined;
    const rows = rowsForBus(tb.id);
    const presentCount = rows.filter((r) => r.status === "checkedInHere").length;
    const othersCount = rows.length - presentCount;

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
          {!roundBusId && <Tag color="orange">Chưa có round-bus</Tag>}
        </Space>
      ),
      children: renderBusPane(tb.id),
    };
  });

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
              Chọn trip, round, chuyển tab xe và điểm danh không cần mở modal.
            </Text>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2 w-full md:w-auto">
            <Select
              placeholder="Chọn trip"
              value={activeTripId}
              onChange={(val) => setActiveTripId(val)}
              options={trips.map((t) => ({ value: t.id, label: t.name }))}
              loading={loadingTrips}
              showSearch
              optionFilterProp="label"
            />
            <Select
              placeholder="Chọn round"
              value={activeRoundId}
              onChange={(val) => setActiveRoundId(val)}
              options={tripScopedRound.map((r) => ({
                value: r.id,
                label: `${r.sequence ? `#${r.sequence} ` : ""}${r.name}`,
              }))}
              loading={loadingRounds}
              disabled={!activeTripId}
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

        <Card className="mt-6" styles={{ body: { padding: 0 } }}>
          <div className="p-4">
            {busTabs.length === 0 ? (
              <Empty description="Chưa có xe cho trip này" />
            ) : (
              <Tabs
                items={busTabs}
                activeKey={activeTripBusId || busTabs[0]?.key}
                onChange={(val) => setActiveTripBusId(val)}
              />
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
