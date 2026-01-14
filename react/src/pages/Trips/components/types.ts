import type { Trip, TripBus, RoundItem } from "../../../api/trips";

export interface EnrichedTrip extends Trip {
  busCount: number;
  roundCount: number;
  buses: TripBus[];
  rounds: RoundItem[];
}
