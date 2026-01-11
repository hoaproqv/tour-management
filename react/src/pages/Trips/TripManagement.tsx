import React, { useMemo, useState } from "react";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Button,
  Card,
  DatePicker,
  Empty,
  Form,
  Input,
  Modal,
  Select,
  Space,
  Table,
  Tag,
  Typography,
  message,
} from "antd";

import {
  createTrip,
  getBuses,
  getRounds,
  getTripBuses,
  getTrips,
  type BusItem,
  type RoundItem,
  type Trip,
  type TripBus,
  type TripPayload,
} from "../../api/trips";

const { Title, Text } = Typography;

const statusMeta: Record<Trip["status"], { label: string; color: string }> = {
  planned: { label: "Planned", color: "blue" },
  doing: { label: "Doing", color: "orange" },
  done: { label: "Done", color: "green" },
};

interface EnrichedTrip extends Trip {
  busCount: number;
  roundCount: number;
  buses: TripBus[];
  rounds: RoundItem[];
}

export default function TripManagement() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<Trip["status"] | "all">(
    "all",
  );
  const [detail, setDetail] = useState<{
    trip: EnrichedTrip;
    mode: "rounds" | "buses";
  } | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [form] = Form.useForm();
  const queryClient = useQueryClient();

  const { data: tripsResponse, isLoading: loadingTrips } = useQuery({
    queryKey: ["trips"],
    queryFn: () => getTrips({ page: 1, limit: 1000 }),
  });

  const { data: tripBusesResponse, isLoading: loadingTripBuses } = useQuery({
    queryKey: ["trip-buses"],
    queryFn: () => getTripBuses({ page: 1, limit: 1000 }),
  });

  const { data: roundsResponse, isLoading: loadingRounds } = useQuery({
    queryKey: ["rounds"],
    queryFn: () => getRounds({ page: 1, limit: 1000 }),
  });

  const { data: busesResponse } = useQuery({
    queryKey: ["buses", "for-trip"],
    queryFn: () => getBuses({ page: 1, limit: 1000 }),
  });

  const trips = Array.isArray(tripsResponse?.data) ? tripsResponse.data : [];
  const tripBuses = Array.isArray(tripBusesResponse?.data)
    ? tripBusesResponse.data
    : [];
  const rounds = Array.isArray(roundsResponse?.data) ? roundsResponse.data : [];
  const buses = Array.isArray(busesResponse?.data) ? busesResponse.data : [];

  const busMap = useMemo(
    () =>
      new Map(
        buses.map((bus: BusItem) => [
          bus.id,
          bus.registration_number || bus.bus_code || "Bus",
        ]),
      ),
    [buses],
  );

  const enrichedTrips: EnrichedTrip[] = useMemo(() => {
    if (!Array.isArray(trips)) return [];
    return trips.map((trip) => {
      const busesByTrip = tripBuses.filter((tb) => tb.trip === trip.id);
      const roundsByTrip = rounds.filter((r) => r.trip === trip.id);
      return {
        ...trip,
        busCount: busesByTrip.length,
        roundCount: roundsByTrip.length,
        buses: busesByTrip,
        rounds: roundsByTrip,
      };
    });
  }, [trips, tripBuses, rounds]);

  const filteredTrips = useMemo(() => {
    const term = search.trim().toLowerCase();
    return enrichedTrips.filter((trip) => {
      const matchTerm = term
        ? trip.name.toLowerCase().includes(term) ||
          trip.description.toLowerCase().includes(term)
        : true;
      const matchStatus =
        statusFilter === "all" ? true : trip.status === statusFilter;
      return matchTerm && matchStatus;
    });
  }, [enrichedTrips, search, statusFilter]);

  const loading = loadingTrips || loadingTripBuses || loadingRounds;

  const createTripMutation = useMutation({
    mutationFn: (payload: TripPayload) => createTrip(payload),
    onSuccess: async () => {
      message.success("Tạo trip thành công");
      setShowCreate(false);
      form.resetFields();
      await queryClient.invalidateQueries({ queryKey: ["trips"] });
    },
    onError: () => {
      message.error("Tạo trip thất bại");
    },
  });

  const handleCreate = () => {
    form
      .validateFields()
      .then((values) => {
        const payload: TripPayload = {
          name: values.name,
          description: values.description || "",
          status: values.status,
          start_date: values.start_date.format("YYYY-MM-DD"),
          end_date: values.end_date.format("YYYY-MM-DD"),
        };
        createTripMutation.mutate(payload);
      })
      .catch(() => undefined);
  };

  return (
    <div className="w-full bg-[#f4f7fb] min-h-screen py-6">
      <div className="bg-white shadow-sm rounded-2xl p-6 border border-slate-100">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <p className="text-sm uppercase tracking-[0.25em] text-sky-700 font-semibold">
              Trip Management
            </p>
            <Title level={2} style={{ margin: 0 }}>
              Quản lý Trip
            </Title>
            <Text type="secondary">
              Lọc, thống kê và xem các round / bus liên quan cho từng trip.
            </Text>
          </div>
          <div className="flex flex-col md:flex-row gap-2 md:items-center">
            <Input
              allowClear
              placeholder="Tìm theo tên hoặc mô tả"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full md:w-64"
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
            <Button type="primary" onClick={() => setShowCreate(true)}>
              + New Trip
            </Button>
          </div>
        </div>

        <Card className="mt-6" styles={{ body: { padding: 0 } }}>
          <Table
            rowKey="id"
            dataSource={filteredTrips}
            loading={loading}
            pagination={{ pageSize: 8, showSizeChanger: false }}
            scroll={{ x: true }}
            columns={[
              {
                title: "Tên",
                dataIndex: "name",
                render: (_: unknown, record: EnrichedTrip) => (
                  <div>
                    <div className="font-semibold text-slate-900">
                      {record.name}
                    </div>
                    <div className="text-xs text-slate-500 mt-1">
                      {record.start_date} → {record.end_date}
                    </div>
                  </div>
                ),
              },
              {
                title: "Mô tả",
                dataIndex: "description",
                render: (val: string) => (
                  <span className="text-slate-600">{val || "—"}</span>
                ),
              },
              {
                title: "Số xe",
                dataIndex: "busCount",
                render: (_: number, record: EnrichedTrip) => (
                  <Tag color="processing">{record.busCount}</Tag>
                ),
              },
              {
                title: "Số round",
                dataIndex: "roundCount",
                render: (_: number, record: EnrichedTrip) => (
                  <Tag color="geekblue">{record.roundCount}</Tag>
                ),
              },
              {
                title: "Tình trạng",
                dataIndex: "status",
                render: (val: Trip["status"]) => {
                  const meta = statusMeta[val];
                  return <Tag color={meta.color}>{meta.label}</Tag>;
                },
              },
              {
                title: "Thao tác",
                dataIndex: "actions",
                render: (_: unknown, record: EnrichedTrip) => (
                  <Space>
                    <Button
                      type="link"
                      onClick={() =>
                        setDetail({ trip: record, mode: "rounds" })
                      }
                    >
                      Xem Round liên quan
                    </Button>
                    <Button
                      type="link"
                      onClick={() => setDetail({ trip: record, mode: "buses" })}
                    >
                      Xem Bus liên quan
                    </Button>
                  </Space>
                ),
              },
            ]}
            locale={{
              emptyText: loading ? (
                <span>Đang tải...</span>
              ) : (
                <Empty description="Chưa có dữ liệu" />
              ),
            }}
          />
        </Card>
      </div>

      <Modal
        open={!!detail}
        onCancel={() => setDetail(null)}
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

        {detail?.mode === "buses" && (
          <div className="space-y-3">
            {detail.trip.buses.length === 0 && (
              <Empty description="Chưa có bus" />
            )}
            {detail.trip.buses.map((tb) => (
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
                      Tài xế: {tb.driver_name} · {tb.driver_tel}
                    </div>
                  </div>
                  <Text type="secondary">Quản lý: {tb.manager}</Text>
                </div>
              </Card>
            ))}
          </div>
        )}
      </Modal>

      <Modal
        open={showCreate}
        onCancel={() => setShowCreate(false)}
        onOk={handleCreate}
        confirmLoading={createTripMutation.status === "pending"}
        title="Tạo trip mới"
        okText="Tạo"
        cancelText="Hủy"
        destroyOnHidden
      >
        <Form
          layout="vertical"
          form={form}
          initialValues={{ status: "planned" }}
        >
          <Form.Item
            label="Tên trip"
            name="name"
            rules={[{ required: true, message: "Nhập tên trip" }]}
          >
            <Input placeholder="Ví dụ: Bách Khoa – Sân bay Nội Bài" />
          </Form.Item>
          <Form.Item label="Mô tả" name="description">
            <Input.TextArea rows={3} placeholder="Mô tả ngắn" />
          </Form.Item>
          <Form.Item
            label="Trạng thái"
            name="status"
            rules={[{ required: true }]}
          >
            <Select
              options={Object.entries(statusMeta).map(([value, meta]) => ({
                value,
                label: meta.label,
              }))}
            />
          </Form.Item>
          <Space size="middle" style={{ width: "100%" }}>
            <Form.Item
              label="Ngày bắt đầu"
              name="start_date"
              rules={[{ required: true, message: "Chọn ngày bắt đầu" }]}
              style={{ flex: 1 }}
            >
              <DatePicker className="w-full" format="YYYY-MM-DD" />
            </Form.Item>
            <Form.Item
              label="Ngày kết thúc"
              name="end_date"
              rules={[{ required: true, message: "Chọn ngày kết thúc" }]}
              style={{ flex: 1 }}
            >
              <DatePicker className="w-full" format="YYYY-MM-DD" />
            </Form.Item>
          </Space>
        </Form>
      </Modal>
    </div>
  );
}
