import React, { useState } from "react";

import { CheckCircleOutlined, ClockCircleOutlined } from "@ant-design/icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Alert,
  Button,
  Card,
  Select,
  Space,
  Spin,
  Table,
  Tag,
  Typography,
  message,
} from "antd";

import {
  getBuses,
  getImportedBuses,
  mapImportedBus,
  type BusItem,
  type ImportedBus,
} from "../../../api/trips";
import { useGetAccountInfo } from "../../../hooks/useAuth";

import type { IUser } from "../../../utils/types";

const { Text, Title } = Typography;

interface Props {
  tripId: string;
  tripName?: string;
  readOnly?: boolean;
  onDone?: () => void;
}

export default function ImportedBusMapper({
  tripId,
  tripName,
  readOnly = false,
  onDone,
}: Props) {
  const queryClient = useQueryClient();
  const [selections, setSelections] = useState<
    Record<string, { busId?: string; managerId?: string }>
  >({});

  const { data: accountInfo } = useGetAccountInfo();
  const currentUser = accountInfo as IUser | undefined;

  const { data: importedBuses = [], isLoading } = useQuery({
    queryKey: ["imported-buses", tripId],
    queryFn: () => getImportedBuses(tripId),
    enabled: Boolean(tripId),
  });

  const { data: busesResponse } = useQuery({
    queryKey: ["buses"],
    queryFn: () => getBuses({ page: 1, limit: 1000 }),
  });
  const buses = React.useMemo(
    () => (Array.isArray(busesResponse?.data) ? busesResponse.data : []),
    [busesResponse],
  );

  const mapMutation = useMutation({
    mutationFn: ({
      id,
      busId,
      managerId,
    }: {
      id: string;
      busId: string;
      managerId: string;
    }) => mapImportedBus(id, { bus_id: busId, manager_id: managerId }),
    onSuccess: async () => {
      message.success("Đã gán xe thành công");
      await queryClient.invalidateQueries({
        queryKey: ["imported-buses", tripId],
      });
      await queryClient.invalidateQueries({ queryKey: ["trip-buses"] });
      await queryClient.invalidateQueries({ queryKey: ["passengers"] });
    },
    onError: (err: unknown) => {
      const m = err instanceof Error ? err.message : "Gán xe thất bại";
      message.error(m);
    },
  });

  const handleMap = (ib: ImportedBus) => {
    const sel = selections[ib.id] || {};
    const busId = sel.busId;
    const managerId =
      sel.managerId || (currentUser ? String(currentUser.id) : undefined);
    if (!busId) {
      message.warning("Vui lòng chọn xe");
      return;
    }
    if (!managerId) {
      message.warning("Không xác định được người quản lý");
      return;
    }
    mapMutation.mutate({ id: ib.id, busId, managerId });
  };

  const unmappedCount = importedBuses.filter((b) => !b.is_mapped).length;
  const allMapped = unmappedCount === 0 && importedBuses.length > 0;

  const columns = [
    {
      title: "Sheet (Xe từ file)",
      dataIndex: "sheet_name",
      render: (name: string, record: ImportedBus) => (
        <Space>
          <Text strong>{name}</Text>
          <Tag color="blue">Thứ tự {record.sequence}</Tag>
          <Tag>{record.passenger_count} khách</Tag>
        </Space>
      ),
    },
    {
      title: "Trạng thái",
      dataIndex: "is_mapped",
      width: 120,
      render: (mapped: boolean) =>
        mapped ? (
          <Tag icon={<CheckCircleOutlined />} color="success">
            Đã gán
          </Tag>
        ) : (
          <Tag icon={<ClockCircleOutlined />} color="warning">
            Chờ gán
          </Tag>
        ),
    },
    {
      title: "Xe thực tế (chọn từ DB)",
      key: "bus_select",
      width: 260,
      render: (_: unknown, record: ImportedBus) => {
        const busId = record.mapped_bus;
        const bus = buses.find((b: BusItem) => String(b.id) === String(busId));
        if (record.is_mapped || readOnly) {
          return (
            <Text type={record.is_mapped ? "secondary" : undefined}>
              {bus ? (
                `${bus.registration_number} (${bus.capacity} chỗ)`
              ) : busId ? (
                `Bus #${busId}`
              ) : (
                <Text type="secondary">Chưa gán</Text>
              )}
            </Text>
          );
        }
        return (
          <Select
            showSearch
            optionFilterProp="label"
            placeholder="Chọn xe..."
            className="w-full"
            value={selections[record.id]?.busId}
            onChange={(v) =>
              setSelections((prev) => ({
                ...prev,
                [record.id]: { ...prev[record.id], busId: v },
              }))
            }
            options={buses.map((b: BusItem) => ({
              value: String(b.id),
              label: `${b.registration_number} — ${b.bus_code} (${b.capacity} chỗ)`,
            }))}
          />
        );
      },
    },
    {
      title: "",
      key: "action",
      width: 100,
      render: (_: unknown, record: ImportedBus) => {
        if (record.is_mapped || readOnly) return null;
        return (
          <Button
            type="primary"
            size="small"
            loading={mapMutation.isPending}
            onClick={() => handleMap(record)}
          >
            Gán xe
          </Button>
        );
      },
    },
  ];

  if (isLoading) return <Spin className="block mx-auto mt-6" />;
  if (importedBuses.length === 0) return null;

  return (
    <Card
      className="mt-6 border-amber-300"
      styles={{ header: { background: "#fffbeb" } }}
      title={
        <Space>
          <Title level={5} style={{ margin: 0 }}>
            Gán xe thực tế cho các xe từ file import
          </Title>
          {tripName && <Tag color="blue">{tripName}</Tag>}
          {allMapped ? (
            <Tag color="success">Tất cả đã gán ✓</Tag>
          ) : (
            <Tag color="warning">{unmappedCount} xe chờ gán</Tag>
          )}
        </Space>
      }
      extra={
        onDone && allMapped ? (
          <Button type="primary" size="small" onClick={onDone}>
            Hoàn tất
          </Button>
        ) : null
      }
    >
      {readOnly ? (
        <Alert
          type="warning"
          showIcon
          className="mb-4"
          message="Tour đã bắt đầu — không thể thay đổi gán xe."
        />
      ) : !allMapped ? (
        <Alert
          type="info"
          showIcon
          className="mb-4"
          message="Chọn xe thực tế (biển số) cho từng xe được import từ file Excel. Sau khi gán, hành khách sẽ được phân vào xe đó."
        />
      ) : null}

      <Table
        rowKey="id"
        dataSource={importedBuses}
        columns={columns}
        pagination={false}
        size="small"
      />
    </Card>
  );
}
