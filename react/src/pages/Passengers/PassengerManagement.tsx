import React, { useMemo, useState } from "react";

import { DownloadOutlined, UploadOutlined } from "@ant-design/icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button, Form, Input, Select, Typography, message } from "antd";

import {
  createPassenger,
  deletePassenger,
  exportPassengers,
  getBuses,
  getImportedBuses,
  getPassengers,
  getTripBuses,
  getTrips,
  updatePassenger,
  type BusItem,
  type ImportPassengerResult,
  type Passenger,
  type PassengerPayload,
  type Trip,
  type TripBus,
} from "../../api/trips";
import { useGetAccountInfo } from "../../hooks/useAuth";
import { canManageCatalog } from "../../utils/helper";

import ImportedBusMapper from "./components/ImportedBusMapper";
import ImportPassengerModal from "./components/ImportPassengerModal";
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
  const [showImport, setShowImport] = useState(false);
  const [importResult, setImportResult] =
    useState<ImportPassengerResult | null>(null);
  const [editingPassenger, setEditingPassenger] = useState<Passenger | null>(
    null,
  );
  const [exportLoading, setExportLoading] = useState(false);
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
    queryKey: ["passengers", tripFilter],
    queryFn: () =>
      getPassengers({
        page: 1,
        limit: 1000,
        ...(tripFilter !== "all" ? { trip: tripFilter } : {}),
      }),
    enabled: tripFilter === "all" || Boolean(tripFilter),
  });

  // Always fetch imported buses for the selected trip so the mapper persists on reload
  const { data: importedBusesForTrip = [] } = useQuery({
    queryKey: ["imported-buses", tripFilter],
    queryFn: () => getImportedBuses(tripFilter as string),
    enabled: tripFilter !== "all",
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

  // Current selected trip (for status check)
  const selectedTrip = useMemo(
    () =>
      tripFilter !== "all"
        ? trips.find((t) => String(t.id) === String(tripFilter))
        : undefined,
    [trips, tripFilter],
  );
  const tripIsActive =
    selectedTrip?.status === "doing" || selectedTrip?.status === "done";

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
      if (!term) return true;
      return (
        p.name.toLowerCase().includes(term) ||
        p.phone.toLowerCase().includes(term) ||
        (p.note || "").toLowerCase().includes(term)
      );
    });
  }, [passengers, search]);

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

  const handleExport = async () => {
    if (tripFilter === "all") {
      message.warning("Vui lòng chọn một trip cụ thể để export");
      return;
    }
    setExportLoading(true);
    try {
      const blob = await exportPassengers(tripFilter);
      const tripName = tripMap.get(tripFilter) || tripFilter;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `passengers_${tripName.replace(/\s+/g, "_")}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
      message.success("Đã tải file Excel");
    } catch {
      message.error("Export thất bại");
    } finally {
      setExportLoading(false);
    }
  };

  const handleImported = (result: ImportPassengerResult) => {
    setImportResult(result);
    // Switch trip filter to the imported trip
    setTripFilter(result.trip_id);
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
              Danh sách hành khách; chọn trip để xem xe được gán.
            </Text>
          </div>
          <div className="flex flex-col md:flex-row gap-2 md:items-center">
            <Input
              allowClear
              placeholder="Tìm theo tên / số điện thoại / ghi chú"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full md:w-64"
            />
            <Select
              value={tripFilter}
              onChange={(val) => {
                setTripFilter(val);
                // Clear import result when switching trips
                if (importResult && val !== importResult.trip_id) {
                  setImportResult(null);
                }
              }}
              className="w-full md:w-52"
              options={[
                { value: "all", label: "Tất cả trip" },
                ...(Array.isArray(trips) ? trips : []).map((t: Trip) => ({
                  value: t.id,
                  label: t.name,
                })),
              ]}
            />
            <Button
              icon={<DownloadOutlined />}
              loading={exportLoading}
              onClick={handleExport}
              disabled={tripFilter === "all"}
              title={
                tripFilter === "all" ? "Chọn trip để export" : "Export .xlsx"
              }
            >
              Export
            </Button>
            {canManage && (
              <>
                <Button
                  icon={<UploadOutlined />}
                  onClick={() => setShowImport(true)}
                >
                  Import
                </Button>
                <Button type="primary" onClick={openCreate}>
                  + New Passenger
                </Button>
              </>
            )}
          </div>
        </div>
        <PassengerTable
          data={filteredPassengers}
          isLoading={isLoading}
          deleting={deleteMutation.status === "pending"}
          tripBusMap={tripBusMap}
          selectedTripId={tripFilter}
          canManage={canManage}
          onDelete={(id) => deleteMutation.mutate(id)}
          onEdit={openEdit}
        />
      </div>

      {/* Imported Bus Mapper — always shown based on API data when a trip is selected */}
      {tripFilter !== "all" && importedBusesForTrip.length > 0 && (
        <ImportedBusMapper
          tripId={tripFilter as string}
          tripName={selectedTrip?.name || importResult?.trip_name}
          readOnly={tripIsActive}
          onDone={() => setImportResult(null)}
        />
      )}

      <ImportPassengerModal
        open={showImport}
        onCancel={() => setShowImport(false)}
        onImported={handleImported}
      />

      <PassengerFormModal
        open={showCreate}
        onCancel={handleCancel}
        onSubmit={handleSubmit}
        confirmLoading={
          createMutation.status === "pending" ||
          updateMutation.status === "pending"
        }
        form={form}
        editingPassenger={editingPassenger}
      />
    </div>
  );
}
