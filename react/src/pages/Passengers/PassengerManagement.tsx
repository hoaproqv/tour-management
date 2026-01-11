import React, { useMemo, useState } from "react";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Button,
  Card,
  Empty,
  Form,
  Input,
  InputNumber,
  Modal,
  Popconfirm,
  Select,
  Table,
  Typography,
  message,
} from "antd";
import dayjs from "dayjs";

import {
  createPassenger,
  deletePassenger,
  getBuses,
  getPassengers,
  getTripBuses,
  getTrips,
  type BusItem,
  type Passenger,
  type PassengerPayload,
  type Trip,
  type TripBus,
} from "../../api/trips";

const { Title, Text } = Typography;

export default function PassengerManagement() {
  const [search, setSearch] = useState("");
  const [tripFilter, setTripFilter] = useState<string | "all">("all");
  const [showCreate, setShowCreate] = useState(false);
  const [form] = Form.useForm();
  const queryClient = useQueryClient();

  const { data: tripsResponse } = useQuery({
    queryKey: ["trips"],
    queryFn: () => getTrips({ page: 1, limit: 1000 }),
  });
  const { data: tripBusesResponse } = useQuery({
    queryKey: ["trip-buses"],
    queryFn: () => getTripBuses({ page: 1, limit: 1000 }),
  });
  const { data: busesResponse } = useQuery({
    queryKey: ["buses"],
    queryFn: () => getBuses({ page: 1, limit: 1000 }),
  });
  const { data: passengersResponse, isLoading } = useQuery({
    queryKey: ["passengers"],
    queryFn: () => getPassengers({ page: 1, limit: 1000 }),
  });

  const trips = Array.isArray(tripsResponse?.data) ? tripsResponse.data : [];
  const tripBuses = Array.isArray(tripBusesResponse?.data)
    ? tripBusesResponse.data
    : [];
  const buses = Array.isArray(busesResponse?.data) ? busesResponse.data : [];
  const passengers = Array.isArray(passengersResponse?.data)
    ? passengersResponse.data
    : [];

  const selectedTrip = Form.useWatch("trip", form);

  const tripMap = useMemo(
    () =>
      new Map(
        (Array.isArray(trips) ? trips : []).map((t: Trip) => [t.id, t.name]),
      ),
    [trips],
  );

  const busMap = useMemo(
    () =>
      new Map(
        (Array.isArray(buses) ? buses : []).map((b: BusItem) => [
          b.id,
          b.registration_number || b.bus_code,
        ]),
      ),
    [buses],
  );

  const tripBusMap = useMemo(
    () =>
      new Map(
        (Array.isArray(tripBuses) ? tripBuses : []).map((tb: TripBus) => [
          tb.id,
          {
            ...tb,
            label: busMap.get(tb.bus) || "Bus",
          },
        ]),
      ),
    [tripBuses, busMap],
  );

  const filteredPassengers = useMemo(() => {
    const term = search.trim().toLowerCase();
    return (Array.isArray(passengers) ? passengers : []).filter((p) => {
      const matchTrip = tripFilter === "all" ? true : p.trip === tripFilter;
      const matchTerm = term
        ? p.name.toLowerCase().includes(term) ||
          p.phone.toLowerCase().includes(term) ||
          (p.note || "").toLowerCase().includes(term)
        : true;
      return matchTrip && matchTerm;
    });
  }, [passengers, search, tripFilter]);

  const createMutation = useMutation({
    mutationFn: (payload: PassengerPayload) => createPassenger(payload),
    onSuccess: async () => {
      message.success("Tạo passenger thành công");
      setShowCreate(false);
      form.resetFields();
      await queryClient.invalidateQueries({ queryKey: ["passengers"] });
    },
    onError: () => message.error("Tạo passenger thất bại"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deletePassenger(id),
    onSuccess: async () => {
      message.success("Xóa passenger thành công");
      await queryClient.invalidateQueries({ queryKey: ["passengers"] });
    },
    onError: () => message.error("Xóa passenger thất bại"),
  });

  const handleCreate = () => {
    form
      .validateFields()
      .then((values) => {
        const payload: PassengerPayload = {
          trip: values.trip,
          original_bus: values.original_bus || null,
          name: values.name,
          phone: values.phone || "",
          seat_number: values.seat_number ?? null,
          note: values.note || "",
        };
        createMutation.mutate(payload);
      })
      .catch(() => undefined);
  };

  const columns = [
    {
      title: "Tên",
      dataIndex: "name",
    },
    {
      title: "Điện thoại",
      dataIndex: "phone",
      render: (val: string) => val || "—",
    },
    {
      title: "Trip",
      dataIndex: "trip",
      render: (val: string) => tripMap.get(val) || "—",
    },
    {
      title: "Xe gốc",
      dataIndex: "original_bus",
      render: (val: string | null) =>
        val ? tripBusMap.get(val)?.label || "—" : "—",
    },
    {
      title: "Ghế",
      dataIndex: "seat_number",
      render: (val: number | null) => (val ? val : "—"),
    },
    {
      title: "Ghi chú",
      dataIndex: "note",
      render: (val: string) => val || "—",
    },
    {
      title: "Tạo lúc",
      dataIndex: "created_at",
      render: (val: string) => dayjs(val).format("DD/MM/YYYY HH:mm"),
    },
    {
      title: "Thao tác",
      dataIndex: "actions",
      render: (_: unknown, record: Passenger) => (
        <Popconfirm
          title="Xóa passenger?"
          onConfirm={() => deleteMutation.mutate(record.id)}
          okText="Xóa"
          cancelText="Hủy"
        >
          <Button
            type="link"
            danger
            loading={deleteMutation.status === "pending"}
          >
            Xóa
          </Button>
        </Popconfirm>
      ),
    },
  ];

  const tripBusOptions = useMemo(() => {
    const list = Array.isArray(tripBuses) ? tripBuses : [];
    const filtered = selectedTrip
      ? list.filter((tb) => tb.trip === selectedTrip)
      : list;
    return filtered.map((tb) => ({
      value: tb.id,
      label: tripBusMap.get(tb.id)?.label || "Bus",
    }));
  }, [tripBuses, tripBusMap, selectedTrip]);

  return (
    <div className="w-full bg-[#f4f7fb] min-h-screen py-6">
      <div className="bg-white shadow-sm rounded-2xl p-6 border border-slate-100">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <p className="text-sm uppercase tracking-[0.25em] text-sky-700 font-semibold">
              Passenger Management
            </p>
            <Title level={2} style={{ margin: 0 }}>
              Quản lý Passenger
            </Title>
            <Text type="secondary">
              Danh sách hành khách theo trip và xe gốc.
            </Text>
          </div>
          <div className="flex flex-col md:flex-row gap-2 md:items-center">
            <Input
              allowClear
              placeholder="Tìm theo tên / số điện thoại / ghi chú"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full md:w-80"
            />
            <Select
              value={tripFilter}
              onChange={(val) => setTripFilter(val)}
              className="w-full md:w-56"
              options={[
                { value: "all", label: "Tất cả trip" },
                ...(Array.isArray(trips) ? trips : []).map((t: Trip) => ({
                  value: t.id,
                  label: t.name,
                })),
              ]}
            />
            <Button type="primary" onClick={() => setShowCreate(true)}>
              + New Passenger
            </Button>
          </div>
        </div>

        <Card className="mt-6" styles={{ body: { padding: 0 } }}>
          <Table
            rowKey="id"
            dataSource={filteredPassengers}
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

      <Modal
        open={showCreate}
        onCancel={() => setShowCreate(false)}
        onOk={handleCreate}
        confirmLoading={createMutation.status === "pending"}
        title="Tạo passenger mới"
        okText="Tạo"
        cancelText="Hủy"
        destroyOnHidden
      >
        <Form
          layout="vertical"
          form={form}
          data-ms-editor="false"
          autoComplete="off"
        >
          <Form.Item
            label="Thuộc Trip"
            name="trip"
            rules={[{ required: true, message: "Chọn trip" }]}
          >
            <Select
              placeholder="Chọn trip"
              options={(Array.isArray(trips) ? trips : []).map((t: Trip) => ({
                value: t.id,
                label: t.name,
              }))}
            />
          </Form.Item>
          <Form.Item label="Xe gốc" name="original_bus">
            <Select
              allowClear
              placeholder="Chọn xe gốc"
              options={tripBusOptions}
              loading={!tripBuses}
            />
          </Form.Item>
          <Form.Item
            label="Tên"
            name="name"
            rules={[{ required: true, message: "Nhập tên" }]}
          >
            <Input placeholder="Họ và tên" />
          </Form.Item>
          <Form.Item label="Điện thoại" name="phone">
            <Input placeholder="Số điện thoại" />
          </Form.Item>
          <Form.Item label="Số ghế" name="seat_number">
            <InputNumber min={1} className="w-full" placeholder="Số ghế" />
          </Form.Item>
          <Form.Item label="Ghi chú" name="note">
            <Input.TextArea rows={3} placeholder="Ghi chú" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
