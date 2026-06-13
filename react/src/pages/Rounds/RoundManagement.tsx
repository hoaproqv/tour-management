import React, { useCallback, useEffect, useMemo, useState } from "react";

import {
  EditOutlined,
  DeleteOutlined,
  FileExcelOutlined,
  MenuOutlined,
} from "@ant-design/icons";
import { DndContext, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
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
} from "antd";
import dayjs from "dayjs";

import {
  createRound,
  deleteRound,
  getRounds,
  getTripBuses,
  getTrips,
  updateRound,
  exportRounds,
  reorderRounds,
  type RoundItem,
  type RoundPayload,
  type TripBus,
  type Trip,
} from "../../api/trips";
import { useGetAccountInfo } from "../../hooks/useAuth";
import { useDebounce } from "../../hooks/useDebounce";
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
  planned: { label: "Chưa xuất phát", color: "blue" },
  doing: { label: "Đang đi", color: "orange" },
  done: { label: "Đã hoàn thành", color: "green" },
};

interface RowProps extends React.HTMLAttributes<HTMLTableRowElement> {
  "data-row-key": string;
}

const DraggableRow = ({ children, ...props }: RowProps) => {
  const isPlaceholder = props.className?.includes("ant-table-placeholder") || !props["data-row-key"];
  
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

  if (isPlaceholder) {
    return <tr {...props}>{children}</tr>;
  }

  const style: React.CSSProperties = {
    ...props.style,
    transform: CSS.Transform.toString(transform && { ...transform, scaleY: 1 }),
    transition,
    ...(isDragging ? { position: "relative", zIndex: 9999, background: "#fafafa" } : {}),
  };

  return (
    <tr {...props} ref={setNodeRef} style={style} {...attributes}>
      {React.Children.map(children, (child) => {
        if ((child as React.ReactElement).key === "drag-handle") {
          return React.cloneElement(child as React.ReactElement<any>, {
            children: (
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
  const [tripFilter, setTripFilter] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<RoundItem["status"] | "all">(
    "all",
  );
  const [showCreate, setShowCreate] = useState(false);
  const [editingRound, setEditingRound] = useState<RoundItem | null>(null);
  const [localRounds, setLocalRounds] = useState<RoundItem[]>([]);
  
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

  const trips = useMemo(
    () => (Array.isArray(tripsResponse?.data) ? tripsResponse.data : []),
    [tripsResponse],
  );

  useEffect(() => {
    if (trips.length > 0 && !tripFilter) {
      setTripFilter(trips[0].id);
    }
  }, [trips, tripFilter]);

  const rounds = useMemo(
    () => (Array.isArray(roundsResponse?.data) ? roundsResponse.data : []),
    [roundsResponse],
  );

  const tripBuses = useMemo(
    () =>
      Array.isArray(tripBusesResponse?.data) ? tripBusesResponse.data : [],
    [tripBusesResponse],
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

  const filteredRounds = useMemo(() => {
    const term = removeAccents(debouncedSearch).trim().toLowerCase();
    const filtered = (Array.isArray(rounds) ? rounds : []).filter((round) => {
      const matchTrip = round.trip === tripFilter;
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
    })
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
        const activeIndex = prev.findIndex((i) => i.id === active.id);
        const overIndex = prev.findIndex((i) => i.id === over?.id);
        const newArr = arrayMove(prev, activeIndex, overIndex);
        
        const updatedArr = newArr.map((item, index) => ({
          ...item,
          sequence: index + 1,
        }));
        
        const payload = updatedArr.map(i => ({ id: i.id, sequence: i.sequence }));
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
        trip: round.trip,
        name: round.name,
        location: round.location,
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
          sequence: editingRound ? editingRound.sequence : localRounds.length + 1,
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
      {
        key: "drag-handle",
        width: 50,
        render: () => null, // Renders the drag handle inside DraggableRow
      },
      {
        title: "Chuyến đi",
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
              value={tripFilter}
              onChange={(val) => setTripFilter(val)}
              className="w-full sm:w-48"
              options={[
                ...(Array.isArray(trips) ? trips : []).map((t: Trip) => ({
                  value: t.id,
                  label: t.name,
                })),
              ]}
              placeholder="Chọn chuyến"
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
              <div className="flex flex-wrap items-center gap-3">
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
          <DndContext sensors={sensors} modifiers={[restrictToVerticalAxis]} onDragEnd={onDragEnd}>
            <SortableContext
              items={localRounds.map((i) => i.id)}
              strategy={verticalListSortingStrategy}
            >
              <Table
                components={{ body: { row: DraggableRow } }}
                size="small"
                rowKey="id"
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
        tripFilter={tripFilter}
      />
    </div>
  );
}
