import React, { useMemo } from "react";

import { EditOutlined, DeleteOutlined } from "@ant-design/icons";
import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { restrictToVerticalAxis } from "@dnd-kit/modifiers";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { Table, Tag, Tooltip, Space, Button, Popconfirm, Empty } from "antd";

import { statusMeta } from "../utils/constants";

import { SortableRow, RoundContext } from "./SortableRow";

import type { RoundItem } from "../../../api/trips";
import type { DragEndEvent } from "@dnd-kit/core";

interface RoundTableProps {
  rounds: RoundItem[];
  isLoading: boolean;
  canManage: boolean;
  isEditing: boolean;
  isSelectionMode: boolean;
  selectedRowKeys: React.Key[];
  setSelectedRowKeys: (_keys: React.Key[]) => void;
  onEdit: (_round: RoundItem) => void;
  onDelete: (_id: string) => void;
  deleteStatus: "idle" | "pending" | "error" | "success";
  onDragEnd: (_event: DragEndEvent) => void;
  emptyDescription: string;
}

export const RoundTable: React.FC<RoundTableProps> = ({
  rounds,
  isLoading,
  canManage,
  isEditing,
  isSelectionMode,
  selectedRowKeys,
  setSelectedRowKeys,
  onEdit,
  onDelete,
  deleteStatus,
  onDragEnd,
  emptyDescription,
}) => {
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
  );

  const columns = useMemo(() => {
    const base = [
      ...(canManage && isEditing
        ? [
            {
              title: "Sắp xếp",
              key: "drag-handle",
              width: 60,
              align: "center" as const,
              render: () => null,
            },
          ]
        : []),
      {
        title: "Thứ tự",
        width: 60,
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
        width: 80,
        align: "center" as const,
        render: (_: any, record: RoundItem) => {
          if (!record.estimate_time) return "—";
          return record.estimate_time.slice(0, 5);
        },
      },
      {
        title: "Thực tế",
        dataIndex: "actual_time",
        width: 80,
        align: "center" as const,
        render: (_: any, record: RoundItem) => {
          if (!record.actual_time) return "—";
          return record.actual_time.slice(0, 5);
        },
      },
      {
        title: "Trạng thái",
        dataIndex: "status",
        width: 130,
        align: "center" as const,
        render: (val: RoundItem["status"]) => {
          const meta = statusMeta[val];
          return <Tag color={meta.color}>{meta.label}</Tag>;
        },
      },
    ];

    if (!canManage || !isEditing) return base;

    return [
      ...base,
      {
        title: "Thao tác",
        dataIndex: "actions",
        width: 100,
        align: "center" as const,
        render: (_: unknown, record: RoundItem) => {
          const isPlanned = record.status === "planned";
          return (
            <Space>
              <Tooltip
                title={
                  isPlanned ? "Sửa" : "Không thể sửa chặng đã đến hoặc đang đến"
                }
              >
                <Button
                  type="text"
                  icon={<EditOutlined />}
                  onClick={() => onEdit(record)}
                  className="text-sky-600 hover:text-sky-700"
                  disabled={!isPlanned}
                />
              </Tooltip>
              {record.sequence > 1 && (
                <Popconfirm
                  title="Bạn có chắc chắn muốn xóa chặng này?"
                  onConfirm={() => onDelete(String(record.id))}
                  okText="Xóa"
                  cancelText="Hủy"
                  disabled={!isPlanned}
                >
                  <Tooltip
                    title={
                      isPlanned
                        ? "Xóa"
                        : "Không thể xóa chặng đã đến hoặc đang đến"
                    }
                  >
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
  }, [canManage, isEditing, onEdit, onDelete, deleteStatus]);

  return (
    <DndContext
      sensors={sensors}
      modifiers={[restrictToVerticalAxis]}
      onDragEnd={onDragEnd}
    >
      <SortableContext
        items={rounds.map((r) => String(r.id))}
        strategy={verticalListSortingStrategy}
      >
        <RoundContext.Provider value={rounds}>
          <Table
            components={
              canManage && isEditing
                ? { body: { row: SortableRow } }
                : undefined
            }
            rowKey={(record) => String(record.id)}
            dataSource={rounds}
            columns={columns}
            loading={isLoading}
            size="small"
            pagination={false}
            rowSelection={
              isSelectionMode
                ? {
                    selectedRowKeys,
                    onChange: (newSelectedRowKeys) =>
                      setSelectedRowKeys(newSelectedRowKeys),
                    getCheckboxProps: (record) => ({
                      disabled:
                        record.status !== "planned" || record.sequence === 1,
                    }),
                  }
                : undefined
            }
            locale={{
              emptyText: isLoading ? (
                <span>Đang tải...</span>
              ) : (
                <Empty description={emptyDescription} />
              ),
            }}
          />
        </RoundContext.Provider>
      </SortableContext>
    </DndContext>
  );
};
