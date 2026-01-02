import { fetchData } from "./api";

export interface DashboardOverview {
  tripsCount: number;
  roundsCount: number;
  passengersCount: number;
}

export const getDashboardOverview = async (): Promise<DashboardOverview> => {
  const [trips, rounds, passengers] = await Promise.all([
    fetchData("/trips/"),
    fetchData("/rounds/"),
    fetchData("/passengers/"),
  ]);

  return {
    tripsCount: Array.isArray(trips) ? trips.length : 0,
    roundsCount: Array.isArray(rounds) ? rounds.length : 0,
    passengersCount: Array.isArray(passengers) ? passengers.length : 0,
  };
};
