import React, { useEffect, useState } from "react";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Button,
  Card,
  Empty,
  Form,
  Input,
  Modal,
  Popconfirm,
  Table,
  Typography,
  message,
} from "antd";

import {
  createBus,
  deleteBus,
  getBuses,
  type BusItem,
  type BusPayload,
} from "../../api/trips";

const { Title, Text } = Typography;

export default function BusManagement() {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [showCreate, setShowCreate] = useState(false);
  const [form] = Form.useForm();
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

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteBus(id),
    onSuccess: async () => {
      message.success("Xóa bus thành công");
      await queryClient.invalidateQueries({ queryKey: ["buses"] });
    },
    onError: () => message.error("Xóa bus thất bại"),
  });

  const handleCreate = () => {
    form
      .validateFields()
      .then((values) => {
        const payload: BusPayload = {
          registration_number: values.registration_number,
          bus_code: values.bus_code,
          capacity: Number(values.capacity),
          description: values.description || "",
        };
        createMutation.mutate(payload);
      })
      .catch(() => undefined);
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
            <Button type="primary" onClick={() => setShowCreate(true)}>
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

      <Modal
        open={showCreate}
        onCancel={() => setShowCreate(false)}
        onOk={handleCreate}
        confirmLoading={createMutation.status === "pending"}
        title="Tạo bus mới"
        okText="Tạo"
        cancelText="Hủy"
        destroyOnHidden
      >
        <Form layout="vertical" form={form} initialValues={{ capacity: 40 }}>
          <Form.Item
            label="Biển số"
            name="registration_number"
            rules={[{ required: true, message: "Nhập biển số" }]}
          >
            <Input placeholder="51B-12345" />
          </Form.Item>
          <Form.Item
            label="Mã xe"
            name="bus_code"
            rules={[{ required: true, message: "Nhập mã xe" }]}
          >
            <Input placeholder="BUS-01" />
          </Form.Item>
          <Form.Item
            label="Sức chứa"
            name="capacity"
            rules={[{ required: true, message: "Nhập sức chứa" }]}
          >
            <Input type="number" min={1} />
          </Form.Item>
          <Form.Item label="Mô tả" name="description">
            <Input.TextArea
              rows={3}
              placeholder="Ghi chú, loại xe, tài xế..."
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
