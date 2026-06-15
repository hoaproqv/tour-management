import React, { useState } from "react";

import { CheckCircleOutlined, ClockCircleOutlined, EditOutlined, SaveOutlined } from "@ant-design/icons";
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
  getTripBuses,
  getImportedBuses,
  mapImportedBus,
  type ImportedBus,
} from "../../../api/trips";

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
  const [isEditing, setIsEditing] = useState(false);
  const [selections, setSelections] = useState<
    Record<string, { tripBusId?: string }>
  >({});

  const { data: importedBuses = [], isLoading } = useQuery({
    queryKey: ["imported-buses", tripId],
    queryFn: () => getImportedBuses(tripId),
    enabled: Boolean(tripId),
  });

  const { data: tripBusesResponse } = useQuery({
    queryKey: ["trip-buses", { trip: tripId }],
    queryFn: () => getTripBuses({ trip: tripId, page: 1, limit: 1000 }),
    enabled: Boolean(tripId),
  });
  const tripBuses = React.useMemo(
    () => (Array.isArray(tripBusesResponse?.data) ? tripBusesResponse.data : []),
    [tripBusesResponse],
  );

  const bulkMapMutation = useMutation({
    mutationFn: async () => {
      const promises = [];
      for (const ib of importedBuses) {
        const sel = selections[ib.id] || {};
        const tripBusId = sel.tripBusId;
        
        if (tripBusId && String(tripBusId) !== String(ib.mapped_trip_bus)) {
          promises.push(mapImportedBus(ib.id, { trip_bus_id: tripBusId }));
        }
      }
      if (promises.length === 0) return Promise.resolve();
      return Promise.all(promises);
    },
    onSuccess: async () => {
      message.success("Đã gán xe thành công");
      setIsEditing(false);
      await queryClient.invalidateQueries({
        queryKey: ["imported-buses", tripId],
      });
      await queryClient.invalidateQueries({ queryKey: ["trip-buses"] });
      await queryClient.invalidateQueries({ queryKey: ["passengers"] });
      if (onDone) onDone();
    },
    onError: (err: unknown) => {
      const m = err instanceof Error ? err.message : "Gán xe thất bại";
      message.error(m);
    },
  });

  const handleSave = () => {
    // Validate capacities
    for (const ib of importedBuses) {
      const sel = selections[ib.id] || {};
      const tripBusId = sel.tripBusId;
      if (tripBusId && String(tripBusId) !== String(ib.mapped_trip_bus)) {
        const selectedTripBus = tripBuses.find((tb) => String(tb.id) === String(tripBusId));
        if (selectedTripBus && (selectedTripBus.capacity || 0) < ib.passenger_count) {
          message.error(`Sức chứa của xe ${selectedTripBus.registration_number || selectedTripBus.bus_code} (${selectedTripBus.capacity}) không đủ cho ${ib.sheet_name} (${ib.passenger_count} khách)`);
          return;
        }
      }
    }
    bulkMapMutation.mutate();
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
      title: "Xe khách trong chuyến đi",
      key: "tripBusId",
      width: 300,
      render: (_: unknown, record: ImportedBus) => {
        const currentMappedTripBusId = record.mapped_trip_bus;
        const currentMappedTripBus = tripBuses.find((tb) => String(tb.id) === String(currentMappedTripBusId));
        
        if (!isEditing || readOnly) {
          return (
            <Text type={record.is_mapped ? "secondary" : undefined}>
              {currentMappedTripBus ? (
                `${currentMappedTripBus.registration_number || currentMappedTripBus.bus_code} (${currentMappedTripBus.capacity || 0} chỗ)`
              ) : currentMappedTripBusId ? (
                `Bus #${currentMappedTripBusId}`
              ) : (
                <Text type="secondary">Chưa gán</Text>
              )}
            </Text>
          );
        }

        const selectedTripBusId = selections[record.id] !== undefined ? selections[record.id].tripBusId : (currentMappedTripBusId ? String(currentMappedTripBusId) : undefined);

        // Compute which buses are used by other rows
        const usedByOthers = new Set<string>();
        importedBuses.forEach((ib) => {
          if (ib.id !== record.id) {
            const ibSelected = selections[ib.id] !== undefined ? selections[ib.id].tripBusId : (ib.mapped_trip_bus ? String(ib.mapped_trip_bus) : undefined);
            if (ibSelected) {
              usedByOthers.add(ibSelected);
            }
          }
        });

        return (
          <Select
            showSearch
            allowClear
            optionFilterProp="label"
            placeholder="Chọn xe..."
            className="w-full"
            value={selectedTripBusId}
            onChange={(v) =>
              setSelections((prev) => ({
                ...prev,
                [record.id]: { ...prev[record.id], tripBusId: v },
              }))
            }
            options={tripBuses.map((tb) => {
              const tbId = String(tb.id);
              const isUsed = usedByOthers.has(tbId);
              const capacityFull = (tb.capacity || 0) < record.passenger_count;
              return {
                value: tbId,
                label: `${tb.registration_number || tb.bus_code} (${tb.capacity || 0} chỗ)`,
                disabled: isUsed || capacityFull,
              };
            })}
          />
        );
      },
    },
  ];

  if (isLoading) return <Spin className="block mx-auto mt-6" />;
  if (importedBuses.length === 0) return null;

  return (
    <Card
      className="border-amber-300"
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
        !readOnly && (
          <Space>
            {isEditing ? (
              <>
                <Button onClick={() => setIsEditing(false)}>Hủy</Button>
                <Button
                  type="primary"
                  icon={<SaveOutlined />}
                  loading={bulkMapMutation.isPending}
                  onClick={handleSave}
                >
                  Hoàn tất
                </Button>
              </>
            ) : (
              <Button type="primary" icon={<EditOutlined />} onClick={() => setIsEditing(true)}>
                Sửa
              </Button>
            )}
          </Space>
        )
      }
    >
      {readOnly ? (
        <Alert
          type="warning"
          showIcon
          className="mb-4"
          message="Chuyến đi đã bắt đầu — không thể thay đổi gán xe."
        />
      ) : isEditing ? (
        <Alert
          type="info"
          showIcon
          className="mb-4"
          message="Chọn xe khách trong chuyến đi cho từng nhóm khách từ file Excel. Sau khi gán, hành khách sẽ được phân vào xe đó. Bấm Hoàn tất để lưu."
        />
      ) : null}

      <Table scroll={{ x: "max-content" }}
        rowKey="id"
        dataSource={importedBuses}
        columns={columns}
        pagination={false}
        size="small"
      />
    </Card>
  );
}
