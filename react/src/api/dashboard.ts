import { fetchData } from "./api";

type TripStatus = "planned" | "doing" | "done";

type StatusBreakdown = Record<TripStatus | "total", number>;

export interface DashboardOverview {
  trips: StatusBreakdown;
  passengers: StatusBreakdown;
  buses: StatusBreakdown;
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
  };
};
