import React, { useEffect, useMemo, useState } from "react";

import { SearchOutlined, MinusCircleOutlined, SwapRightOutlined } from "@ant-design/icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button, Card, Empty, List, Modal, Space, Spin, Tag, message, Input } from "antd";

function removeVietnameseTones(str: string) {
  if (!str) return "";
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase();
}

function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);
    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);
  return debouncedValue;
}

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
  
  const [searchBus, setSearchBus] = useState("");
  const [searchAssigned, setSearchAssigned] = useState("");
  const [searchAll, setSearchAll] = useState("");

  const debouncedSearchBus = useDebounce(searchBus, 300);
  const debouncedSearchAssigned = useDebounce(searchAssigned, 300);
  const debouncedSearchAll = useDebounce(searchAll, 300);

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

  const filteredBuses = useMemo(() => {
    if (!debouncedSearchBus) return busesForTrip;
    const lowerSearch = removeVietnameseTones(debouncedSearchBus);
    return busesForTrip.filter(tb => {
      const label = tripBusLabelMap.get(tb.id) || "";
      return removeVietnameseTones(label).includes(lowerSearch);
    });
  }, [busesForTrip, debouncedSearchBus, tripBusLabelMap]);

  const passengersForSelected = useMemo(() => {
    let list = passengers
      .filter((p) => {
        const assignment = assignmentByPassenger.get(p.id);
        return selectedTripBus ? assignment?.trip_bus === selectedTripBus.id : false;
      });
    
    if (debouncedSearchAssigned) {
      const lowerSearch = removeVietnameseTones(debouncedSearchAssigned);
      list = list.filter(p => 
        removeVietnameseTones(p.name).includes(lowerSearch) || 
        removeVietnameseTones(p.phone || "").includes(lowerSearch)
      );
    }
    return list.sort((a, b) => a.name.localeCompare(b.name));
  }, [assignmentByPassenger, passengers, selectedTripBus, debouncedSearchAssigned]);

  const filteredAllPassengers = useMemo(() => {
    let list = [...passengers];
    if (debouncedSearchAll) {
      const lowerSearch = removeVietnameseTones(debouncedSearchAll);
      list = list.filter(p => 
        removeVietnameseTones(p.name).includes(lowerSearch) || 
        removeVietnameseTones(p.phone || "").includes(lowerSearch)
      );
    }
    return list.sort((a, b) => a.name.localeCompare(b.name));
  }, [passengers, debouncedSearchAll]);

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
            extra={
              <Input
                placeholder="Tìm xe..."
                prefix={<SearchOutlined className="text-gray-400" />}
                value={searchBus}
                onChange={(e) => setSearchBus(e.target.value)}
                size="small"
                style={{ width: 140 }}
                allowClear
              />
            }
          >
            {filteredBuses.length === 0 && (
              <Empty description="Không tìm thấy xe" />
            )}

            <Space direction="vertical" className="w-full">
              {filteredBuses.map((tb) => {
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
                ? `Khách của ${tripBusLabelMap.get(selectedTripBus.id)}`
                : "Chọn xe"
            }
            className="h-full flex flex-col"
            styles={{ body: { padding: 0, minHeight: 360, flex: 1, display: 'flex', flexDirection: 'column' }, header: { padding: '0 12px' } }}
            extra={
              <Input
                placeholder="Tìm khách..."
                prefix={<SearchOutlined className="text-gray-400" />}
                value={searchAssigned}
                onChange={(e) => setSearchAssigned(e.target.value)}
                size="small"
                style={{ width: 140 }}
                allowClear
                disabled={!selectedTripBus}
              />
            }
          >
            <div className="flex-1 overflow-y-auto p-3 custom-scrollbar" style={{ maxHeight: 'calc(100vh - 250px)' }}>
              {!selectedTripBus && (
                <Empty description="Chọn xe để xem danh sách" className="mt-8" />
              )}

              {selectedTripBus && passengersForSelected.length === 0 && (
                <Empty description="Không tìm thấy hành khách" className="mt-8" />
              )}

              {selectedTripBus && passengersForSelected.length > 0 && (
                <List
                  dataSource={passengersForSelected}
                  split={false}
                  renderItem={(p) => (
                    <List.Item className="!p-0 !mb-1.5 border border-slate-100 rounded-md overflow-hidden bg-slate-50">
                      <div className="flex justify-between items-center w-full px-2 py-1.5">
                        <div className="flex items-center gap-2 min-w-0 flex-1 pr-2">
                          <span className="font-medium text-[13px] leading-snug truncate text-slate-800">{p.name}</span>
                          {p.phone && <span className="text-[12px] text-slate-500 shrink-0 whitespace-nowrap">- {p.phone}</span>}
                          {p.note && <Tag className="!m-0 !text-[10px] !leading-3 border-transparent bg-slate-200 text-slate-600 shrink-0" color="default">{p.note}</Tag>}
                        </div>
                        <Button
                          danger
                          type="text"
                          size="small"
                          className="flex-shrink-0 ml-1"
                          icon={<MinusCircleOutlined />}
                          onClick={() => handleAssign(p, null)}
                          loading={assignMutation.isPending}
                          title="Bỏ gán khỏi xe này"
                        />
                      </div>
                    </List.Item>
                  )}
                />
              )}
            </div>
          </Card>

          {/* ===== CỘT TẤT CẢ HÀNH KHÁCH ===== */}
          <Card
            title={`Tất cả hành khách (${passengers.length})`}
            className="h-full flex flex-col"
            styles={{ body: { padding: 0, minHeight: 360, flex: 1, display: 'flex', flexDirection: 'column' }, header: { padding: '0 12px' } }}
            extra={
              <Input
                placeholder="Tìm khách..."
                prefix={<SearchOutlined className="text-gray-400" />}
                value={searchAll}
                onChange={(e) => setSearchAll(e.target.value)}
                size="small"
                style={{ width: 140 }}
                allowClear
              />
            }
          >
            <div className="flex-1 overflow-y-auto p-3 custom-scrollbar" style={{ maxHeight: 'calc(100vh - 250px)' }}>
              {filteredAllPassengers.length === 0 && (
                <Empty description="Không tìm thấy hành khách" className="mt-8" />
              )}

              {filteredAllPassengers.length > 0 && (
                <List
                  dataSource={filteredAllPassengers}
                  split={false}
                  renderItem={(p) => {
                    const assignment = assignmentByPassenger.get(p.id);
                    const currentTripBusLabel = assignment
                      ? tripBusLabelMap.get(assignment.trip_bus)
                      : undefined;

                    const isInSelected =
                      selectedTripBus &&
                      assignment?.trip_bus === selectedTripBus.id;

                    const selectedLabel = selectedTripBus ? tripBusLabelMap.get(selectedTripBus.id) : '';

                    return (
                      <List.Item className="!p-0 !mb-1.5 border border-slate-100 rounded-md overflow-hidden">
                        <div className="flex flex-col w-full">
                          {/* Info Row */}
                          <div className="w-full px-2 py-1 bg-white">
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="font-medium text-[13px] leading-snug truncate text-slate-800">{p.name}</span>
                              {p.phone && <span className="text-[12px] text-slate-500 shrink-0 whitespace-nowrap">- {p.phone}</span>}
                            </div>
                          </div>
                          
                          {/* Action Row */}
                          <div className="w-full bg-slate-50 border-t border-slate-100 px-2 py-1 flex justify-between items-center">
                            <div className="shrink-0 pr-2">
                              {currentTripBusLabel ? (
                                <Tag color="processing" className="!m-0 text-[10px] leading-[14px] px-1 border-blue-200">
                                  {currentTripBusLabel}
                                </Tag>
                              ) : (
                                <Tag className="!m-0 text-[10px] leading-[14px] px-1 text-slate-400 bg-slate-50 border-slate-200">Chưa gán</Tag>
                              )}
                            </div>
                            <Button
                              type="primary"
                              ghost
                              size="small"
                              className="text-[11px] h-[22px] px-2 py-0"
                              icon={!isInSelected && <SwapRightOutlined className="text-[10px]" />}
                              disabled={!selectedTripBus || isInSelected || undefined}
                              onClick={() => handleAssign(p, selectedTripBus)}
                              loading={assignMutation.isPending}
                            >
                              {isInSelected
                                ? "Đã ở xe này"
                                : `Gán vào ${selectedLabel || 'xe'}`}
                            </Button>
                          </div>
                        </div>
                      </List.Item>
                    );
                  }}
                />
              )}
            </div>
          </Card>
        </div>
      )}
    </Modal>
  );

}
