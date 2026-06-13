import React, { useCallback, useEffect, useMemo, useState } from "react";

import {
  EditOutlined,
  DeleteOutlined,
  FileExcelOutlined,
} from "@ant-design/icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Button,
  Card,
  Empty,
  Form,
  Input,
  Popconfirm,
  Table,
  Tag,
  Tooltip,
  Typography,
  message,
  Space,
} from "antd";

import {
  createBus,
  deleteBus,
  getBuses,
  updateBus,
  exportBuses,
  type BusItem,
  type BusPayload,
} from "../../api/trips";
import { useGetAccountInfo } from "../../hooks/useAuth";
import { canManageCatalog } from "../../utils/helper";

import BusFormModal, { type BusFormValues } from "./components/BusFormModal";

import type { IUser } from "../../utils/types";

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
  const { data: accountInfo } = useGetAccountInfo();
  const currentUser = accountInfo as IUser | undefined;
  const canManage = canManageCatalog(currentUser);

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

  const { mutate: deleteBusMutate, status: deleteStatus } = deleteMutation;

  const openCreate = () => {
    if (!canManage) {
      message.warning("Bạn không có quyền chỉnh sửa bus");
      return;
    }
    setEditingBus(null);
    form.resetFields();
    setShowCreate(true);
  };

  const openEdit = useCallback(
    (bus: BusItem) => {
      if (!canManage) {
        message.warning("Bạn không có quyền chỉnh sửa bus");
        return;
      }
      setEditingBus(bus);
      form.setFieldsValue({
        registration_number: bus.registration_number,
        bus_code: bus.bus_code,
        capacity: bus.capacity,
        description: bus.description,
      });
      setShowCreate(true);
    },
    [canManage, form],
  );

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

  const columns = useMemo(() => {
    const base = [
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
        width: 100,
      },
      {
        title: "Mô tả",
        dataIndex: "description",
        render: (val: string | null) => val || "—",
      },
      {
        title: "Trạng thái",
        key: "status",
        width: 200,
        render: (_: unknown, record: BusItem) => {
          if (record.is_available === false && record.active_trip) {
            const statusColor =
              record.active_trip.status === "doing" ? "processing" : "default";
            const statusLabel =
              record.active_trip.status === "doing"
                ? "Đang đi"
                : "Chưa xuất phát";
            return <Tag color={statusColor}>{statusLabel}</Tag>;
          }
          return <Tag color="success">Sẵn sàng</Tag>;
        },
      },
    ];

    if (!canManage) return base;

    return [
      ...base,
      {
        title: "Thao tác",
        dataIndex: "actions",
        render: (_: unknown, record: BusItem) => (
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
              title="Xóa bus này?"
              description="Thao tác này không thể hoàn tác."
              onConfirm={() => deleteBusMutate(record.id)}
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
  }, [canManage, deleteBusMutate, deleteStatus, openEdit]);

  return (
    <div className="w-full bg-[#f4f7fb] h-full py-6">
      <div className="bg-white shadow-sm rounded-2xl p-6 border border-slate-100">
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 mb-2">
          <div className="flex-1 min-w-[250px] pr-4">
            <p className="text-sm uppercase tracking-[0.25em] text-sky-700 font-semibold">
              BUS MANAGEMENT
            </p>
            <Title level={2} style={{ margin: 0 }}>
              Quản lý Xe khách
            </Title>
            <Text type="secondary">
              Quản lý danh sách xe phục vụ cho các Chuyến đi.
            </Text>
          </div>
          <div className="flex flex-wrap items-center gap-3 w-full xl:w-auto">
            <Input
              allowClear
              placeholder="Tìm theo biển số, mã xe, mô tả"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full sm:w-80"
            />
            {canManage && (
              <div className="flex flex-wrap items-center gap-3">
                <Button
                  icon={<FileExcelOutlined />}
                  onClick={async () => {
                    try {
                      const blob = await exportBuses();
                      const url = window.URL.createObjectURL(blob);
                      const a = document.createElement("a");
                      a.href = url;
                      a.download = "buses.xlsx";
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
                <Button
                  type="primary"
                  onClick={openCreate}
                  className="bg-sky-600 hover:bg-sky-700 shadow-sm px-5"
                >
                  + Tạo mới
                </Button>
              </div>
            )}
          </div>
        </div>

        <Card className="mt-6" styles={{ body: { padding: 0 } }}>
          <Table scroll={{ x: "max-content" }}
            size="small"
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
