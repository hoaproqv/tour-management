import { deleteData, fetchData, postData, putData } from "./api";

export interface Trip {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
  status: "planned" | "doing" | "done";
  description: string;
}

export type TripPayload = Omit<Trip, "id">;

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
}

export type RoundPayload = Omit<RoundItem, "id">;

export interface BusItem {
  id: string;
  registration_number: string;
  bus_code: string;
  capacity: number;
  description: string;
}

export type BusPayload = Omit<BusItem, "id">;

export const getTrips = async (): Promise<Trip[]> => {
  const res = await fetchData("/trips/");
  return Array.isArray(res) ? res : [];
};

export const createTrip = async (payload: TripPayload) =>
  postData("/trips/", payload);

export const updateTrip = async (id: string, payload: TripPayload) =>
  putData(`/trips/${id}/`, payload);

export const deleteTrip = async (id: string) => deleteData(`/trips/${id}/`);

export const getTripBuses = async (): Promise<TripBus[]> => {
  const res = await fetchData("/trip-buses/");
  return Array.isArray(res) ? res : [];
};

export const getRounds = async (): Promise<RoundItem[]> => {
  const res = await fetchData("/rounds/");
  return Array.isArray(res) ? res : [];
};

export const createRound = async (payload: RoundPayload) =>
  postData("/rounds/", payload);

export const updateRound = async (id: string, payload: RoundPayload) =>
  putData(`/rounds/${id}/`, payload);

export const deleteRound = async (id: string) => deleteData(`/rounds/${id}/`);

export const getBuses = async (): Promise<BusItem[]> => {
  const res = await fetchData("/buses/");
  return Array.isArray(res) ? res : [];
};

export const createBus = async (payload: BusPayload) =>
  postData("/buses/", payload);

export const updateBus = async (id: string, payload: BusPayload) =>
  putData(`/buses/${id}/`, payload);

export const deleteBus = async (id: string) => deleteData(`/buses/${id}/`);
