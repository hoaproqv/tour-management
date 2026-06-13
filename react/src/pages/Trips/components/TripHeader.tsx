import React from "react";

import { DeleteOutlined } from "@ant-design/icons";
import { Button, Input, Select, Typography } from "antd";

import type { Trip } from "../../../api/trips";

type StatusFilter = Trip["status"] | "all";

interface TripHeaderProps {
  search: string;
  statusFilter: StatusFilter;
  onSearchChange: (_value: string) => void;
  onStatusChange: (_value: StatusFilter) => void;
  onCreate: () => void;
  canCreate?: boolean;
  statusMeta: Record<Trip["status"], { label: string; color: string }>;
  selectedRowKeys?: React.Key[];
  onBulkDelete?: () => void;
  isSelectionMode?: boolean;
  onSelectionModeChange?: (_val: boolean) => void;
}

export default function TripHeader({
  search,
  statusFilter,
  onSearchChange,
  onStatusChange,
  onCreate,
  canCreate = true,
  statusMeta,
  selectedRowKeys = [],
  onBulkDelete,
  isSelectionMode,
  onSelectionModeChange,
}: TripHeaderProps) {
  const { Title, Text } = Typography;

  return (
    <div className="mb-4">
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 mb-2">
        <div className="flex-1 min-w-[250px] pr-4">
          <p className="text-sm uppercase tracking-[0.25em] text-sky-700 font-semibold">
            TRIP MANAGEMENT
          </p>
          <Title level={2} style={{ margin: 0 }}>
            Quản lý Chuyến đi
          </Title>
          <Text type="secondary">
            Cập nhật trạng thái và điều phối nhân sự, phương tiện cho Chuyến đi.
          </Text>
        </div>
        <div className="flex flex-col gap-3 items-end w-full xl:w-auto">
          <div className="flex flex-wrap items-center gap-3">
            <Input
              allowClear
              placeholder="Tìm theo tên hoặc mô tả"
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full sm:w-64"
            />
            <Select
              value={statusFilter}
              onChange={(val) => onStatusChange(val)}
              className="w-full sm:w-48"
              options={[
                { value: "all", label: "Tất cả trạng thái" },
                ...Object.entries(statusMeta).map(([value, meta]) => ({
                  value,
                  label: meta.label,
                })),
              ]}
            />
            {canCreate && (
              <Button type="primary" onClick={onCreate}>
                + Tạo chuyến đi
              </Button>
            )}
          </div>
        </div>
      </div>
      
      {canCreate && (
        <div className="flex justify-end mt-4">
          {isSelectionMode ? (
            <div className="flex gap-2">
              <Button
                onClick={() => {
                  if (onSelectionModeChange) onSelectionModeChange(false);
                }}
              >
                Hủy
              </Button>
              {selectedRowKeys.length > 0 && onBulkDelete && (
                <Button
                  danger
                  icon={<DeleteOutlined />}
                  onClick={onBulkDelete}
                >
                  Xóa đã chọn ({selectedRowKeys.length})
                </Button>
              )}
            </div>
          ) : (
            <Button danger onClick={() => {
              if (onSelectionModeChange) onSelectionModeChange(true);
            }}>
              Xóa nhiều
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
