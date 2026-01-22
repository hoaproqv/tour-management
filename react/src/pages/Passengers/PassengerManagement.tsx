import React, { useMemo, useState } from "react";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button, Form, Input, Select, Typography, message } from "antd";

import {
  createPassenger,
  deletePassenger,
  getBuses,
  getPassengers,
  getTripBuses,
  getTrips,
  updatePassenger,
  type BusItem,
  type Passenger,
  type PassengerPayload,
  type Trip,
  type TripBus,
} from "../../api/trips";
import { useGetAccountInfo } from "../../hooks/useAuth";
import { canManageCatalog } from "../../utils/helper";

import PassengerFormModal, {
  type PassengerFormValues,
} from "./components/PassengerFormModal";
import PassengerTable from "./components/PassengerTable";

import type { IUser } from "../../utils/types";

const { Title, Text } = Typography;

export default function PassengerManagement() {
  const [search, setSearch] = useState("");
  const [tripFilter, setTripFilter] = useState<string | "all">("all");
  const [showCreate, setShowCreate] = useState(false);
  const [editingPassenger, setEditingPassenger] = useState<Passenger | null>(
    null,
  );
  const [form] = Form.useForm<PassengerFormValues>();
  const queryClient = useQueryClient();
  const { data: accountInfo } = useGetAccountInfo();
  const currentUser = accountInfo as IUser | undefined;
  const canManage = canManageCatalog(currentUser);

  const { data: tripsResponse } = useQuery({
    queryKey: ["trips"],
    queryFn: () => getTrips({ page: 1, limit: 1000 }),
  });
  const { data: tripBusesAllResponse } = useQuery({
    queryKey: ["trip-buses", "all"],
    queryFn: () => getTripBuses({ page: 1, limit: 1000 }),
  });
  const { data: busesResponse } = useQuery({
    queryKey: ["buses"],
    queryFn: () => getBuses({ page: 1, limit: 1000 }),
  });
  const { data: passengersResponse, isLoading } = useQuery({
    queryKey: ["passengers"],
    queryFn: () => getPassengers({ page: 1, limit: 1000 }),
  });

  const trips = useMemo(
    () => (Array.isArray(tripsResponse?.data) ? tripsResponse.data : []),
    [tripsResponse],
  );

  const tripBuses = useMemo(
    () =>
      Array.isArray(tripBusesAllResponse?.data)
        ? tripBusesAllResponse.data
        : [],
    [tripBusesAllResponse],
  );

  const buses = useMemo(
    () => (Array.isArray(busesResponse?.data) ? busesResponse.data : []),
    [busesResponse],
  );

  const passengers = useMemo(
    () =>
      Array.isArray(passengersResponse?.data) ? passengersResponse.data : [],
    [passengersResponse],
  );

  const tripMap = useMemo(
    () =>
      new Map(
        (Array.isArray(trips) ? trips : []).map((t: Trip) => [t.id, t.name]),
      ),
    [trips],
  );

  const busMap = useMemo(
    () =>
      new Map(
        (Array.isArray(buses) ? buses : []).map((b: BusItem) => [
          b.id,
          b.registration_number || b.bus_code,
        ]),
      ),
    [buses],
  );

  const tripBusMap = useMemo(
    () =>
      new Map(
        (Array.isArray(tripBuses) ? tripBuses : []).map((tb: TripBus) => [
          tb.id,
          {
            ...tb,
            label: busMap.get(tb.bus) || "Bus",
          },
        ]),
      ),
    [tripBuses, busMap],
  );

  const filteredPassengers = useMemo(() => {
    const term = search.trim().toLowerCase();
    return (Array.isArray(passengers) ? passengers : []).filter((p) => {
      const matchTrip = tripFilter === "all" ? true : p.trip === tripFilter;
      const matchTerm = term
        ? p.name.toLowerCase().includes(term) ||
          p.phone.toLowerCase().includes(term) ||
          (p.note || "").toLowerCase().includes(term)
        : true;
      return matchTrip && matchTerm;
    });
  }, [passengers, search, tripFilter]);

  const createMutation = useMutation({
    mutationFn: (payload: PassengerPayload) => createPassenger(payload),
    onSuccess: async () => {
      message.success("Tạo passenger thành công");
      setShowCreate(false);
      form.resetFields();
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["passengers"] }),
        queryClient.invalidateQueries({ queryKey: ["trip-buses"] }),
      ]);
    },
    onError: () => message.error("Tạo passenger thất bại"),
  });

  const updateMutation = useMutation({
    mutationFn: (data: { id: string; payload: PassengerPayload }) =>
      updatePassenger(data.id, data.payload),
    onSuccess: async () => {
      message.success("Cập nhật passenger thành công");
      setEditingPassenger(null);
      form.resetFields();
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["passengers"] }),
        queryClient.invalidateQueries({ queryKey: ["trip-buses"] }),
      ]);
    },
    onError: () => message.error("Cập nhật passenger thất bại"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deletePassenger(id),
    onSuccess: async () => {
      message.success("Xóa passenger thành công");
      await queryClient.invalidateQueries({ queryKey: ["passengers"] });
    },
    onError: () => message.error("Xóa passenger thất bại"),
  });

  const openCreate = () => {
    if (!canManage) {
      message.warning("Bạn không có quyền chỉnh sửa passenger");
      return;
    }
    setEditingPassenger(null);
    form.resetFields();
    setShowCreate(true);
  };

  const openEdit = (passenger: Passenger) => {
    if (!canManage) {
      message.warning("Bạn không có quyền chỉnh sửa passenger");
      return;
    }
    setEditingPassenger(passenger);
    form.setFieldsValue({
      trip: passenger.trip,
      name: passenger.name,
      phone: passenger.phone,
      note: passenger.note,
    });
    setShowCreate(true);
  };

  const handleSubmit = () => {
    form
      .validateFields()
      .then(() => {
        const values = form.getFieldsValue(true) as PassengerFormValues;

        const payload: PassengerPayload = {
          trip: values.trip,
          name: values.name,
          phone: values.phone || "",
          note: values.note || "",
        };
        if (editingPassenger) {
          updateMutation.mutate({ id: editingPassenger.id, payload });
        } else {
          createMutation.mutate(payload);
        }
        handleCancel();
      })
      .catch(() => undefined);
  };

  const handleCancel = () => {
    setShowCreate(false);
    setEditingPassenger(null);
  };

  return (
    <div className="w-full bg-[#f4f7fb] min-h-screen py-6">
      <div className="bg-white shadow-sm rounded-2xl p-6 border border-slate-100">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <p className="text-sm uppercase tracking-[0.25em] text-sky-700 font-semibold">
              Passenger Management
            </p>
            <Title level={2} style={{ margin: 0 }}>
              Quản lý Passenger
            </Title>
            <Text type="secondary">
              Danh sách hành khách theo trip và xe gốc.
            </Text>
          </div>
          <div className="flex flex-col md:flex-row gap-2 md:items-center">
            <Input
              allowClear
              placeholder="Tìm theo tên / số điện thoại / ghi chú"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full md:w-80"
            />
            <Select
              value={tripFilter}
              onChange={(val) => setTripFilter(val)}
              className="w-full md:w-56"
              options={[
                { value: "all", label: "Tất cả trip" },
                ...(Array.isArray(trips) ? trips : []).map((t: Trip) => ({
                  value: t.id,
                  label: t.name,
                })),
              ]}
            />
            {canManage && (
              <Button type="primary" onClick={openCreate}>
                + New Passenger
              </Button>
            )}
          </div>
        </div>
        <PassengerTable
          data={filteredPassengers}
          isLoading={isLoading}
          deleting={deleteMutation.status === "pending"}
          tripMap={tripMap}
          tripBusMap={tripBusMap}
          canManage={canManage}
          onDelete={(id) => deleteMutation.mutate(id)}
          onEdit={openEdit}
        />
      </div>

      <PassengerFormModal
        open={showCreate}
        onCancel={handleCancel}
        onSubmit={handleSubmit}
        confirmLoading={
          createMutation.status === "pending" ||
          updateMutation.status === "pending"
        }
        form={form}
        trips={trips}
        editingPassenger={editingPassenger}
      />
    </div>
  );
}
