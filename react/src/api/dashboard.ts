import { fetchData } from "./api";

type TripStatus = "planned" | "doing" | "done";

type StatusBreakdown = Record<TripStatus | "total", number>;

export interface RecentTrip {
  id: number;
  name: string;
  status: TripStatus;
  start_date: string;
}

export interface ArrivingLocation {
  id: number;
  trip_name: string;
  round_name: string;
  location: string;
  updated_at: string;
}

export interface DashboardOverview {
  trips: StatusBreakdown;
  passengers: StatusBreakdown;
  buses: StatusBreakdown;
  recent_trips: RecentTrip[];
  arriving_locations: ArrivingLocation[];
  tenant_info?: {
    id: number;
    name: string;
    phone: string;
    address: string;
    description: string;
  };
  admin_overview?: {
    tenants: { total: number };
    users: { total: number; active: number; inactive: number };
    recent_tenants: Array<{ id: number; name: string; created_at: string }>;
    recent_users: Array<{
      id: number;
      name: string;
      email: string;
      role: string | null;
      tenant_name: string | null;
      created_at: string;
    }>;
  };
}

const EMPTY_BREAKDOWN: StatusBreakdown = {
  total: 0,
  planned: 0,
  doing: 0,
  done: 0,
};

const normalizeBreakdown = (maybe: unknown): StatusBreakdown => {
  const value = (maybe as Partial<StatusBreakdown>) || {};
  return {
    total: Number(value.total ?? 0),
    planned: Number(value.planned ?? 0),
    doing: Number(value.doing ?? 0),
    done: Number(value.done ?? 0),
  };
};

export const getDashboardOverview = async (): Promise<DashboardOverview> => {
  const response = (await fetchData("/dashboard/overview/")) || {};
  const payload = response as Partial<DashboardOverview>;

  return {
    trips: normalizeBreakdown(payload.trips ?? EMPTY_BREAKDOWN),
    passengers: normalizeBreakdown(payload.passengers ?? EMPTY_BREAKDOWN),
    buses: normalizeBreakdown(payload.buses ?? EMPTY_BREAKDOWN),
    recent_trips: payload.recent_trips ?? [],
    arriving_locations: payload.arriving_locations ?? [],
    tenant_info: payload.tenant_info,
    admin_overview: payload.admin_overview,
  };
};
