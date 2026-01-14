import React, { useEffect, useState } from "react";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Button,
  Card,
  Empty,
  Form,
  Input,
  Popconfirm,
  Table,
  Typography,
  message,
} from "antd";

import {
  createBus,
  deleteBus,
  getBuses,
  updateBus,
  type BusItem,
  type BusPayload,
} from "../../api/trips";

import BusFormModal, { type BusFormValues } from "./components/BusFormModal";

const { Title, Text } = Typography;

export default function BusManagement() {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [showCreate, setShowCreate] = useState(false);
  const [editingBus, setEditingBus] = useState<BusItem | null>(null);
  const [form] = Form.useForm<BusFormValues>();
  const queryClient = useQueryClient();

  useEffect(() => {
    const handler = setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => clearTimeout(handler);
  }, [search]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch]);

  const {
    data: busesResponse,
    isLoading,
    isFetching,
  } = useQuery({
    queryKey: ["buses", page, pageSize, debouncedSearch],
    queryFn: () => getBuses({ page, limit: pageSize, search: debouncedSearch }),
  });

  const buses = busesResponse?.data ?? [];
  const pagination = busesResponse?.pagination ?? {
    page,
    limit: pageSize,
    total_page: 1,
    total_items: buses.length,
  };

  const createMutation = useMutation({
    mutationFn: (payload: BusPayload) => createBus(payload),
    onSuccess: async () => {
      message.success("Tạo bus thành công");
      setShowCreate(false);
      form.resetFields();
      await queryClient.invalidateQueries({ queryKey: ["buses"] });
    },
    onError: () => message.error("Tạo bus thất bại"),
  });

  const updateMutation = useMutation({
    mutationFn: (data: { id: string; payload: BusPayload }) =>
      updateBus(data.id, data.payload),
    onSuccess: async () => {
      message.success("Cập nhật bus thành công");
      setEditingBus(null);
      form.resetFields();
      await queryClient.invalidateQueries({ queryKey: ["buses"] });
    },
    onError: () => message.error("Cập nhật bus thất bại"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteBus(id),
    onSuccess: async () => {
      message.success("Xóa bus thành công");
      await queryClient.invalidateQueries({ queryKey: ["buses"] });
    },
    onError: () => message.error("Xóa bus thất bại"),
  });

  const openCreate = () => {
    setEditingBus(null);
    form.resetFields();
    setShowCreate(true);
  };

  const openEdit = (bus: BusItem) => {
    setEditingBus(bus);
    form.setFieldsValue({
      registration_number: bus.registration_number,
      bus_code: bus.bus_code,
      capacity: bus.capacity,
      description: bus.description,
    });
    setShowCreate(true);
  };

  const handleSubmit = () => {
    form
      .validateFields()
      .then((values) => {
        const payload: BusPayload = {
          registration_number: values.registration_number,
          bus_code: values.bus_code,
          capacity: Number(values.capacity),
          description: values.description || "",
        };
        if (editingBus) {
          updateMutation.mutate({ id: editingBus.id, payload });
        } else {
          createMutation.mutate(payload);
        }
        handleCancel();
      })
      .catch(() => undefined);
  };

  const handleCancel = () => {
    setShowCreate(false);
    setEditingBus(null);
  };

  const columns = [
    {
      title: "Biển số",
      dataIndex: "registration_number",
    },
    {
      title: "Mã xe",
      dataIndex: "bus_code",
    },
    {
      title: "Sức chứa",
      dataIndex: "capacity",
    },
    {
      title: "Mô tả",
      dataIndex: "description",
      render: (val: string | null) => val || "—",
    },
    {
      title: "Thao tác",
      dataIndex: "actions",
      render: (_: unknown, record: BusItem) => (
        <div className="flex gap-2">
          <Button type="link" onClick={() => openEdit(record)}>
            Sửa
          </Button>
          <Popconfirm
            title="Xóa bus?"
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
        </div>
      ),
    },
  ];

  return (
    <div className="w-full bg-[#f4f7fb] min-h-screen py-6">
      <div className="bg-white shadow-sm rounded-2xl p-6 border border-slate-100">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <p className="text-sm uppercase tracking-[0.25em] text-sky-700 font-semibold">
              Bus Management
            </p>
            <Title level={2} style={{ margin: 0 }}>
              Quản lý Bus
            </Title>
            <Text type="secondary">
              Quản lý danh sách xe phục vụ cho các trip.
            </Text>
          </div>
          <div className="flex flex-col md:flex-row gap-2 md:items-center">
            <Input
              allowClear
              placeholder="Tìm theo biển số, mã xe, mô tả"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full md:w-80"
            />
            <Button type="primary" onClick={openCreate}>
              + New Bus
            </Button>
          </div>
        </div>

        <Card className="mt-6" styles={{ body: { padding: 0 } }}>
          <Table
            rowKey="id"
            dataSource={buses}
            loading={isLoading || isFetching}
            pagination={{
              current: pagination.page,
              pageSize: pagination.limit,
              total: pagination.total_items,
              showSizeChanger: true,
              pageSizeOptions: ["5", "10", "20", "50"],
              onChange: (current, nextPageSize) => {
                setPage(current);
                setPageSize(nextPageSize);
              },
            }}
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

      <BusFormModal
        open={showCreate}
        onCancel={handleCancel}
        onSubmit={handleSubmit}
        confirmLoading={
          createMutation.status === "pending" ||
          updateMutation.status === "pending"
        }
        form={form}
        editingBus={editingBus}
      />
    </div>
  );
}
