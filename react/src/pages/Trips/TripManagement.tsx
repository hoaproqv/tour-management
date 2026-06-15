import React, { useEffect, useMemo, useState } from "react";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, Form, message, Modal } from "antd";
import dayjs from "dayjs";

import { getTenants } from "../../api/tenants";
import {
  createTrip,
  getBuses,
  getRounds,
  getTripBuses,
  getTrips,
  updateTrip,
  deleteTrip,
  bulkDeleteTrips,
  type BusItem,
  type Trip,
  type TripPayload,
} from "../../api/trips";
import { getUsers } from "../../api/users";
import { useGetAccountInfo } from "../../hooks/useAuth";
import { useDebounce } from "../../hooks/useDebounce";
import { canManageCatalog, removeAccents } from "../../utils/helper";

import PassengerAssignmentModal from "./components/PassengerAssignmentModal";
import TripBusAssignmentModal from "./components/TripBusAssignmentModal";
import TripFormModal, { type TripFormValues } from "./components/TripFormModal";
import TripHeader from "./components/TripHeader";
import TripRoundManagementModal from "./components/TripRoundManagementModal";
import TripTable from "./components/TripTable";
import { type EnrichedTrip } from "./components/types";

import type { IUser } from "../../utils/types";

const statusMeta: Record<Trip["status"], { label: string; color: string }> = {
  planned: { label: "Chưa xuất phát", color: "blue" },
  doing: { label: "Đang đi", color: "orange" },
  done: { label: "Đã hoàn thành", color: "green" },
};

export default function TripManagement() {
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 300);
  const [statusFilter, setStatusFilter] = useState<Trip["status"] | "all">(
    "all",
  );
  const [managingRoundsTrip, setManagingRoundsTrip] = useState<EnrichedTrip | null>(null);
  const [assigningBusesTrip, setAssigningBusesTrip] = useState<EnrichedTrip | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [editingTrip, setEditingTrip] = useState<Trip | null>(null);
  const [assigningTrip, setAssigningTrip] = useState<EnrichedTrip | null>(null);
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [form] = Form.useForm<TripFormValues>();
  const queryClient = useQueryClient();

  const { data: accountInfo } = useGetAccountInfo();
  const currentUser = accountInfo as IUser | undefined;
  const canManageTrips = canManageCatalog(currentUser);

  const { data: tripsResponse, isLoading: loadingTrips } = useQuery({
    queryKey: ["trips"],
    queryFn: () => getTrips({ page: 1, limit: 1000 }),
  });

  const { data: tenantsResponse, isLoading: loadingTenants } = useQuery({
    queryKey: ["tenants"],
    queryFn: () => getTenants({ page: 1, limit: 1000 }),
  });

  const { data: tripBusesResponse, isLoading: loadingTripBuses } = useQuery({
    queryKey: ["trip-buses"],
    queryFn: () => getTripBuses({ page: 1, limit: 1000 }),
  });

  const { data: driverResponse } = useQuery({
    queryKey: ["users", "drivers"],
    queryFn: () => getUsers({ page: 1, limit: 1000, role: "driver" }),
  });

  const { data: fleetLeadResponse } = useQuery({
    queryKey: ["users", "fleet-leads"],
    queryFn: () => getUsers({ page: 1, limit: 1000, role: "fleet_lead" }),
  });

  const { data: roundsResponse, isLoading: loadingRounds } = useQuery({
    queryKey: ["rounds"],
    queryFn: () => getRounds({ page: 1, limit: 1000 }),
  });

  const { data: busesResponse } = useQuery({
    queryKey: ["buses", "for-trip"],
    queryFn: () => getBuses({ page: 1, limit: 1000 }),
  });

  const trips = useMemo(
    () => (Array.isArray(tripsResponse?.data) ? tripsResponse.data : []),
    [tripsResponse],
  );

  const tripBuses = useMemo(
    () =>
      Array.isArray(tripBusesResponse?.data) ? tripBusesResponse.data : [],
    [tripBusesResponse],
  );

  const tenants = useMemo(
    () => (Array.isArray(tenantsResponse?.data) ? tenantsResponse.data : []),
    [tenantsResponse],
  );

  const drivers = useMemo(
    () => (Array.isArray(driverResponse?.data) ? driverResponse.data : []),
    [driverResponse],
  );

  const fleetLeads = useMemo(
    () =>
      Array.isArray(fleetLeadResponse?.data) ? fleetLeadResponse.data : [],
    [fleetLeadResponse],
  );


  useEffect(() => {
    // Không cần set tenant_id nữa vì backend tự xử lý
  }, [accountInfo, tenants, form]);

  const rounds = useMemo(
    () => (Array.isArray(roundsResponse?.data) ? roundsResponse.data : []),
    [roundsResponse],
  );

  const buses = useMemo(
    () => (Array.isArray(busesResponse?.data) ? busesResponse.data : []),
    [busesResponse],
  );

  const busMap = useMemo(
    () =>
      new Map(
        buses.map((bus: BusItem) => [
          bus.id,
          bus.registration_number || bus.bus_code || "Bus",
        ]),
      ),
    [buses],
  );

  const enrichedTrips: EnrichedTrip[] = useMemo(() => {
    if (!Array.isArray(trips)) return [];
    return trips.map((trip) => {
      const busesByTrip = tripBuses.filter((tb) => tb.trip === trip.id);
      const roundsByTrip = rounds.filter((r) => r.trip === trip.id);
      return {
        ...trip,
        busCount: busesByTrip.length,
        roundCount: roundsByTrip.length,
        buses: busesByTrip,
        rounds: roundsByTrip,
      };
    });
  }, [trips, tripBuses, rounds]);

  const filteredTrips = useMemo(() => {
    const term = removeAccents(debouncedSearch).trim().toLowerCase();
    return enrichedTrips.filter((trip) => {
      const matchTerm = term
        ? removeAccents(trip.name).toLowerCase().includes(term) ||
          removeAccents(trip.description).toLowerCase().includes(term)
        : true;
      const matchStatus =
        statusFilter === "all" ? true : trip.status === statusFilter;
      return matchTerm && matchStatus;
    });
  }, [enrichedTrips, debouncedSearch, statusFilter]);

  const loading =
    loadingTrips || loadingTripBuses || loadingRounds || loadingTenants;

  const createTripMutation = useMutation({
    mutationFn: (payload: TripPayload) => createTrip(payload),
    onSuccess: async () => {
      message.success("Tạo chuyến đi thành công");
      setShowCreate(false);
      form.resetFields();
      // Chỉ cần xóa cache "trips" — trip-buses và rounds chưa tồn tại cho tour mới
      await queryClient.invalidateQueries({ queryKey: ["trips"] });
    },
    onError: () => message.error("Tạo chuyến đi thất bại"),
  });

  const updateTripMutation = useMutation({
    mutationFn: (data: { id: string; payload: TripPayload }) =>
      updateTrip(data.id, data.payload),
    onSuccess: async () => {
      message.success("Cập nhật chuyến đi thành công");
      setEditingTrip(null);
      form.resetFields();
      // Chỉ cần cập nhật cache "trips" — trip-buses không thay đổi khi sửa thông tin tour
      await queryClient.invalidateQueries({ queryKey: ["trips"] });
    },
    onError: () => message.error("Cập nhật chuyến đi thất bại"),
  });

  const deleteTripMutation = useMutation({
    mutationFn: (id: string) => deleteTrip(id),
    onSuccess: async () => {
      message.success("Đã xóa chuyến đi thành công");
      // Khi xóa tour, các entity liên quan (rounds, passengers) cũng không còn.
      // staleTime sẽ tự expire trong vòng 1 phút — chỉ force xóa trips.
      await queryClient.invalidateQueries({ queryKey: ["trips"] });
    },
    onError: () => message.error("Xóa chuyến đi thất bại"),
  });

  const openCreate = () => {
    if (!canManageTrips) {
      message.warning("Bạn không có quyền chỉnh sửa chuyến đi");
      return;
    }
    setEditingTrip(null);
    form.resetFields();
    setShowCreate(true);
  };

  const openEdit = (trip: Trip) => {
    if (!canManageTrips) {
      message.warning("Bạn không có quyền chỉnh sửa chuyến đi");
      return;
    }
    setEditingTrip(trip);
    form.setFieldsValue({
      name: trip.name,
      description: trip.description,
      start_date: dayjs(trip.start_date),
      end_date: dayjs(trip.end_date),
    });
    setShowCreate(true);
  };

  const handleSubmit = () => {
    form
      .validateFields()
      .then((values) => {
        const payload: TripPayload = {
          name: values.name,
          description: values.description || "",
          // Status is read-only — always preserve the trip's current status
          status: editingTrip ? editingTrip.status : "planned",
          start_date: values.start_date.format("YYYY-MM-DD"),
          end_date: values.end_date.format("YYYY-MM-DD"),
          bus_assignments: [],
        };
        if (editingTrip) {
          updateTripMutation.mutate({ id: editingTrip.id, payload });
        } else {
          createTripMutation.mutate(payload);
        }
        handleCancel();
      })
      .catch(() => undefined);
  };

  const handleCancel = () => {
    setShowCreate(false);
    setEditingTrip(null);
  };

  const handleBulkDelete = () => {
    if (!canManageTrips) {
      message.warning("Bạn không có quyền xóa chuyến đi");
      return;
    }
    Modal.confirm({
      title: "Xóa nhiều chuyến đi?",
      content: `Bạn chắc chắn muốn xóa ${selectedRowKeys.length} chuyến đi đã chọn?`,
      okText: "Xóa",
      cancelText: "Hủy",
      onOk: async () => {
        const hide = message.loading("Đang xóa...", 0);
        try {
          await bulkDeleteTrips(selectedRowKeys as string[]);
          message.success(`Đã xóa ${selectedRowKeys.length} chuyến đi`);
          setSelectedRowKeys([]);
          setIsSelectionMode(false);
          await queryClient.invalidateQueries({ queryKey: ["trips"] });
        } catch {
          message.error("Lỗi khi xóa chuyến đi");
        } finally {
          hide();
        }
      },
    });
  };

  return (
    <div className="w-full bg-[#f4f7fb] h-full py-6">
      <div className="bg-white shadow-sm rounded-2xl p-6 border border-slate-100">
        <TripHeader
          search={search}
          statusFilter={statusFilter}
          onSearchChange={setSearch}
          onStatusChange={setStatusFilter}
          onCreate={openCreate}
          canCreate={canManageTrips}
          statusMeta={statusMeta}
          selectedRowKeys={selectedRowKeys}
          onBulkDelete={handleBulkDelete}
          isSelectionMode={isSelectionMode}
          onSelectionModeChange={(mode) => {
            setIsSelectionMode(mode);
            if (!mode) setSelectedRowKeys([]);
          }}
        />

        <Card className="mt-6" styles={{ body: { padding: 0 } }}>
          <TripTable
            trips={filteredTrips}
            loading={loading}
            statusMeta={statusMeta}
            canManage={canManageTrips}
            selectedRowKeys={selectedRowKeys}
            onSelectChange={setSelectedRowKeys}
            isSelectionMode={isSelectionMode}
            onEdit={openEdit}
            onViewRounds={(trip) => setManagingRoundsTrip(trip)}
            onViewBuses={(trip) => setAssigningBusesTrip(trip)}
            onAssignPassengers={(trip) => setAssigningTrip(trip)}
            onDelete={(trip) => {
              if (!canManageTrips) {
                message.warning("Bạn không có quyền xóa chuyến đi");
                return;
              }
              deleteTripMutation.mutate(trip.id);
            }}
          />
        </Card>
      </div>

      <TripRoundManagementModal
        open={Boolean(managingRoundsTrip)}
        trip={managingRoundsTrip}
        onClose={() => setManagingRoundsTrip(null)}
      />

      <TripBusAssignmentModal
        open={Boolean(assigningBusesTrip)}
        trip={assigningBusesTrip}
        onClose={() => setAssigningBusesTrip(null)}
        buses={buses}
        loadingBuses={!busesResponse}
        drivers={drivers}
        fleetLeads={fleetLeads}
      />

      <PassengerAssignmentModal
        open={Boolean(assigningTrip)}
        trip={assigningTrip}
        onClose={() => setAssigningTrip(null)}
        busLabelMap={busMap}
      />

      <TripFormModal
        open={showCreate}
        onCancel={handleCancel}
        onSubmit={handleSubmit}
        confirmLoading={
          createTripMutation.status === "pending" ||
          updateTripMutation.status === "pending"
        }
        form={form}
        editingTrip={editingTrip}
      />
    </div>
  );
}
