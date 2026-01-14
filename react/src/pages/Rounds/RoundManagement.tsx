import React, { useCallback, useMemo, useState } from "react";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Button,
  Card,
  Empty,
  Form,
  Input,
  Popconfirm,
  Select,
  Table,
  Tag,
  Typography,
  message,
} from "antd";
import dayjs from "dayjs";

import {
  createRound,
  deleteRound,
  getBuses,
  getPassengers,
  getRounds,
  getTripBuses,
  getTrips,
  updateRound,
  type BusItem,
  type Passenger,
  type RoundItem,
  type RoundPayload,
  type TripBus,
  type Trip,
} from "../../api/trips";
import { useGetAccountInfo } from "../../hooks/useAuth";
import { canManageCatalog } from "../../utils/helper";

import RoundFormModal, { type RoundFormValues } from "./components/RoundFormModal";

import type { IUser } from "../../utils/types";


const { Title, Text } = Typography;

const statusMeta: Record<
  RoundItem["status"],
  { label: string; color: string }
> = {
  planned: { label: "Planned", color: "blue" },
  doing: { label: "Doing", color: "orange" },
  done: { label: "Done", color: "green" },
};

export default function RoundManagement() {
  const [search, setSearch] = useState("");
  const [tripFilter, setTripFilter] = useState<string | "all">("all");
  const [statusFilter, setStatusFilter] = useState<RoundItem["status"] | "all">(
    "all",
  );
  const [showCreate, setShowCreate] = useState(false);
  const [editingRound, setEditingRound] = useState<RoundItem | null>(null);
  const [form] = Form.useForm<RoundFormValues>();
  const queryClient = useQueryClient();
  const { data: accountInfo } = useGetAccountInfo();
  const currentUser = accountInfo as IUser | undefined;
  const canManage = canManageCatalog(currentUser);

  const { data: tripsResponse } = useQuery({
    queryKey: ["trips"],
    queryFn: () => getTrips({ page: 1, limit: 1000 }),
  });
  const { data: tripBusesResponse } = useQuery({
    queryKey: ["trip-buses", "for-rounds"],
    queryFn: () => getTripBuses({ page: 1, limit: 1000 }),
  });
  const { data: busesResponse } = useQuery({
    queryKey: ["buses", "for-rounds"],
    queryFn: () => getBuses({ page: 1, limit: 1000 }),
  });
  const { data: passengersResponse } = useQuery({
    queryKey: ["passengers", "for-rounds"],
    queryFn: () => getPassengers({ page: 1, limit: 1000 }),
  });
  const { data: roundsResponse, isLoading } = useQuery({
    queryKey: ["rounds"],
    queryFn: () => getRounds({ page: 1, limit: 1000 }),
  });

  const trips = useMemo(
    () => (Array.isArray(tripsResponse?.data) ? tripsResponse.data : []),
    [tripsResponse],
  );

  const rounds = useMemo(
    () => (Array.isArray(roundsResponse?.data) ? roundsResponse.data : []),
    [roundsResponse],
  );

  const tripBuses = useMemo(
    () => (Array.isArray(tripBusesResponse?.data) ? tripBusesResponse.data : []),
    [tripBusesResponse],
  );

  const buses = useMemo(
    () => (Array.isArray(busesResponse?.data) ? busesResponse.data : []),
    [busesResponse],
  );

  const passengers = useMemo(
    () => (Array.isArray(passengersResponse?.data) ? passengersResponse.data : []),
    [passengersResponse],
  );

  const tripMap = useMemo(
    () =>
      new Map(
        (Array.isArray(trips) ? trips : []).map((t: Trip) => [t.id, t.name]),
      ),
    [trips],
  );

  const tripDefaultBusMap = useMemo(() => {
    const grouped = new Map<string, Array<string | number>>();
    tripBuses.forEach((tb: TripBus) => {
      const list = grouped.get(tb.trip) ?? [];
      list.push(tb.bus);
      grouped.set(tb.trip, list);
    });
    return grouped;
  }, [tripBuses]);

  const busOptions = useMemo(
    () =>
      (Array.isArray(buses) ? buses : []).map((b: BusItem) => ({
        value: b.id,
        label: b.registration_number || b.bus_code || `Bus ${b.id}`,
      })),
    [buses],
  );

  const tripPassengersMap = useMemo(() => {
    const grouped = new Map<string, Passenger[]>();
    passengers.forEach((p: Passenger) => {
      const list = grouped.get(p.trip) ?? [];
      list.push(p);
      grouped.set(p.trip, list);
    });
    return grouped;
  }, [passengers]);

  const filteredRounds = useMemo(() => {
    const term = search.trim().toLowerCase();
    return (Array.isArray(rounds) ? rounds : []).filter((round) => {
      const matchTrip = tripFilter === "all" ? true : round.trip === tripFilter;
      const matchStatus =
        statusFilter === "all" ? true : round.status === statusFilter;
      const matchTerm = term
        ? round.name.toLowerCase().includes(term) ||
          round.location.toLowerCase().includes(term)
        : true;
      return matchTrip && matchStatus && matchTerm;
    });
  }, [rounds, tripFilter, statusFilter, search]);

  const createMutation = useMutation({
    mutationFn: (payload: RoundPayload) => createRound(payload),
    onSuccess: async () => {
      message.success("Tạo round thành công");
      setShowCreate(false);
      form.resetFields();
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["rounds"] }),
        queryClient.invalidateQueries({ queryKey: ["round-buses"] }),
      ]);
    },
    onError: () => message.error("Tạo round thất bại"),
  });

  const updateMutation = useMutation({
    mutationFn: (data: { id: string; payload: RoundPayload }) =>
      updateRound(data.id, data.payload),
    onSuccess: async () => {
      message.success("Cập nhật round thành công");
      setEditingRound(null);
      form.resetFields();
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["rounds"] }),
        queryClient.invalidateQueries({ queryKey: ["round-buses"] }),
      ]);
    },
    onError: () => message.error("Cập nhật round thất bại"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteRound(id),
    onSuccess: async () => {
      message.success("Xóa round thành công");
      await queryClient.invalidateQueries({ queryKey: ["rounds"] });
    },
    onError: () => message.error("Xóa round thất bại"),
  });

  const { mutate: deleteRoundMutate, status: deleteStatus } = deleteMutation;

  const openCreate = () => {
    if (!canManage) {
      message.warning("Bạn không có quyền chỉnh sửa round");
      return;
    }
    setEditingRound(null);
    form.resetFields();
    setShowCreate(true);
  };

  const openEdit = useCallback((round: RoundItem) => {
    if (!canManage) {
      message.warning("Bạn không có quyền chỉnh sửa round");
      return;
    }
    setEditingRound(round);
    form.setFieldsValue({
      trip: round.trip,
      name: round.name,
      location: round.location,
      sequence: round.sequence,
      estimate_time: dayjs(round.estimate_time),
      actual_time: round.actual_time ? dayjs(round.actual_time) : null,
      status: round.status,
      bus_ids: round.bus_ids,
    });
    setShowCreate(true);
  }, [canManage, form]);

  const handleSubmit = () => {
    form
      .validateFields()
      .then((values) => {
        const payload: RoundPayload = {
          trip: values.trip,
          name: values.name,
          location: values.location,
          sequence: Number(values.sequence),
          estimate_time: values.estimate_time.format("YYYY-MM-DDTHH:mm:ss"),
          actual_time: values.actual_time
            ? values.actual_time.format("YYYY-MM-DDTHH:mm:ss")
            : null,
          status: values.status,
          bus_ids:
            values.bus_ids && values.bus_ids.length
              ? values.bus_ids.map((id) => Number(id))
              : tripDefaultBusMap.get(values.trip) || [],
        };
        if (editingRound) {
          updateMutation.mutate({ id: editingRound.id, payload });
        } else {
          createMutation.mutate(payload);
        }
        handleCancel();
      })
      .catch(() => undefined);
  };

  const handleCancel = () => {
    setShowCreate(false);
    setEditingRound(null);
  };

  const columns = useMemo(
    () => {
      const base = [
        {
          title: "Trip",
          dataIndex: "trip",
          render: (val: string) => tripMap.get(val) || "—",
        },
        {
          title: "Tên",
          dataIndex: "name",
        },
        {
          title: "Địa điểm",
          dataIndex: "location",
        },
        {
          title: "Thứ tự",
          dataIndex: "sequence",
        },
        {
          title: "Ước tính",
          dataIndex: "estimate_time",
          render: (val: string) => dayjs(val).format("DD/MM/YYYY HH:mm"),
        },
        {
          title: "Thực tế",
          dataIndex: "actual_time",
          render: (val: string | null) =>
            val ? dayjs(val).format("DD/MM/YYYY HH:mm") : "—",
        },
        {
          title: "Trạng thái",
          dataIndex: "status",
          render: (val: RoundItem["status"]) => {
            const meta = statusMeta[val];
            return <Tag color={meta.color}>{meta.label}</Tag>;
          },
        },
      ];

      if (!canManage) return base;

      return [
        ...base,
        {
          title: "Thao tác",
          dataIndex: "actions",
          render: (_: unknown, record: RoundItem) => (
            <div className="flex gap-2">
              <Button type="link" onClick={() => openEdit(record)}>
                Sửa
              </Button>
              <Popconfirm
                title="Xóa round?"
                onConfirm={() => deleteRoundMutate(record.id)}
                okText="Xóa"
                cancelText="Hủy"
              >
                <Button
                  type="link"
                  danger
                  loading={deleteStatus === "pending"}
                >
                  Xóa
                </Button>
              </Popconfirm>
            </div>
          ),
        },
      ];
    },
    [canManage, deleteRoundMutate, deleteStatus, openEdit, tripMap],
  );

  return (
    <div className="w-full bg-[#f4f7fb] min-h-screen py-6">
      <div className="bg-white shadow-sm rounded-2xl p-6 border border-slate-100">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <p className="text-sm uppercase tracking-[0.25em] text-sky-700 font-semibold">
              Round Management
            </p>
            <Title level={2} style={{ margin: 0 }}>
              Quản lý Round
            </Title>
            <Text type="secondary">
              Quản lý các round thuộc trip và trạng thái thực hiện.
            </Text>
          </div>
          <div className="flex flex-col md:flex-row gap-2 md:items-center">
            <Input
              allowClear
              placeholder="Tìm theo tên hoặc địa điểm"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full md:w-64"
            />
            <Select
              value={tripFilter}
              onChange={(val) => setTripFilter(val)}
              className="w-full md:w-48"
              options={[
                { value: "all", label: "Tất cả trip" },
                ...(Array.isArray(trips) ? trips : []).map((t: Trip) => ({
                  value: t.id,
                  label: t.name,
                })),
              ]}
            />
            <Select
              value={statusFilter}
              onChange={(val) => setStatusFilter(val)}
              className="w-full md:w-48"
              options={[
                { value: "all", label: "Tất cả trạng thái" },
                ...Object.entries(statusMeta).map(([value, meta]) => ({
                  value,
                  label: meta.label,
                })),
              ]}
            />
            {canManage && (
              <Button type="primary" onClick={openCreate}>
                + New Round
              </Button>
            )}
          </div>
        </div>

        <Card className="mt-6" styles={{ body: { padding: 0 } }}>
          <Table
            rowKey="id"
            dataSource={filteredRounds}
            loading={isLoading}
            pagination={{ pageSize: 10, showSizeChanger: false }}
            scroll={{ x: true }}
            columns={columns}
            locale={{
              emptyText: isLoading ? (
                <span>Đang tải...</span>
              ) : (
                <Empty description="Chưa có dữ liệu" />
              ),
            }}
          />
        </Card>
      </div>

      <RoundFormModal
        open={showCreate}
        onCancel={handleCancel}
        onSubmit={handleSubmit}
        confirmLoading={
          createMutation.status === "pending" ||
          updateMutation.status === "pending"
        }
        form={form}
        trips={trips}
        busOptions={busOptions}
        tripDefaultBusMap={tripDefaultBusMap}
        tripPassengersMap={tripPassengersMap}
        editingRound={editingRound}
        statusMeta={statusMeta}
      />
    </div>
  );
}
