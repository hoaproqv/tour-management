import React, { useEffect, useState } from "react";

import {
  DeleteOutlined,
  EditOutlined,
  HolderOutlined,
  PlusOutlined,
} from "@ant-design/icons";
import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
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
  Form,
  Input,
  Modal,
  Popconfirm,
  Spin,
  Tag,
  TimePicker,
  message,
} from "antd";
import dayjs from "dayjs";

import {
  createRound,
  deleteRound,
  getRounds,
  reorderRounds,
  updateRound,
} from "../../../api/trips";

import type { EnrichedTrip } from "./types";
import type { RoundItem, Trip } from "../../../api/trips";
import type { DragEndEvent } from "@dnd-kit/core";

const statusMeta: Record<
  RoundItem["status"],
  { label: string; color: string }
> = {
  planned: { label: "Chưa đi", color: "blue" },
  doing: { label: "Đang đi", color: "orange" },
  done: { label: "Đã đi", color: "green" },
};

interface TripRoundManagementModalProps {
  trip: EnrichedTrip | null;
  open: boolean;
  onClose: () => void;
}

// ---------- Sortable Row ----------
function SortableRoundRow({
  round,
  onEdit,
  onDelete,
}: {
  round: RoundItem;
  onEdit: (_r: RoundItem) => void;
  onDelete: (_r: RoundItem) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: round.id,
  });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 999 : undefined,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-2 bg-white border border-slate-200 rounded-lg px-3 py-2 group"
    >
      {/* Drag handle */}
      <span
        {...attributes}
        {...listeners}
        className="cursor-grab text-slate-400 hover:text-slate-600 touch-none"
      >
        <HolderOutlined />
      </span>

      {/* Sequence badge */}
      <span className="shrink-0 w-6 h-6 rounded-full bg-slate-100 text-slate-600 text-xs flex items-center justify-center font-semibold">
        {round.sequence}
      </span>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="font-medium text-[13px] text-slate-800 truncate">
          {round.name}
        </div>
        <div className="text-[11px] text-slate-500 truncate">
          {round.location || "—"}
        </div>
      </div>

      {/* Status tag */}
      <Tag
        color={statusMeta[round.status].color}
        className="shrink-0 !m-0 text-[11px]"
      >
        {statusMeta[round.status].label}
      </Tag>

      {/* Actions */}
      <Button
        type="text"
        icon={<EditOutlined />}
        size="small"
        className="text-blue-500 opacity-0 group-hover:opacity-100 transition-opacity"
        onClick={() => onEdit(round)}
      />
      <Popconfirm
        title="Xóa điểm dừng?"
        description="Điểm dừng này sẽ bị xóa vĩnh viễn."
        okText="Xóa"
        cancelText="Hủy"
        onConfirm={() => onDelete(round)}
      >
        <Button
          type="text"
          icon={<DeleteOutlined />}
          size="small"
          danger
          className="opacity-0 group-hover:opacity-100 transition-opacity"
        />
      </Popconfirm>
    </div>
  );
}

// ---------- Edit/Add form modal ----------
function RoundFormModal({
  open,
  onClose,
  onSubmit,
  loading,
  initialValues,
}: {
  open: boolean;
  onClose: () => void;
  onSubmit: (values: any) => void;
  loading: boolean;
  initialValues?: Partial<RoundItem>;
}) {
  const [form] = Form.useForm();

  useEffect(() => {
    if (open) {
      form.setFieldsValue({
        name: initialValues?.name || "",
        location: initialValues?.location || "",
        estimate_time: initialValues?.estimate_time
          ? dayjs(initialValues.estimate_time, "HH:mm:ss")
          : undefined,
      });
    } else {
      form.resetFields();
    }
  }, [open, initialValues, form]);

  const handleOk = () => {
    form.validateFields().then((vals: any) => {
      onSubmit({
        ...vals,
        estimate_time: vals.estimate_time
          ? vals.estimate_time.format("HH:mm:ss")
          : "00:00:00",
      });
    });
  };
  return (
    <Modal
      open={open}
      onCancel={onClose}
      onOk={handleOk}
      confirmLoading={loading}
      title={initialValues?.id ? "Sửa điểm dừng" : "Thêm điểm dừng"}
      okText={initialValues?.id ? "Cập nhật" : "Thêm"}
      cancelText="Hủy"
      width={480}
      destroyOnClose
    >
      <Form form={form} layout="vertical" className="mt-4">
        <Form.Item
          label="Tên điểm dừng"
          name="name"
          rules={[{ required: true, message: "Nhập tên điểm dừng" }]}
        >
          <Input placeholder="Ví dụ: Sân bay Nội Bài" />
        </Form.Item>
        <Form.Item label="Địa điểm" name="location">
          <Input placeholder="Địa chỉ cụ thể..." />
        </Form.Item>
        <Form.Item label="Thời gian dự kiến" name="estimate_time">
          <TimePicker format="HH:mm" className="w-full" />
        </Form.Item>
      </Form>
    </Modal>
  );
}

// ---------- Main Modal ----------
export default function TripRoundManagementModal({
  trip,
  open,
  onClose,
}: TripRoundManagementModalProps) {
  const queryClient = useQueryClient();
  const [rounds, setRounds] = useState<RoundItem[]>([]);
  const [savedOrder, setSavedOrder] = useState<string[]>([]);
  const [editingRound, setEditingRound] = useState<RoundItem | null>(null);
  const [showForm, setShowForm] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["rounds", trip?.id],
    queryFn: () => getRounds({ trip: trip?.id, page: 1, limit: 1000 }),
    enabled: open && Boolean(trip?.id),
  });

  useEffect(() => {
    const list = Array.isArray((data as any)?.data) ? (data as any).data : [];
    const sorted = [...list].sort(
      (a: RoundItem, b: RoundItem) => a.sequence - b.sequence,
    );
    setRounds(sorted);
    setSavedOrder(sorted.map((r: RoundItem) => r.id));
  }, [data]);

  // True when current display order differs from last-saved order
  const hasOrderChange =
    rounds.map((r) => r.id).join(",") !== savedOrder.join(",");

  // Only invalidate the rounds for THIS specific trip (targeted, not broad)
  const invalidateTripRounds = () =>
    queryClient.invalidateQueries({ queryKey: ["rounds", trip?.id] });

  const saveOrderMutation = useMutation({
    mutationFn: () =>
      reorderRounds(rounds.map((r, idx) => ({ id: r.id, sequence: idx + 1 }))),
    onSuccess: () => {
      message.success("Đã lưu thứ tự hành trình");
      // Local state already updated by handleDragEnd — no need to refetch
      const updated = rounds.map((r, idx) => ({ ...r, sequence: idx + 1 }));
      setRounds(updated);
      setSavedOrder(updated.map((r) => r.id));
    },
    onError: () => message.error("Lưu thứ tự thất bại"),
  });

  const createMutation = useMutation({
    mutationFn: (payload: any) => createRound(payload),
    onSuccess: async () => {
      message.success("Đã thêm điểm dừng");
      await invalidateTripRounds();
    },
    onError: () => message.error("Thêm điểm dừng thất bại"),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: any }) =>
      updateRound(id, payload),
    onSuccess: async () => {
      message.success("Đã cập nhật điểm dừng");
      await invalidateTripRounds();
    },
    onError: () => message.error("Cập nhật thất bại"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteRound(id),
    onSuccess: async () => {
      message.success("Đã xóa điểm dừng");
      await invalidateTripRounds();
    },
    onError: () => message.error("Xóa thất bại"),
  });

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIdx = rounds.findIndex((r) => r.id === active.id);
    const newIdx = rounds.findIndex((r) => r.id === over.id);
    // Only update local display order — user must press "Lưu thứ tự" to persist
    setRounds((prev) => arrayMove(prev, oldIdx, newIdx));
  };

  const handleResetOrder = () => {
    const idToRound = new Map(rounds.map((r) => [r.id, r]));
    setRounds(savedOrder.map((id) => idToRound.get(id)!).filter(Boolean));
  };

  const handleFormSubmit = (values: any) => {
    if (!trip) return;
    if (editingRound) {
      updateMutation.mutate({
        id: editingRound.id,
        payload: {
          ...editingRound,
          name: values.name,
          location: values.location || "",
          estimate_time: values.estimate_time,
          trip: editingRound.trip,
        },
      });
    } else {
      createMutation.mutate({
        trip: trip.id,
        name: values.name,
        location: values.location || "",
        estimate_time: values.estimate_time,
        sequence: rounds.length + 1,
        status: "planned" as Trip["status"],
        bus_ids: [],
      });
    }
    setShowForm(false);
    setEditingRound(null);
  };

  return (
    <>
      <Modal
        open={open}
        onCancel={onClose}
        footer={null}
        title={
          trip ? `Quản lý hành trình - ${trip.name}` : "Quản lý hành trình"
        }
        width={640}
        destroyOnClose
      >
        {isLoading ? (
          <div className="flex justify-center py-8">
            <Spin />
          </div>
        ) : (
          <div className="mt-4">
            {rounds.length === 0 && (
              <div className="text-center text-slate-400 py-6 text-sm">
                Chưa có điểm dừng nào. Bấm "Thêm điểm dừng" để bắt đầu.
              </div>
            )}

            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={rounds.map((r) => r.id)}
                strategy={verticalListSortingStrategy}
              >
                <div
                  className="space-y-2 overflow-y-auto pr-1 custom-scrollbar"
                  style={{ maxHeight: "calc(100vh - 280px)" }}
                >
                  {rounds.map((r) => (
                    <SortableRoundRow
                      key={r.id}
                      round={r}
                      onEdit={(round) => {
                        setEditingRound(round);
                        setShowForm(true);
                      }}
                      onDelete={(round) => deleteMutation.mutate(round.id)}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>

            {/* Save order bar — only appears when there are unsaved reorder changes */}
            <div
              className={`flex items-center gap-2 mt-3 overflow-hidden transition-all duration-200 ${
                hasOrderChange
                  ? "max-h-12 opacity-100"
                  : "max-h-0 opacity-0 pointer-events-none"
              }`}
            >
              <div className="flex-1 text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-md px-3 py-1.5">
                Thứ tự đã thay đổi — nhớ lưu lại nhé!
              </div>
              <Button size="small" onClick={handleResetOrder}>
                Hoàn tác
              </Button>
              <Button
                type="primary"
                size="small"
                loading={saveOrderMutation.isPending}
                onClick={() => saveOrderMutation.mutate()}
              >
                Lưu thứ tự
              </Button>
            </div>

            <Button
              type="dashed"
              block
              icon={<PlusOutlined />}
              className="mt-3"
              onClick={() => {
                setEditingRound(null);
                setShowForm(true);
              }}
            >
              Thêm điểm dừng
            </Button>
          </div>
        )}
      </Modal>

      <RoundFormModal
        open={showForm}
        onClose={() => {
          setShowForm(false);
          setEditingRound(null);
        }}
        onSubmit={handleFormSubmit}
        loading={createMutation.isPending || updateMutation.isPending}
        initialValues={editingRound || undefined}
      />
    </>
  );
}
