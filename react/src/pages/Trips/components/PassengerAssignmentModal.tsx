import React, { useEffect, useMemo, useState } from "react";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button, Card, Empty, List, Modal, Space, Spin, Tag, Typography, message } from "antd";

import {
  deletePassengerAssignment,
  getPassengerAssignments,
  getPassengers,
  upsertPassengerAssignment,
  type Passenger,
  type PassengerAssignment,
  type TripBus,
} from "../../../api/trips";

import { type EnrichedTrip } from "./types";

const { Text } = Typography;

type PassengerAssignmentModalProps = {
  trip: EnrichedTrip | null;
  open: boolean;
  onClose: () => void;
  busLabelMap: Map<string | number, string>;
};

export default function PassengerAssignmentModal({
  trip,
  open,
  onClose,
  busLabelMap,
}: PassengerAssignmentModalProps) {
  const queryClient = useQueryClient();
  const [selectedTripBusId, setSelectedTripBusId] = useState<string>();

  const busesForTrip = useMemo(() => trip?.buses ?? [], [trip]);

  useEffect(() => {
    if (!trip?.buses?.length) {
      setSelectedTripBusId(undefined);
      return;
    }
    setSelectedTripBusId(trip.buses[0].id);
  }, [trip]);

  const tripBusLabelMap = useMemo(() => {
    const map = new Map<string, string>();
    busesForTrip.forEach((tb) => {
      const label = busLabelMap.get(tb.bus) || `Bus ${tb.bus}`;
      map.set(tb.id, label);
    });
    return map;
  }, [busesForTrip, busLabelMap]);

  const { data: passengersResponse, isLoading } = useQuery({
    queryKey: ["passengers", { trip: trip?.id }],
    queryFn: () => getPassengers({ page: 1, limit: 1000, trip: trip?.id }),
    enabled: open && Boolean(trip?.id),
  });

  const { data: assignmentsResponse, isLoading: loadingAssignments } = useQuery({
    queryKey: ["passenger-assignments", trip?.id],
    queryFn: () => getPassengerAssignments({ trip: trip?.id }),
    enabled: open && Boolean(trip?.id),
  });

  const passengers = useMemo(
    () => (Array.isArray(passengersResponse?.data) ? passengersResponse.data : []),
    [passengersResponse],
  );

  const assignments = useMemo(
    () => (Array.isArray(assignmentsResponse) ? assignmentsResponse : []),
    [assignmentsResponse],
  );

  const assignmentByPassenger = useMemo(() => {
    const map = new Map<string, PassengerAssignment>();
    assignments.forEach((a) => map.set(a.passenger, a));
    return map;
  }, [assignments]);

  const selectedTripBus = useMemo(
    () => busesForTrip.find((b) => b.id === selectedTripBusId) || null,
    [busesForTrip, selectedTripBusId],
  );

  const assignedCounts = useMemo(() => {
    const map = new Map<string, number>();
    busesForTrip.forEach((b) => map.set(b.id, 0));
    assignments.forEach((a) => {
      if (map.has(a.trip_bus)) {
        map.set(a.trip_bus, (map.get(a.trip_bus) || 0) + 1);
      }
    });
    return map;
  }, [assignments, busesForTrip]);

  const passengersForSelected = useMemo(
    () =>
      passengers
        .filter((p) => {
          const assignment = assignmentByPassenger.get(p.id);
          return selectedTripBus ? assignment?.trip_bus === selectedTripBus.id : false;
        })
        .sort((a, b) => a.name.localeCompare(b.name)),
    [assignmentByPassenger, passengers, selectedTripBus],
  );

  const assignMutation = useMutation({
    mutationFn: async ({
      passenger,
      tripBus,
      assignmentId,
    }: {
      passenger: Passenger;
      tripBus: TripBus | null;
      assignmentId?: string;
    }) => {
      if (tripBus) {
        return upsertPassengerAssignment({
          passenger: passenger.id,
          trip_bus: tripBus.id,
        });
      }
      if (assignmentId) {
        return deletePassengerAssignment(assignmentId);
      }
      return Promise.resolve();
    },
    onSuccess: async () => {
      message.success("Đã cập nhật xe cho hành khách");
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["passengers"] }),
        queryClient.invalidateQueries({ queryKey: ["passenger-assignments"] }),
        queryClient.invalidateQueries({ queryKey: ["passengers", { trip: trip?.id }] }),
      ]);
    },
    onError: () => message.error("Cập nhật xe thất bại"),
  });

  const handleAssign = (passenger: Passenger, tripBus: TripBus | null) => {
    const assignment = assignmentByPassenger.get(passenger.id);
    assignMutation.mutate({ passenger, tripBus, assignmentId: assignment?.id });
  };

  return (
    <Modal
      open={open}
      onCancel={onClose}
      footer={null}
      width={1100}
      title={
        trip
          ? `Phân xe cho hành khách - ${trip.name}`
          : "Phân xe cho hành khách"
      }
      destroyOnClose
    >
      {isLoading || loadingAssignments ? (
        <div className="flex justify-center py-8">
          <Spin />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* ===== CỘT XE ===== */}
          <Card
            title="Xe của trip"
            className="h-full"
            styles={{ body: { padding: 12 } }}
          >
            {busesForTrip.length === 0 && (
              <Empty description="Chưa có xe cho trip" />
            )}

            <Space direction="vertical" className="w-full">
              {busesForTrip.map((tb) => {
                const isActive = tb.id === selectedTripBusId;
                const count = assignedCounts.get(tb.id) || 0;

                return (
                  <Button
                    key={tb.id}
                    block
                    type={isActive ? "primary" : "default"}
                    onClick={() => setSelectedTripBusId(tb.id)}
                  >
                    <Space>
                      <span>{tripBusLabelMap.get(tb.id) || "Bus"}</span>
                      <Tag color={isActive ? "gold" : "blue"}>
                        {count} hành khách
                      </Tag>
                    </Space>
                  </Button>
                );
              })}
            </Space>
          </Card>

          {/* ===== CỘT HÀNH KHÁCH THEO XE ===== */}
          <Card
            title={
              selectedTripBus
                ? `Hành khách của ${tripBusLabelMap.get(selectedTripBus.id)}`
                : "Chọn xe"
            }
            className="h-full"
            styles={{ body: { padding: 12, minHeight: 360 } }}
          >
            {!selectedTripBus && (
              <Empty description="Chọn xe để xem danh sách" />
            )}

            {selectedTripBus && passengersForSelected.length === 0 && (
              <Empty description="Chưa có hành khách" />
            )}

            {selectedTripBus && passengersForSelected.length > 0 && (
              <List
                dataSource={passengersForSelected}
                renderItem={(p) => (
                  <List.Item
                    actions={[
                      <Button
                        key="unassign"
                        danger
                        type="link"
                        size="small"
                        onClick={() => handleAssign(p, null)}
                        loading={assignMutation.isPending}
                      >
                        Bỏ gán
                      </Button>,
                    ]}
                  >
                    <List.Item.Meta
                      title={p.name}
                      description={
                        <Space size={8} wrap>
                          <Text type="secondary">{p.phone || "—"}</Text>
                          {p.note && <Tag color="default">{p.note}</Tag>}
                        </Space>
                      }
                    />
                  </List.Item>
                )}
              />
            )}
          </Card>

          {/* ===== CỘT TẤT CẢ HÀNH KHÁCH ===== */}
          <Card
            title={`Tất cả hành khách (${passengers.length})`}
            className="h-full"
            styles={{ body: { padding: 12, minHeight: 360 } }}
          >
            {passengers.length === 0 && (
              <Empty description="Chưa có hành khách" />
            )}

            {passengers.length > 0 && (
              <List
                dataSource={[...passengers].sort((a, b) =>
                  a.name.localeCompare(b.name),
                )}
                renderItem={(p) => {
                  const assignment = assignmentByPassenger.get(p.id);
                  const currentTripBusLabel = assignment
                    ? tripBusLabelMap.get(assignment.trip_bus)
                    : undefined;

                  const isInSelected =
                    selectedTripBus &&
                    assignment?.trip_bus === selectedTripBus.id;

                  return (
                    <List.Item
                      actions={[
                        <Button
                          key="assign"
                          type="primary"
                          ghost
                          size="small"
                          disabled={!selectedTripBus || isInSelected || undefined}
                          onClick={() => handleAssign(p, selectedTripBus)}
                          loading={assignMutation.isPending}
                        >
                          {isInSelected
                            ? "Đã ở xe này"
                            : "Gán vào xe đang chọn"}
                        </Button>,
                      ]}
                    >
                      <List.Item.Meta
                        title={p.name}
                        description={
                          <Space size={8} wrap>
                            <Text type="secondary">{p.phone || "—"}</Text>
                            {currentTripBusLabel ? (
                              <Tag color="processing">
                                {currentTripBusLabel}
                              </Tag>
                            ) : (
                              <Tag>Chưa gán xe</Tag>
                            )}
                          </Space>
                        }
                      />
                    </List.Item>
                  );
                }}
              />
            )}
          </Card>
        </div>
      )}
    </Modal>
  );

}
