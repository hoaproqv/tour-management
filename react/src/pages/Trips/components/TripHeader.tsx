import React from "react";

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
}

export default function TripHeader({
  search,
  statusFilter,
  onSearchChange,
  onStatusChange,
  onCreate,
  canCreate = true,
  statusMeta,
}: TripHeaderProps) {
  const { Title, Text } = Typography;

  return (
    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
      <div>
        <p className="text-sm uppercase tracking-[0.25em] text-sky-700 font-semibold">
          Trip Management
        </p>
        <Title level={2} style={{ margin: 0 }}>
          Quản lý Trip
        </Title>
        <Text type="secondary">
          Lọc, thống kê và xem các round / bus liên quan cho từng trip.
        </Text>
      </div>
      <div className="flex flex-col md:flex-row gap-2 md:items-center">
        <Input
          allowClear
          placeholder="Tìm theo tên hoặc mô tả"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full md:w-64"
        />
        <Select
          value={statusFilter}
          onChange={onStatusChange}
          className="w-full md:w-48"
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
            + New Trip
          </Button>
        )}
      </div>
    </div>
  );
}
