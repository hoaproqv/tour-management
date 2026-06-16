import React, { useCallback, useEffect, useMemo, useState } from "react";

import {
  EditOutlined,
  DeleteOutlined,
  FileExcelOutlined,
  MenuOutlined,
} from "@ant-design/icons";
import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { restrictToVerticalAxis } from "@dnd-kit/modifiers";
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
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
  Modal,
} from "antd";
import dayjs from "dayjs";

import {
  createRound,
  getRounds,
  getTripBuses,
  getTrips,
  updateRound,
  deleteRound,
  bulkDeleteRounds,
  exportRounds,
  reorderRounds,
  type RoundItem,
  type RoundPayload,
  type TripBus,
  type Trip,
} from "../../api/trips";
import { useGetAccountInfo } from "../../hooks/useAuth";
import { useDebounce } from "../../hooks/useDebounce";
import { useGlobalTripFilter } from "../../hooks/useGlobalTripFilter";
import { canManageCatalog, removeAccents } from "../../utils/helper";

import RoundFormModal, {
  type RoundFormValues,
} from "./components/RoundFormModal";

import type { IUser } from "../../utils/types";

const { Title, Text } = Typography;

const statusMeta: Record<
  RoundItem["status"],
  { label: string; color: string }
> = {
  planned: { label: "Chưa đến", color: "blue" },
  doing: { label: "Đang đến", color: "orange" },
  done: { label: "Đã hoàn thành", color: "green" },
};

interface RowProps extends React.HTMLAttributes<HTMLTableRowElement> {
  "data-row-key": string;
}

const RoundContext = React.createContext<RoundItem[]>([]);

const DraggableRow = ({ children, ...props }: RowProps) => {
  const isPlaceholder =
    props.className?.includes("ant-table-placeholder") ||
    !props["data-row-key"];

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: props["data-row-key"] || "empty",
  });

  const localRounds = React.useContext(RoundContext);
  const rowId = props["data-row-key"];
  const isFirstRound =
    localRounds.find((r) => String(r.id) === String(rowId))?.sequence === 1;

  if (isPlaceholder) {
    return <tr {...props}>{children}</tr>;
  }

  const style: React.CSSProperties = {
    ...props.style,
    transform: CSS.Transform.toString(transform && { ...transform, scaleY: 1 }),
    transition,
    ...(isDragging
      ? { position: "relative", zIndex: 9999, background: "#fafafa" }
      : {}),
  };

  return (
    <tr {...props} ref={setNodeRef} style={style} {...attributes}>
      {React.Children.map(children, (child) => {
        if ((child as React.ReactElement).key === "drag-handle") {
          const isPlanned = localRounds.find((r) => String(r.id) === String(rowId))?.status === "planned";
          return React.cloneElement(child as React.ReactElement<any>, {
            children: isFirstRound || !isPlanned ? (
              <MenuOutlined
                style={{
                  touchAction: "none",
                  cursor: "not-allowed",
                  color: "#cbd5e1",
                }}
              />
            ) : (
              <MenuOutlined
                style={{ touchAction: "none", cursor: "grab", color: "#999" }}
                {...listeners}
              />
            ),
          });
        }
        return child;
      })}
    </tr>
  );
};

export default function RoundManagement() {
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 300);
  const [statusFilter, setStatusFilter] = useState<RoundItem["status"] | "all">(
    "all",
  );
  const [showCreate, setShowCreate] = useState(false);
  const [editingRound, setEditingRound] = useState<RoundItem | null>(null);
  const [localRounds, setLocalRounds] = useState<RoundItem[]>([]);
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [isSelectionMode, setIsSelectionMode] = useState(false);

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

  const { data: roundsResponse, isLoading } = useQuery({
    queryKey: ["rounds"],
    queryFn: () => getRounds({ page: 1, limit: 1000 }),
  });

  const trips = useMemo(() => {
    const arr = Array.isArray(tripsResponse?.data)
      ? [...tripsResponse.data]
      : [];
    return arr.sort((a, b) => {
      const timeA = a.created_at ? new Date(a.created_at).getTime() : 0;
      const timeB = b.created_at ? new Date(b.created_at).getTime() : 0;
      return timeB - timeA;
    });
  }, [tripsResponse]);

  const [tripFilter, setTripFilter] = useGlobalTripFilter(true);

  const rounds = useMemo(
    () => (Array.isArray(roundsResponse?.data) ? roundsResponse.data : []),
    [roundsResponse],
  );

  const tripBuses = useMemo(
    () =>
      Array.isArray(tripBusesResponse?.data) ? tripBusesResponse.data : [],
    [tripBusesResponse],
  );

  const tripDefaultBusMap = useMemo(() => {
    const grouped = new Map<string, Array<string | number>>();
    tripBuses.forEach((tb: TripBus) => {
      const tripKey = String(tb.trip);
      const list = grouped.get(tripKey) ?? [];
      list.push(tb.bus);
      grouped.set(tripKey, list);
    });
    return grouped;
  }, [tripBuses]);

  const filteredRounds = useMemo(() => {
    const term = removeAccents(debouncedSearch).trim().toLowerCase();
    const filtered = (Array.isArray(rounds) ? rounds : []).filter((round) => {
      const matchTrip = String(round.trip) === String(tripFilter);
      const matchStatus =
        statusFilter === "all" ? true : round.status === statusFilter;
      const matchTerm = term
        ? removeAccents(round.name).toLowerCase().includes(term) ||
          removeAccents(round.location).toLowerCase().includes(term)
        : true;
      return matchTrip && matchStatus && matchTerm;
    });
    return filtered.sort((a, b) => a.sequence - b.sequence);
  }, [rounds, tripFilter, statusFilter, debouncedSearch]);

  useEffect(() => {
    setLocalRounds(filteredRounds);
  }, [filteredRounds]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
  );

  const reorderMutation = useMutation({
    mutationFn: (items: Array<{ id: string | number; sequence: number }>) =>
      reorderRounds(items),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["rounds"] });
    },
    onError: () => {
      message.error("Lỗi khi cập nhật thứ tự chặng");
      queryClient.invalidateQueries({ queryKey: ["rounds"] });
    },
  });

  const onDragEnd = ({ active, over }: any) => {
    if (active.id !== over?.id) {
      setLocalRounds((prev) => {
        const activeItem = prev.find((i) => String(i.id) === String(active.id));

        if (activeItem?.status !== "planned") {
          message.warning(
            "Không thể thay đổi thứ tự của chặng đã đến hoặc đang đến",
          );
          return prev;
        }

        if (activeItem?.sequence === 1) {
          message.warning(
            "Không thể thay đổi thứ tự của chặng 'Tập trung và xuất phát'",
          );
          return prev;
        }

        const activeIndex = prev.findIndex(
          (i) => String(i.id) === String(active.id),
        );
        let overIndex = prev.findIndex(
          (i) => String(i.id) === String(over?.id),
        );

        if (overIndex === 0) {
          overIndex = 1;
        }

        const newArr = arrayMove(prev, activeIndex, overIndex);

        const updatedArr = newArr.map((item, index) => ({
          ...item,
          sequence: index + 1,
        }));

        const payload = updatedArr.map((i) => ({
          id: i.id,
          sequence: i.sequence,
        }));
        reorderMutation.mutate(payload);

        return updatedArr;
      });
    }
  };

  const createMutation = useMutation({
    mutationFn: (payload: RoundPayload) => createRound(payload),
    onSuccess: async () => {
      message.success("Tạo chặng thành công");
      setShowCreate(false);
      form.resetFields();
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["rounds"] }),
        queryClient.invalidateQueries({ queryKey: ["round-buses"] }),
      ]);
    },
    onError: () => message.error("Tạo chặng thất bại"),
  });

  const updateMutation = useMutation({
    mutationFn: (data: { id: string; payload: RoundPayload }) =>
      updateRound(data.id, data.payload),
    onSuccess: async () => {
      message.success("Cập nhật chặng thành công");
      setEditingRound(null);
      form.resetFields();
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["rounds"] }),
        queryClient.invalidateQueries({ queryKey: ["round-buses"] }),
      ]);
    },
    onError: () => message.error("Cập nhật chặng thất bại"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteRound(id),
    onSuccess: async () => {
      message.success("Xóa round thành công");
      await queryClient.invalidateQueries({ queryKey: ["rounds"] });
    },
    onError: () => message.error("Xóa chặng thất bại"),
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
        trip: String(round.trip),
        name: round.name,
        location: round.location,
        estimate_time: round.estimate_time
          ? dayjs(round.estimate_time)
          : undefined,
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
          estimate_time: values.estimate_time
            ? values.estimate_time.format()
            : null,
          sequence: editingRound
            ? editingRound.sequence
            : localRounds.length + 1,
          bus_ids: tripDefaultBusMap.get(values.trip) || [],
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
      ...(canManage
        ? [
            {
              title: "Sắp xếp",
              key: "drag-handle",
              width: 50,
              align: "center" as const,
              render: () => null,
            },
          ]
        : []),
      {
        title: "Thứ tự",
        width: 50,
        align: "center" as const,
        dataIndex: "sequence",
      },
      {
        title: "Tên chặng",
        dataIndex: "name",
        width: 250,
        ellipsis: true,
        render: (val: string) => (
          <Tooltip title={val}>
            <div className="truncate w-full" style={{ maxWidth: 230 }}>
              {val}
            </div>
          </Tooltip>
        ),
      },
      {
        title: "Địa điểm",
        dataIndex: "location",
      },
      {
        title: "Ước tính",
        dataIndex: "estimate_time",
        render: (val: string | null) =>
          val ? dayjs(val).format("DD/MM/YYYY HH:mm") : "—",
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
        render: (_: unknown, record: RoundItem) => {
          const isPlanned = record.status === "planned";
          return (
            <Space>
              <Tooltip title={isPlanned ? "Sửa" : "Không thể sửa chặng đã đến hoặc đang đến"}>
                <Button
                  type="text"
                  icon={<EditOutlined />}
                  onClick={() => openEdit(record)}
                  style={{ color: isPlanned ? "#2563eb" : undefined }}
                  disabled={!isPlanned}
                />
              </Tooltip>
              {record.sequence === 1 ? (
                <Tooltip title="Không thể xóa chặng đầu tiên">
                  <Button type="text" disabled icon={<DeleteOutlined />} />
                </Tooltip>
              ) : (
                <Popconfirm
                  title="Xóa chặng này?"
                  description="Thao tác này không thể hoàn tác."
                  onConfirm={() => deleteRoundMutate(String(record.id))}
                  okText="Xóa"
                  cancelText="Hủy"
                  disabled={!isPlanned}
                >
                  <Tooltip title={isPlanned ? "Xóa" : "Không thể xóa chặng đã đến hoặc đang đến"}>
                    <Button
                      type="text"
                      danger
                      icon={<DeleteOutlined />}
                      loading={deleteStatus === "pending"}
                      disabled={!isPlanned}
                    />
                  </Tooltip>
                </Popconfirm>
              )}
            </Space>
          );
        },
      },
    ];
  }, [canManage, deleteRoundMutate, deleteStatus, openEdit]);

  return (
    <div className="w-full bg-[#f4f7fb] h-full py-6">
      <div className="bg-white shadow-sm rounded-2xl p-6 border border-slate-100">
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 mb-2">
          <div className="flex-1 min-w-[250px] pr-4">
            <p className="text-sm uppercase tracking-[0.25em] text-sky-700 font-semibold">
              ROUND MANAGEMENT
            </p>
            <Title level={2} style={{ margin: 0 }}>
              Quản lý Chặng
            </Title>
            <Text type="secondary">
              Quản lý các chặng thuộc chuyến đi và trạng thái thực hiện.
            </Text>
          </div>
          <div className="flex flex-wrap items-center gap-3 w-full xl:w-auto">
            <Input
              allowClear
              placeholder="Tìm theo tên hoặc địa điểm"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full sm:w-64"
            />

            <Select
              value={statusFilter}
              onChange={(val) => setStatusFilter(val)}
              className="w-full sm:w-48"
              options={[
                { value: "all", label: "Tất cả trạng thái" },
                ...Object.entries(statusMeta).map(([value, meta]) => ({
                  value,
                  label: meta.label,
                })),
              ]}
            />
            {canManage && (
              <Button
                icon={<FileExcelOutlined />}
                onClick={async () => {
                  if (!tripFilter) {
                    message.warning("Vui lòng chọn một chuyến đi");
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
            )}
            {canManage && (
              <Button
                type="primary"
                onClick={openCreate}
                className="bg-sky-600 hover:bg-sky-700 shadow-sm px-5"
              >
                + Tạo mới
              </Button>
            )}
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mt-6 mb-4 p-4 bg-slate-50/50 border border-slate-100 rounded-xl">
          <div className="flex items-center gap-3">
            <span className="font-medium text-slate-700 whitespace-nowrap">
              Chuyến đi:
            </span>
            <Select
              value={trips.some(t => String(t.id) === tripFilter) ? tripFilter : undefined}
              onChange={(val) => setTripFilter(val)}
              className="w-full sm:w-64"
              showSearch
              optionFilterProp="label"
              notFoundContent="Không có chuyến đi"
              options={[
                ...trips.map((t: Trip) => ({
                  value: String(t.id),
                  label: t.name,
                })),
              ]}
              placeholder="Chọn chuyến đi"
            />
          </div>

          {canManage && (
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
                          title: "Xóa nhiều chặng?",
                          content: `Bạn chắc chắn muốn xóa ${selectedRowKeys.length} chặng đã chọn?`,
                          okText: "Xóa",
                          cancelText: "Hủy",
                          onOk: async () => {
                            const hide = message.loading("Đang xóa...", 0);
                            try {
                              await bulkDeleteRounds(
                                selectedRowKeys as string[],
                              );
                              message.success(
                                `Đã xóa ${selectedRowKeys.length} chặng`,
                              );
                              setSelectedRowKeys([]);
                              setIsSelectionMode(false);
                              await queryClient.invalidateQueries({
                                queryKey: ["rounds"],
                              });
                            } catch {
                              message.error("Lỗi khi xóa chặng");
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

        <Card styles={{ body: { padding: 0 } }}>
          <DndContext
            sensors={sensors}
            modifiers={[restrictToVerticalAxis]}
            onDragEnd={onDragEnd}
          >
            <SortableContext
              items={localRounds.map((i) => i.id)}
              strategy={verticalListSortingStrategy}
            >
              <RoundContext.Provider value={localRounds}>
                <Table
                  components={{ body: { row: DraggableRow } }}
                  size="small"
                  rowKey="id"
                  rowSelection={
                    isSelectionMode
                      ? {
                          selectedRowKeys,
                          onChange: (newSelectedRowKeys) =>
                            setSelectedRowKeys(newSelectedRowKeys),
                          getCheckboxProps: (record) => ({
                            disabled: record.status !== "planned" || record.sequence === 1,
                          }),
                        }
                      : undefined
                  }
                  dataSource={localRounds}
                  loading={isLoading}
                  pagination={false}
                  scroll={{ x: "max-content" }}
                  columns={columns}
                  locale={{
                    emptyText: isLoading ? (
                      <span>Đang tải...</span>
                    ) : (
                      <Empty description="Chưa có dữ liệu" />
                    ),
                  }}
                />
              </RoundContext.Provider>
            </SortableContext>
          </DndContext>
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
        editingRound={editingRound}
        tripFilter={tripFilter ?? undefined}
      />
    </div>
  );
}
