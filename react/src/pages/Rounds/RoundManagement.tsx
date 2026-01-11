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
  getRounds,
  getTrips,
  type RoundItem,
  type RoundPayload,
  type Trip,
} from "../../api/trips";

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
  const [form] = Form.useForm();
  const queryClient = useQueryClient();

  const { data: tripsResponse } = useQuery({
    queryKey: ["trips"],
    queryFn: () => getTrips({ page: 1, limit: 1000 }),
  });
  const { data: roundsResponse, isLoading } = useQuery({
    queryKey: ["rounds"],
    queryFn: () => getRounds({ page: 1, limit: 1000 }),
  });

  const trips = Array.isArray(tripsResponse?.data) ? tripsResponse.data : [];
  const rounds = Array.isArray(roundsResponse?.data) ? roundsResponse.data : [];

  const tripMap = useMemo(
    () =>
      new Map(
        (Array.isArray(trips) ? trips : []).map((t: Trip) => [t.id, t.name]),
      ),
    [trips],
  );

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
      await queryClient.invalidateQueries({ queryKey: ["rounds"] });
    },
    onError: () => message.error("Tạo round thất bại"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteRound(id),
    onSuccess: async () => {
      message.success("Xóa round thành công");
      await queryClient.invalidateQueries({ queryKey: ["rounds"] });
    },
    onError: () => message.error("Xóa round thất bại"),
  });

  const handleCreate = () => {
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
        };
        createMutation.mutate(payload);
      })
      .catch(() => undefined);
  };

  const columns = [
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
    {
      title: "Thao tác",
      dataIndex: "actions",
      render: (_: unknown, record: RoundItem) => (
        <Popconfirm
          title="Xóa round?"
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
            <Button type="primary" onClick={() => setShowCreate(true)}>
              + New Round
            </Button>
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

      <Modal
        open={showCreate}
        onCancel={() => setShowCreate(false)}
        onOk={handleCreate}
        confirmLoading={createMutation.status === "pending"}
        title="Tạo round mới"
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
          <Form.Item
            label="Tên round"
            name="name"
            rules={[{ required: true, message: "Nhập tên round" }]}
          >
            <Input placeholder="Ví dụ: Tập huấn tại Cam Ranh" />
          </Form.Item>
          <Form.Item
            label="Địa điểm"
            name="location"
            rules={[{ required: true, message: "Nhập địa điểm" }]}
          >
            <Input placeholder="Địa điểm" />
          </Form.Item>
          <Form.Item
            label="Thứ tự"
            name="sequence"
            rules={[{ required: true, message: "Nhập thứ tự" }]}
          >
            <Input type="number" min={1} />
          </Form.Item>
          <Form.Item
            label="Thời gian dự kiến"
            name="estimate_time"
            rules={[{ required: true, message: "Chọn thời gian dự kiến" }]}
          >
            <DatePicker showTime className="w-full" format="YYYY-MM-DD HH:mm" />
          </Form.Item>
          <Form.Item label="Thời gian thực tế" name="actual_time">
            <DatePicker showTime className="w-full" format="YYYY-MM-DD HH:mm" />
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
        </Form>
      </Modal>
    </div>
  );
}
