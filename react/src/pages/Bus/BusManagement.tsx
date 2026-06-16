import React, { useCallback, useEffect, useMemo, useState } from "react";

import { EditOutlined, DeleteOutlined, FileExcelOutlined } from "@ant-design/icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Button,
  Card,
  Empty,
  Form,
  Input,
  Popconfirm,
  Table,
  Tooltip,
  Typography,
  message,
  Space,
  Modal,
  Tag,
} from "antd";

import {
  createTripBus,
  deleteTripBus,
  bulkDeleteTripBuses,
  getTripBuses,
  updateTripBus,
  exportTripBuses,
  getTrips,
  type TripBus,
} from "../../api/trips";
import { getUsers } from "../../api/users";
import TripFilterSelector from "../../components/TripFilterSelector";
import { useGetAccountInfo } from "../../hooks/useAuth";
import { useGlobalTripFilter } from "../../hooks/useGlobalTripFilter";
import { canManageCatalog } from "../../utils/helper";

import BusFormModal, { type BusFormValues } from "./components/BusFormModal";
import ImportBusModal from "./components/ImportBusModal";

import type { IUser } from "../../utils/types";

const { Title, Text } = Typography;

export default function BusManagement() {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [showCreate, setShowCreate] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [editingBus, setEditingBus] = useState<TripBus | null>(null);
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [form] = Form.useForm<BusFormValues>();
  const queryClient = useQueryClient();
  const { data: accountInfo } = useGetAccountInfo();
  const currentUser = accountInfo as IUser | undefined;
  const canManage = canManageCatalog(currentUser);

  const [activeTripId, setActiveTripId] = useGlobalTripFilter(false);

  const { data: tripsData } = useQuery({
    queryKey: ["trips"],
    queryFn: () => getTrips({ page: 1, limit: 1000 }),
  });
  const trips = useMemo(
    () => (Array.isArray(tripsData?.data) ? tripsData.data : []),
    [tripsData],
  );

  const { data: usersData } = useQuery({
    queryKey: ["users"],
    queryFn: () => getUsers({ page: 1, limit: 1000 }),
  });
  const users = useMemo(
    () => (Array.isArray(usersData?.data) ? usersData.data : []),
    [usersData],
  );

  const drivers = useMemo(
    () => users.filter((u: IUser) => u.role_name === "driver"),
    [users],
  );

  const fleetLeads = useMemo(
    () =>
      users.filter(
        (u: IUser) => u.role_name === "fleet_lead" || u.role_name === "admin",
      ),
    [users],
  );

  useEffect(() => {
    const handler = setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => clearTimeout(handler);
  }, [search]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, activeTripId]);

  const {
    data: busesResponse,
    isLoading,
    isFetching,
  } = useQuery({
    queryKey: ["trip-buses", page, pageSize, debouncedSearch, activeTripId],
    queryFn: () =>
      getTripBuses({
        page,
        limit: pageSize,
        search: debouncedSearch,
        trip: activeTripId || "",
      }),
    enabled: Boolean(activeTripId),
  });

  const buses = busesResponse?.data ?? [];
  const pagination = busesResponse?.pagination ?? {
    page,
    limit: pageSize,
    total_page: 1,
    total_items: buses.length,
  };

  const createMutation = useMutation({
    mutationFn: (payload: Partial<TripBus>) => createTripBus(payload),
    onSuccess: async () => {
      message.success("Tạo xe thành công");
      setShowCreate(false);
      form.resetFields();
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["trip-buses"] }),
        queryClient.invalidateQueries({ queryKey: ["trip-buses-validation"] }),
      ]);
    },
    onError: (err: any) =>
      message.error(
        err?.response?.data?.registration_number?.[0] ||
          err?.response?.data?.manager?.[0] ||
          err?.response?.data?.driver?.[0] ||
          "Tạo xe thất bại",
      ),
  });

  const updateMutation = useMutation({
    mutationFn: (data: { id: string; payload: Partial<TripBus> }) =>
      updateTripBus(data.id, data.payload),
    onSuccess: async () => {
      message.success("Cập nhật xe thành công");
      setEditingBus(null);
      setShowCreate(false);
      form.resetFields();
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["trip-buses"] }),
        queryClient.invalidateQueries({ queryKey: ["trip-buses-validation"] }),
      ]);
    },
    onError: (err: any) =>
      message.error(
        err?.response?.data?.registration_number?.[0] ||
          err?.response?.data?.manager?.[0] ||
          err?.response?.data?.driver?.[0] ||
          "Cập nhật xe thất bại",
      ),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteTripBus(id),
    onSuccess: async () => {
      message.success("Xóa xe thành công");
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["trip-buses"] }),
        queryClient.invalidateQueries({ queryKey: ["trip-buses-validation"] }),
      ]);
    },
    onError: () => message.error("Xóa xe thất bại"),
  });

  const { mutate: deleteBusMutate, status: deleteStatus } = deleteMutation;

  const openCreate = () => {
    if (!canManage) {
      message.warning("Bạn không có quyền chỉnh sửa");
      return;
    }
    setEditingBus(null);
    form.resetFields();
    setShowCreate(true);
  };

  const openEdit = useCallback(
    (bus: TripBus) => {
      if (!canManage) {
        message.warning("Bạn không có quyền chỉnh sửa");
        return;
      }
      setEditingBus(bus);
      form.setFieldsValue({
        trip: String(bus.trip),
        registration_number: bus.registration_number,
        bus_code: bus.bus_code,
        capacity: bus.capacity,
        description: bus.description,
        manager: bus.manager && String(bus.manager) !== "null" ? String(bus.manager) : undefined,
        driver: bus.driver && String(bus.driver) !== "null" ? String(bus.driver) : undefined,
      });
      setShowCreate(true);
    },
    [canManage, form],
  );

  const handleSubmit = () => {
    form
      .validateFields()
      .then((values) => {
        const payload: Partial<TripBus> = {
          trip: Number(values.trip),
          registration_number: values.registration_number,
          bus_code: values.bus_code,
          capacity: Number(values.capacity),
          manager: Number(values.manager),
          driver: Number(values.driver),
          description: values.description || "",
        };
        if (editingBus) {
          updateMutation.mutate({ id: editingBus.id, payload });
        } else {
          createMutation.mutate(payload);
        }
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
        render: (val: string, record: TripBus) => (
          <Space direction="vertical" size={0}>
            <Text strong>{val}</Text>
            <Text type="secondary" className="text-xs">
              {record.bus_code}
            </Text>
          </Space>
        ),
      },
      {
        title: "Sức chứa",
        dataIndex: "capacity",
        width: 100,
        render: (val: number) => `${val} chỗ`,
      },
      {
        title: "Trưởng xe",
        dataIndex: "manager",
        render: (_: unknown, record: TripBus) => {
          const user = users.find(
            (u) => String(u.id) === String(record.manager),
          );
          return user ? `${user.name} (${user.phone})` : "—";
        },
      },
      {
        title: "Tài xế",
        dataIndex: "driver",
        render: (_: unknown, record: TripBus) => {
          const user = users.find(
            (u) => String(u.id) === String(record.driver),
          );
          return user ? `${user.name} (${user.phone})` : "—";
        },
      },
      {
        title: "Mô tả",
        dataIndex: "description",
        render: (val: string) => val || "—",
      },
      {
        title: "Trạng thái chuyến",
        key: "tripStatus",
        render: (_: unknown, record: TripBus) => {
          const selectedTrip = trips.find((t) => String(t.id) === String(record.trip));
          if (selectedTrip) {
            const statusColor = selectedTrip.status === "done" ? "success" : selectedTrip.status === "doing" ? "blue" : "default";
            const statusLabel = selectedTrip.status === "done" ? "Đã hoàn thành" : selectedTrip.status === "doing" ? "Đang đi" : "Chưa xuất phát";
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
        render: (_: unknown, record: TripBus) => {
          const selectedTrip = trips.find((t) => String(t.id) === String(record.trip));
          const isPlanned = !selectedTrip || selectedTrip.status === "planned";
          return (
            <Space>
              <Tooltip title={isPlanned ? "Sửa" : "Không thể sửa khi chuyến đã xuất phát"}>
                <Button
                  type="text"
                  icon={<EditOutlined />}
                  onClick={() => openEdit(record)}
                  style={{ color: isPlanned ? "#2563eb" : undefined }}
                  disabled={!isPlanned}
                />
              </Tooltip>
              <Popconfirm
                title="Xóa xe?"
                description="Bạn có chắc chắn muốn xóa xe này?"
                onConfirm={() => deleteBusMutate(record.id)}
                okText="Xóa"
                cancelText="Hủy"
                disabled={!isPlanned}
              >
                <Tooltip title={isPlanned ? "Xóa" : "Không thể xóa khi chuyến đã xuất phát"}>
                  <Button
                    type="text"
                    danger
                    icon={<DeleteOutlined />}
                    loading={deleteStatus === "pending"}
                    disabled={!isPlanned}
                  />
                </Tooltip>
              </Popconfirm>
            </Space>
          );
        },
      },
    ];
  }, [canManage, deleteBusMutate, deleteStatus, openEdit, users, trips]);

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
                  disabled={!activeTripId}
                  onClick={async () => {
                    try {
                      if (!activeTripId) return;
                      const blob = await exportTripBuses(activeTripId);
                      const url = window.URL.createObjectURL(blob);
                      const a = document.createElement("a");
                      a.href = url;
                      const selectedTrip = trips.find((t) => String(t.id) === String(activeTripId));
                      const tripName = selectedTrip ? selectedTrip.name.replace(/[/\\?%*:|"<>]/g, '-') : "unknown";
                      a.download = `Danh_sach_xe_${tripName}.xlsx`;
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

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mt-6 mb-4 p-4 bg-slate-50/50 border border-slate-100 rounded-xl">
          <div className="flex items-center gap-3">
            <span className="font-medium text-slate-700 whitespace-nowrap">
              Chuyến đi:
            </span>
            <TripFilterSelector
              value={activeTripId}
              onChange={setActiveTripId}
              className="w-full sm:w-64"
            />
          </div>

          {canManage && activeTripId && trips.find((t) => String(t.id) === String(activeTripId))?.status === "planned" && (
            <div className="flex justify-end">
              {isSelectionMode ? (
                <div className="flex gap-2">
                  <Button
                    onClick={() => {
                      setIsSelectionMode(false);
                      setSelectedRowKeys([]);
                    }}
                  >
                    Hủy
                  </Button>
                  {selectedRowKeys.length > 0 && (
                    <Button
                      danger
                      icon={<DeleteOutlined />}
                      onClick={() => {
                        Modal.confirm({
                          title: "Xóa nhiều xe?",
                          content: `Bạn chắc chắn muốn xóa ${selectedRowKeys.length} xe đã chọn khỏi chuyến đi?`,
                          okText: "Xóa",
                          cancelText: "Hủy",
                          onOk: async () => {
                            const hide = message.loading("Đang xóa...", 0);
                            try {
                              await bulkDeleteTripBuses(
                                selectedRowKeys as number[],
                              );
                              message.success(
                                `Đã xóa ${selectedRowKeys.length} xe`,
                              );
                              setSelectedRowKeys([]);
                              setIsSelectionMode(false);
                              await Promise.all([
                                queryClient.invalidateQueries({ queryKey: ["trip-buses"] }),
                                queryClient.invalidateQueries({ queryKey: ["trip-buses-validation"] }),
                              ]);
                            } catch {
                              message.error("Lỗi khi xóa xe");
                            } finally {
                              hide();
                            }
                          },
                        });
                      }}
                    >
                      Xóa đã chọn ({selectedRowKeys.length})
                    </Button>
                  )}
                </div>
              ) : (
                <Button danger onClick={() => setIsSelectionMode(true)}>
                  Xóa nhiều
                </Button>
              )}
            </div>
          )}
        </div>

        <Card className="mt-6" styles={{ body: { padding: 0 } }}>
          {!activeTripId ? (
            <div className="py-12 text-center text-slate-500">
              <Empty description="Vui lòng chọn chuyến đi để xem danh sách xe" />
            </div>
          ) : (
            <Table
              scroll={{ x: "max-content" }}
              size="small"
              rowKey="id"
              rowSelection={
                isSelectionMode
                  ? {
                      selectedRowKeys,
                      onChange: (newSelectedRowKeys) =>
                        setSelectedRowKeys(newSelectedRowKeys),
                    }
                  : undefined
              }
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
          )}
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
        drivers={drivers}
        fleetLeads={fleetLeads}
        activeTripId={activeTripId}
        trips={trips}
        onOpenImport={() => {
          setShowCreate(false);
          setShowImport(true);
        }}
      />

      <ImportBusModal
        open={showImport}
        onCancel={() => setShowImport(false)}
        activeTripId={activeTripId}
      />
    </div>
  );
}
