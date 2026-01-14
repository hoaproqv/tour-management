import React, { useEffect, useMemo, useState } from "react";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, Form, message } from "antd";
import dayjs from "dayjs";

import { getTenants } from "../../api/tenants";
import {
  createTrip,
  getBuses,
  getRounds,
  getTripBuses,
  getTrips,
  updateTrip,
  type BusItem,
  type Trip,
  type TripPayload,
} from "../../api/trips";
import { getUsers } from "../../api/users";
import { useGetAccountInfo } from "../../hooks/useAuth";
import { canManageCatalog } from "../../utils/helper";


import TripDetailModal from "./components/TripDetailModal";
import TripFormModal, { type TripFormValues } from "./components/TripFormModal";
import TripHeader from "./components/TripHeader";
import TripTable from "./components/TripTable";
import { type EnrichedTrip } from "./components/types";

import type { IUser } from "../../utils/types";

const statusMeta: Record<Trip["status"], { label: string; color: string }> = {
  planned: { label: "Planned", color: "blue" },
  doing: { label: "Doing", color: "orange" },
  done: { label: "Done", color: "green" },
};

export default function TripManagement() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<Trip["status"] | "all">(
    "all",
  );
  const [detail, setDetail] = useState<{
    trip: EnrichedTrip;
    mode: "rounds" | "buses";
  } | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [editingTrip, setEditingTrip] = useState<Trip | null>(null);
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
    () => (Array.isArray(tripBusesResponse?.data) ? tripBusesResponse.data : []),
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

  const userContactMap = useMemo(() => {
    const map = new Map<string | number, { name?: string; phone?: string }>();
    drivers.forEach((u) => {
      map.set(u.id, { name: u.name, phone: (u as { phone?: string }).phone });
    });
    fleetLeads.forEach((u) => {
      map.set(u.id, { name: u.name, phone: (u as { phone?: string }).phone });
    });
    return map;
  }, [drivers, fleetLeads]);

  useEffect(() => {
    if (accountInfo?.tenant) {
      form.setFieldsValue({ tenant_id: accountInfo.tenant });
    } else if (!form.getFieldValue("tenant_id") && tenants.length > 0) {
      form.setFieldsValue({ tenant_id: tenants[0].id });
    }
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
    const term = search.trim().toLowerCase();
    return enrichedTrips.filter((trip) => {
      const matchTerm = term
        ? trip.name.toLowerCase().includes(term) ||
          trip.description.toLowerCase().includes(term)
        : true;
      const matchStatus =
        statusFilter === "all" ? true : trip.status === statusFilter;
      return matchTerm && matchStatus;
    });
  }, [enrichedTrips, search, statusFilter]);

  const loading =
    loadingTrips || loadingTripBuses || loadingRounds || loadingTenants;

  const createTripMutation = useMutation({
    mutationFn: (payload: TripPayload) => createTrip(payload),
    onSuccess: async () => {
      message.success("Tạo trip thành công");
      setShowCreate(false);
      form.resetFields();
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["trips"] }),
        queryClient.invalidateQueries({ queryKey: ["trip-buses"] }),
      ]);
    },
    onError: () => {
      message.error("Tạo trip thất bại");
    },
  });

  const updateTripMutation = useMutation({
    mutationFn: (data: { id: string; payload: TripPayload }) =>
      updateTrip(data.id, data.payload),
    onSuccess: async () => {
      message.success("Cập nhật trip thành công");
      setEditingTrip(null);
      form.resetFields();
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["trips"] }),
        queryClient.invalidateQueries({ queryKey: ["trip-buses"] }),
      ]);
    },
    onError: () => {
      message.error("Cập nhật trip thất bại");
    },
  });

  const openCreate = () => {
    if (!canManageTrips) {
      message.warning("Bạn không có quyền chỉnh sửa trip");
      return;
    }
    setEditingTrip(null);
    form.resetFields();
    setShowCreate(true);
  };

  const openEdit = (trip: Trip) => {
    if (!canManageTrips) {
      message.warning("Bạn không có quyền chỉnh sửa trip");
      return;
    }
    setEditingTrip(trip);
    const assignments = tripBuses
      .filter((tb) => tb.trip === trip.id)
      .map((tb) => ({
        bus: tb.bus,
        manager: tb.manager,
        driver: tb.driver ?? undefined,
      }));
    form.setFieldsValue({
      name: trip.name,
      tenant_id: trip.tenant || tenants[0]?.id,
      description: trip.description,
      status: trip.status,
      start_date: dayjs(trip.start_date),
      end_date: dayjs(trip.end_date),
      bus_assignments: assignments,
    });
    setShowCreate(true);
  };

  const handleSubmit = () => {
    form
      .validateFields()
      .then((values) => {
        if (!values.bus_assignments || values.bus_assignments.length === 0) {
          message.warning("Vui lòng thêm ít nhất 1 bus kèm trưởng xe và lái xe");
          return;
        }
        if (editingTrip && !values.status) {
          message.warning("Chọn trạng thái trip khi chỉnh sửa");
          return;
        }
        const status = editingTrip ? values.status || editingTrip.status : "planned";
        const payload: TripPayload = {
          name: values.name,
          description: values.description || "",
          status,
          start_date: values.start_date.format("YYYY-MM-DD"),
          end_date: values.end_date.format("YYYY-MM-DD"),
          tenant_id: Number(values.tenant_id),
          bus_assignments: (values.bus_assignments || []).map((item) => ({
            bus: Number(item.bus as string | number),
            manager: Number(item.manager as string | number),
            driver: Number(item.driver as string | number),
          })),
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

  return (
    <div className="w-full bg-[#f4f7fb] min-h-screen py-6">
      <div className="bg-white shadow-sm rounded-2xl p-6 border border-slate-100">
        <TripHeader
          search={search}
          statusFilter={statusFilter}
          onSearchChange={setSearch}
          onStatusChange={setStatusFilter}
          onCreate={openCreate}
          canCreate={canManageTrips}
          statusMeta={statusMeta}
        />

        <Card className="mt-6" styles={{ body: { padding: 0 } }}>
          <TripTable
            trips={filteredTrips}
            loading={loading}
            statusMeta={statusMeta}
            canManage={canManageTrips}
            onEdit={openEdit}
            onViewRounds={(trip) => setDetail({ trip, mode: "rounds" })}
            onViewBuses={(trip) => setDetail({ trip, mode: "buses" })}
          />
        </Card>
      </div>

      <TripDetailModal
        detail={detail}
        onClose={() => setDetail(null)}
        busMap={busMap}
        userContactMap={userContactMap}
        statusMeta={statusMeta}
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
        tenants={tenants}
        loadingTenants={loadingTenants}
        buses={buses}
        loadingBuses={!busesResponse}
        accountTenant={accountInfo?.tenant ?? undefined}
        editingTrip={editingTrip}
        statusMeta={statusMeta}
        drivers={drivers}
        fleetLeads={fleetLeads}
      />
    </div>
  );
}
