import React, { useCallback, useMemo, useState } from "react";

import { EditOutlined, DeleteOutlined, FileExcelOutlined } from "@ant-design/icons";
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
  Tooltip,
  Typography,
  message,
  Space,
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
  exportRounds,
  type BusItem,
  type Passenger,
  type RoundItem,
  type RoundPayload,
  type TripBus,
  type Trip,
} from "../../api/trips";
import { useGetAccountInfo } from "../../hooks/useAuth";
import { useDebounce } from "../../hooks/useDebounce";
import { canManageCatalog } from "../../utils/helper";

import RoundFormModal, {
  type RoundFormValues,
} from "./components/RoundFormModal";

import type { IUser } from "../../utils/types";

const { Title, Text } = Typography;

const statusMeta: Record<
  RoundItem["status"],
  { label: string; color: string }
> = {
  planned: { label: "Chưa xuất phát", color: "blue" },
  doing: { label: "Đang đi", color: "orange" },
  done: { label: "Đã hoàn thành", color: "green" },
};

export default function RoundManagement() {
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 300);
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
    () =>
      Array.isArray(tripBusesResponse?.data) ? tripBusesResponse.data : [],
    [tripBusesResponse],
  );

  const buses = useMemo(
    () => (Array.isArray(busesResponse?.data) ? busesResponse.data : []),
    [busesResponse],
  );

  const passengers = useMemo(
    () =>
      Array.isArray(passengersResponse?.data) ? passengersResponse.data : [],
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
    passengers.forEach((p) => {
      const tripId = (p as unknown as { trip?: string }).trip;
      if (!tripId) return;
      const list = grouped.get(tripId) ?? [];
      list.push(p);
      grouped.set(tripId, list);
    });
    return grouped;
  }, [passengers]);

  const filteredRounds = useMemo(() => {
    const term = debouncedSearch.trim().toLowerCase();
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
  }, [rounds, tripFilter, statusFilter, debouncedSearch]);

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

  const openEdit = useCallback(
    (round: RoundItem) => {
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
    },
    [canManage, form],
  );

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

  const columns = useMemo(() => {
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
          <Space>
            <Tooltip title="Sửa">
              <Button
                type="text"
                icon={<EditOutlined />}
                onClick={() => openEdit(record)}
                style={{ color: "#2563eb" }}
              />
            </Tooltip>
            <Popconfirm
              title="Xóa chặng này?"
              description="Thao tác này không thể hoàn tác."
              onConfirm={() => deleteRoundMutate(record.id)}
              okText="Xóa"
              cancelText="Hủy"
            >
              <Tooltip title="Xóa">
                <Button
                  type="text"
                  danger
                  icon={<DeleteOutlined />}
                  loading={deleteStatus === "pending"}
                />
              </Tooltip>
            </Popconfirm>
          </Space>
        ),
      },
    ];
  }, [canManage, deleteRoundMutate, deleteStatus, openEdit, tripMap]);

  return (
    <div className="w-full bg-[#f4f7fb] h-full py-6">
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
              <div className="flex flex-wrap items-center gap-3">
                <Button
                  icon={<FileExcelOutlined />}
                  onClick={async () => {
                    if (tripFilter === "all") {
                      message.warning("Vui lòng chọn một trip cụ thể để export");
                      return;
                    }
                    try {
                      const blob = await exportRounds(tripFilter);
                      const url = window.URL.createObjectURL(blob);
                      const a = document.createElement("a");
                      a.href = url;
                      a.download = `rounds_${tripFilter}.xlsx`;
                      a.click();
                      window.URL.revokeObjectURL(url);
                    } catch {
                      message.error("Lỗi khi export");
                    }
                  }}
                  className="text-emerald-600 border-emerald-200 hover:border-emerald-500 hover:text-emerald-700 hover:bg-emerald-50 shadow-sm"
                >
                  Export
                </Button>
                <Button type="primary" onClick={openCreate} className="bg-sky-600 hover:bg-sky-700 shadow-sm px-5">
                  + Tạo mới
                </Button>
              </div>
            )}
          </div>
        </div>

        <Card className="mt-6" styles={{ body: { padding: 0 } }}>
          <Table
            size="small"
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
        tripFilter={tripFilter}
      />
    </div>
  );
}
