import type { Passenger, TransactionItem } from "../../api/trips";

export type RowStatus =
  | "pending"
  | "checkedInHere"
  | "checkedInElsewhere"
  | "checkedOut";
export type RoundVisualStatus = "past" | "current" | "upcoming";

export interface PassengerRow {
  key: string;
  passenger: Passenger;
  transaction?: TransactionItem;
  txnBusId?: string;
  status: RowStatus;
  assignedBusId: string | null;
  homeBusId: string | null;
  isOwnedByBus: boolean;
  transferredAway: boolean;
  transferredHere: boolean;
  transferTargetLabel?: string;
}
