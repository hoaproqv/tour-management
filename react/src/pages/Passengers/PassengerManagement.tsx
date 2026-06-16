import React, { useMemo, useState } from "react";

import { DownloadOutlined, DeleteOutlined } from "@ant-design/icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button, Form, Input, Select, Typography, message, Modal } from "antd";

import {
  createPassenger,
  deletePassenger,
  exportPassengers,
  getImportedBuses,
  getPassengers,
  getTrips,
  updatePassenger,
  bulkDeletePassengers,
  type ImportPassengerResult,
  type Passenger,
  type PassengerPayload,
  type Trip,
} from "../../api/trips";
import { useGetAccountInfo } from "../../hooks/useAuth";
import { useDebounce } from "../../hooks/useDebounce";
import { useGlobalTripFilter } from "../../hooks/useGlobalTripFilter";
import { canManageCatalog, removeAccents } from "../../utils/helper";

import AssignPassengerBusModal from "./components/AssignPassengerBusModal";
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
  const debouncedSearch = useDebounce(search, 300);



  const [showCreate, setShowCreate] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [showAssignBus, setShowAssignBus] = useState(false);
  const [importResult, setImportResult] =
    useState<ImportPassengerResult | null>(null);
  const [editingPassenger, setEditingPassenger] = useState<Passenger | null>(
    null,
  );
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [isSelectionMode, setIsSelectionMode] = useState(false);
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

  const trips = useMemo(() => {
    const arr = Array.isArray(tripsResponse?.data) ? [...tripsResponse.data] : [];
    return arr.sort((a, b) => {
      const timeA = a.created_at ? new Date(a.created_at).getTime() : 0;
      const timeB = b.created_at ? new Date(b.created_at).getTime() : 0;
      return timeB - timeA;
    });
  }, [tripsResponse]);

  const [tripFilter, setTripFilter] = useGlobalTripFilter(false);

  const { data: passengersResponse, isLoading } = useQuery({
    queryKey: ["passengers", tripFilter],
    queryFn: () =>
      getPassengers({
        page: 1,
        limit: 1000,
        ...(tripFilter !== "all" && tripFilter ? { trip: tripFilter } : {}),
      }),
    enabled: tripFilter === "all" || Boolean(tripFilter),
  });

  // Always fetch imported buses for the selected trip so the mapper persists on reload
  const { data: importedBusesForTrip = [] } = useQuery({
    queryKey: ["imported-buses", tripFilter],
    queryFn: () => getImportedBuses(tripFilter as string),
    enabled: tripFilter !== "all" && Boolean(tripFilter),
  });

  const passengers = useMemo(
    () =>
      Array.isArray(passengersResponse?.data) ? passengersResponse.data : [],
    [passengersResponse],
  );

  const tripMap = useMemo(
    () =>
      new Map(
        (Array.isArray(trips) ? trips : []).map((t: Trip) => [String(t.id), t.name]),
      ),
    [trips],
  );

  // Current selected trip (for status check)
  const selectedTrip = useMemo(
    () =>
      tripFilter !== "all" && tripFilter
        ? trips.find((t) => String(t.id) === String(tripFilter))
        : undefined,
    [trips, tripFilter],
  );

  const filteredPassengers = useMemo(() => {
    const term = removeAccents(debouncedSearch).trim().toLowerCase();
    return (Array.isArray(passengers) ? passengers : []).filter((p) => {
      if (!term) return true;
      return (
        removeAccents(p.name).toLowerCase().includes(term) ||
        removeAccents(p.phone).toLowerCase().includes(term) ||
        removeAccents(p.note || "").toLowerCase().includes(term)
      );
    });
  }, [passengers, debouncedSearch]);

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
    if (tripFilter !== "all" && tripFilter) {
      form.setFieldsValue({ trip_id: String(tripFilter) });
    }
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
      extra_info: passenger.extra_info,
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
          extra_info: values.extra_info || "",
          note: values.note || "",
        };
        if (editingPassenger) {
          updateMutation.mutate({ id: editingPassenger.id, payload });
        } else {
          payload.trip_id = values.trip_id;
          payload.trip_bus_id = values.trip_bus_id;
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
    if (tripFilter === "all" || !tripFilter) {
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
    <div className="w-full bg-[#f4f7fb] h-full py-6">
      <div className="bg-white shadow-sm rounded-2xl p-6 border border-slate-100">
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 mb-2">
          <div className="flex-1 min-w-[250px] pr-4">
            <p className="text-sm uppercase tracking-[0.25em] text-sky-700 font-semibold">
              Passenger Management
            </p>
            <Title level={2} style={{ margin: 0 }}>
              Quản lý Hành khách
            </Title>
            <Text type="secondary">
              Danh sách hành khách; chọn Chuyến đi để xem xe được gán.
            </Text>
          </div>
          <div className="flex flex-wrap items-center gap-3 w-full xl:w-auto">
            <Input
              allowClear
              placeholder="Tìm theo tên / số điện thoại / ghi chú"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full sm:w-64"
            />

            <Button
              icon={<DownloadOutlined />}
              loading={exportLoading}
              onClick={handleExport}
              disabled={tripFilter === "all"}
              title={
                tripFilter === "all" ? "Chọn chuyến đi để export" : "Export .xlsx"
              }
              className="text-emerald-600 border-emerald-200 hover:border-emerald-500 hover:text-emerald-700 hover:bg-emerald-50 shadow-sm"
            >
              Export
            </Button>
            {canManage && (
              <>
                <Button
                  type="primary"
                  onClick={() => setShowAssignBus(true)}
                  disabled={tripFilter === "all" || !selectedTrip}
                  title={tripFilter === "all" ? "Chọn chuyến đi để sắp xếp xe" : "Sắp xếp xe cho hành khách"}
                  className="bg-green-600 hover:bg-green-700 shadow-sm px-5 border-none text-white disabled:bg-slate-300 disabled:text-slate-500"
                >
                  Sắp xếp xe
                </Button>
                <Button
                  type="primary"
                  onClick={openCreate}
                  className="bg-sky-600 hover:bg-sky-700 shadow-sm px-5"
                >
                  + Tạo mới
                </Button>
              </>
            )}
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mt-6 mb-4 p-4 bg-slate-50/50 border border-slate-100 rounded-xl">
          <div className="flex items-center gap-3">
            <span className="font-medium text-slate-700 whitespace-nowrap">Chuyến đi:</span>
            <Select
              value={trips.some(t => String(t.id) === tripFilter) ? tripFilter : undefined}
              onChange={(val) => {
                setTripFilter(val);
                if (importResult && val !== importResult.trip_id) {
                  setImportResult(null);
                }
              }}
              className="w-full sm:w-64"
              showSearch
              optionFilterProp="label"
              placeholder="Chọn chuyến đi"
              notFoundContent="Không có chuyến đi"
              options={[
                ...trips.map((t) => ({
                  label: t.name,
                  value: String(t.id),
                })),
              ]}
            />
          </div>

          {canManage && (
            <div className="flex justify-end">
              {isSelectionMode ? (
                <div className="flex gap-2">
                  <Button
                    onClick={() => {
                      setIsSelectionMode(false);
                      setSelectedRowKeys([]);
                    }}
                  >
                    Hủy
                  </Button>
                  {selectedRowKeys.length > 0 && (
                    <Button
                      danger
                      icon={<DeleteOutlined />}
                      onClick={() => {
                        Modal.confirm({
                          title: "Xóa nhiều hành khách?",
                          content: `Bạn chắc chắn muốn xóa ${selectedRowKeys.length} hành khách đã chọn?`,
                          okText: "Xóa",
                          cancelText: "Hủy",
                          onOk: async () => {
                            const hide = message.loading("Đang xóa...", 0);
                            try {
                              await bulkDeletePassengers(selectedRowKeys as string[]);
                              message.success(`Đã xóa ${selectedRowKeys.length} hành khách`);
                              setSelectedRowKeys([]);
                              setIsSelectionMode(false);
                              await queryClient.invalidateQueries({ queryKey: ["passengers"] });
                            } catch {
                              message.error("Lỗi khi xóa hành khách");
                            } finally {
                              hide();
                            }
                          },
                        });
                      }}
                    >
                      Xóa đã chọn ({selectedRowKeys.length})
                    </Button>
                  )}
                </div>
              ) : (
                <Button danger onClick={() => setIsSelectionMode(true)}>
                  Xóa nhiều
                </Button>
              )}
            </div>
          )}
        </div>

        {/* Imported Bus Mapper */}
        {tripFilter !== "all" && importedBusesForTrip.length > 0 && selectedTrip?.status === "planned" && canManage && (
          <div className="mb-4">
            <ImportedBusMapper
              tripId={tripFilter as string}
              tripName={selectedTrip?.name || importResult?.trip_name}
              readOnly={false}
              onDone={() => setImportResult(null)}
            />
          </div>
        )}

        <PassengerTable
          data={filteredPassengers}
          isLoading={isLoading}
          deleting={deleteMutation.status === "pending"}
          canManage={canManage}
          selectedRowKeys={selectedRowKeys}
          onSelectChange={setSelectedRowKeys}
          isSelectionMode={isSelectionMode}
          onDelete={(id) => deleteMutation.mutate(id)}
          onEdit={openEdit}
        />
      </div>

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
        trips={trips}
        onOpenImport={() => {
          setShowCreate(false);
          setShowImport(true);
        }}
      />

      <AssignPassengerBusModal
        open={showAssignBus}
        onClose={() => setShowAssignBus(false)}
        trip={selectedTrip || null}
      />
    </div>
  );
}
