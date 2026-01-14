import { deleteData, fetchData, postData, putData } from "./api";

export interface Trip {
  id: string;
  tenant?: string | number | null;
  bus_ids?: Array<string | number>;
  name: string;
  start_date: string;
  end_date: string;
  status: "planned" | "doing" | "done";
  description: string;
}

export type TripPayload = {
  name: string;
  start_date: string;
  end_date: string;
  status: "planned" | "doing" | "done";
  description: string;
  tenant_id?: string | number;
  bus_ids?: Array<string | number>;
};

export interface TripBus {
  id: string;
  manager: string;
  bus: string;
  trip: string;
  driver_name: string;
  driver_tel: string;
  tour_guide_name: string;
  tour_guide_tel: string;
  description: string;
}

export interface RoundItem {
  id: string;
  trip: string;
  name: string;
  location: string;
  sequence: number;
  estimate_time: string;
  actual_time: string | null;
  status: "planned" | "doing" | "done";
  bus_ids: Array<string | number>;
}

export type RoundPayload = Omit<RoundItem, "id">;

export interface BusItem {
  id: string;
  registration_number: string;
  bus_code: string;
  capacity: number;
  description: string;
  created_at?: string;
  updated_at?: string;
}

export type BusPayload = Omit<BusItem, "id">;

export interface Passenger {
  id: string;
  trip: string;
  original_bus: string | null;
  original_bus_bus_id?: string | number | null;
  name: string;
  phone: string;
  note: string;
  created_at: string;
  updated_at: string;
}

export type PassengerPayload = Omit<
  Passenger,
  "id" | "created_at" | "updated_at" | "original_bus"
>;

export interface RoundBusItem {
  id: string;
  trip_bus: string;
  round: string;
  created_at: string;
  updated_at: string;
}

export type RoundBusPayload = Omit<
  RoundBusItem,
  "id" | "created_at" | "updated_at"
>;

export interface TransactionItem {
  id: string;
  passenger: string;
  round_bus: string;
  check_in: string;
  check_out: string | null;
  created_at: string;
  updated_at: string;
}

export type TransactionPayload = Omit<
  TransactionItem,
  "id" | "created_at" | "updated_at"
>;

export interface PaginationInfo {
  page: number;
  limit: number;
  total_page: number;
  total_items: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: PaginationInfo;
}

export interface PaginatedParams {
  page?: number;
  limit?: number;
  search?: string;
  trip?: string | number;
}

const buildQueryString = (
  params: PaginatedParams,
  defaultLimit: number,
): { queryString: string; page: number; limit: number; search: string } => {
  const page = params.page ?? 1;
  const limit = params.limit ?? defaultLimit;
  const search = params.search ?? "";
  const trip = params.trip;

  const query = new URLSearchParams({
    page: String(page),
    limit: String(limit),
  });

  if (search.trim()) {
    query.append("search", search.trim());
  }

  if (trip !== undefined && trip !== null && `${trip}`.trim()) {
    query.append("trip", `${trip}`.trim());
  }

  const queryString = query.toString();
  return { queryString, page, limit, search };
};

const normalizePaginated = <T>(
  res: unknown,
  fallback: { page: number; limit: number },
): PaginatedResponse<T> => {
  const data = Array.isArray((res as { data?: unknown })?.data)
    ? ((res as { data: T[] }).data ?? [])
    : [];

  const pagination: PaginationInfo = {
    page:
      (res as { pagination?: PaginationInfo })?.pagination?.page ??
      fallback.page,
    limit:
      (res as { pagination?: PaginationInfo })?.pagination?.limit ??
      fallback.limit,
    total_page:
      (res as { pagination?: PaginationInfo })?.pagination?.total_page ?? 1,
    total_items:
      (res as { pagination?: PaginationInfo })?.pagination?.total_items ??
      data.length,
  };

  return { data, pagination };
};

export const getTrips = async (
  params: PaginatedParams = {},
): Promise<PaginatedResponse<Trip>> => {
  const { queryString, page, limit } = buildQueryString(params, 1000);
  const res = await fetchData(`/trips/${queryString ? `?${queryString}` : ""}`);
  return normalizePaginated<Trip>(res, { page, limit });
};

export const createTrip = async (payload: TripPayload) =>
  postData("/trips/", payload);

export const updateTrip = async (id: string, payload: TripPayload) =>
  putData(`/trips/${id}/`, payload);

export const deleteTrip = async (id: string) => deleteData(`/trips/${id}/`);

export const getTripBuses = async (
  params: PaginatedParams = {},
): Promise<PaginatedResponse<TripBus>> => {
  const { queryString, page, limit } = buildQueryString(params, 1000);
  const res = await fetchData(
    `/trip-buses/${queryString ? `?${queryString}` : ""}`,
  );
  return normalizePaginated<TripBus>(res, { page, limit });
};

export const getRounds = async (
  params: PaginatedParams = {},
): Promise<PaginatedResponse<RoundItem>> => {
  const { queryString, page, limit } = buildQueryString(params, 1000);
  const res = await fetchData(
    `/rounds/${queryString ? `?${queryString}` : ""}`,
  );
  return normalizePaginated<RoundItem>(res, { page, limit });
};

export const createRound = async (payload: RoundPayload) =>
  postData("/rounds/", payload);

export const updateRound = async (id: string, payload: RoundPayload) =>
  putData(`/rounds/${id}/`, payload);

export const deleteRound = async (id: string) => deleteData(`/rounds/${id}/`);

export const getBuses = async (
  params: PaginatedParams = {},
): Promise<PaginatedResponse<BusItem>> => {
  const { queryString, page, limit } = buildQueryString(params, 10);
  const res = await fetchData(`/buses/${queryString ? `?${queryString}` : ""}`);
  return normalizePaginated<BusItem>(res, { page, limit });
};

export const createBus = async (payload: BusPayload) =>
  postData("/buses/", payload);

export const updateBus = async (id: string, payload: BusPayload) =>
  putData(`/buses/${id}/`, payload);

export const deleteBus = async (id: string) => deleteData(`/buses/${id}/`);

export const getPassengers = async (
  params: PaginatedParams = {},
): Promise<PaginatedResponse<Passenger>> => {
  const { queryString, page, limit } = buildQueryString(params, 1000);
  const res = await fetchData(
    `/passengers/${queryString ? `?${queryString}` : ""}`,
  );
  return normalizePaginated<Passenger>(res, { page, limit });
};

export const createPassenger = async (payload: PassengerPayload) =>
  postData("/passengers/", payload);

export const updatePassenger = async (id: string, payload: PassengerPayload) =>
  putData(`/passengers/${id}/`, payload);

export const deletePassenger = async (id: string) =>
  deleteData(`/passengers/${id}/`);

export const getRoundBuses = async (
  params: PaginatedParams = {},
): Promise<PaginatedResponse<RoundBusItem>> => {
  const { queryString, page, limit } = buildQueryString(params, 1000);
  const res = await fetchData(
    `/round-buses/${queryString ? `?${queryString}` : ""}`,
  );
  return normalizePaginated<RoundBusItem>(res, { page, limit });
};

export const createRoundBus = async (payload: RoundBusPayload) =>
  postData("/round-buses/", payload);

export const updateRoundBus = async (id: string, payload: RoundBusPayload) =>
  putData(`/round-buses/${id}/`, payload);

export const deleteRoundBus = async (id: string) =>
  deleteData(`/round-buses/${id}/`);

export const getTransactions = async (
  params: PaginatedParams = {},
): Promise<PaginatedResponse<TransactionItem>> => {
  const { queryString, page, limit } = buildQueryString(params, 1000);
  const res = await fetchData(
    `/transactions/${queryString ? `?${queryString}` : ""}`,
  );
  return normalizePaginated<TransactionItem>(res, { page, limit });
};

export const createTransaction = async (payload: TransactionPayload) =>
  postData("/transactions/", payload);

export const updateTransaction = async (
  id: string,
  payload: TransactionPayload,
) => putData(`/transactions/${id}/`, payload);

export const deleteTransaction = async (id: string) =>
  deleteData(`/transactions/${id}/`);
