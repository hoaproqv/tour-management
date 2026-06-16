import { useMemo } from "react";
import React from "react";

import { useQuery } from "@tanstack/react-query";
import dayjs from "dayjs";

import {
  getBuses,
  getPassengers,
  getPassengerTransfers,
  getRoundBuses,
  getRounds,
  getTransactions,
  getTripBuses,
  getTrips,
  type BusItem,
  type PaginatedResponse,
  type Passenger,
  type PassengerTransfer,
  type RoundBusItem,
  type RoundItem,
  type TransactionItem,
  type Trip,
  type TripBus,
} from "../../../api/trips";
import { useGetAccountInfo } from "../../../hooks/useAuth";
import { isAdminLike, isFleetLead, isDriver } from "../../../utils/helper";

import type { IUser } from "../../../utils/types";
import type { RoundVisualStatus } from "../components/types";

export function useTransactionsData(
  activeTripId: string | undefined,
  activeRoundId: string | undefined,
) {
  const { data: accountInfo } = useGetAccountInfo();
  const currentUser = accountInfo as IUser | undefined;

  const {
    data: tripsResponse,
    isLoading: loadingTrips,
    isFetching: fetchingTrips,
  } = useQuery<PaginatedResponse<Trip>>({
    queryKey: ["trips"],
    queryFn: () => getTrips({ page: 1, limit: 1000 }),
  });

  const trips = useMemo(() => {
    const arr = Array.isArray(tripsResponse?.data)
      ? [...tripsResponse.data]
      : [];
    return arr.sort((a, b) => {
      const timeA = a.created_at ? dayjs(a.created_at).valueOf() : 0;
      const timeB = b.created_at ? dayjs(b.created_at).valueOf() : 0;
      return timeB - timeA;
    });
  }, [tripsResponse]);

  const {
    data: passengersResponse,
    isLoading: loadingPassengers,
    isFetching: fetchingPassengers,
  } = useQuery<PaginatedResponse<Passenger>>({
    queryKey: ["passengers", activeTripId],
    queryFn: () =>
      getPassengers({
        page: 1,
        limit: 1000,
        ...(activeTripId ? { trip: activeTripId } : {}),
      }),
    enabled: Boolean(activeTripId),
  });

  const {
    data: roundsResponse,
    isLoading: loadingRounds,
    isFetching: fetchingRounds,
  } = useQuery<PaginatedResponse<RoundItem>>({
    queryKey: ["rounds"],
    queryFn: () => getRounds({ page: 1, limit: 1000 }),
  });

  const {
    data: roundBusesResponse,
    isLoading: loadingRoundBuses,
    isFetching: fetchingRoundBuses,
  } = useQuery<PaginatedResponse<RoundBusItem>>({
    queryKey: ["round-buses"],
    queryFn: () => getRoundBuses({ page: 1, limit: 1000 }),
  });

  const {
    data: tripBusesResponse,
    isLoading: loadingTripBuses,
    isFetching: fetchingTripBuses,
  } = useQuery<PaginatedResponse<TripBus>>({
    queryKey: ["trip-buses"],
    queryFn: () => getTripBuses({ page: 1, limit: 1000 }),
  });

  const {
    data: busesResponse,
    isLoading: loadingBuses,
    isFetching: fetchingBuses,
  } = useQuery<PaginatedResponse<BusItem>>({
    queryKey: ["buses"],
    queryFn: () => getBuses({ page: 1, limit: 1000 }),
  });

  const {
    data: transactionsResponse,
    isLoading: loadingTransactions,
    isFetching: fetchingTransactions,
  } = useQuery<PaginatedResponse<TransactionItem>>({
    queryKey: ["transactions"],
    queryFn: () => getTransactions({ page: 1, limit: 1000 }),
  });

  const {
    data: passengerTransfersResponse,
    isLoading: loadingTransfers,
    isFetching: fetchingTransfers,
  } = useQuery<PassengerTransfer[]>({
    queryKey: ["passenger-transfers", activeTripId],
    queryFn: () => getPassengerTransfers({ trip: activeTripId }),
    enabled: Boolean(activeTripId),
  });

  const activeTrip = useMemo(
    () => trips.find((t) => String(t.id) === String(activeTripId)),
    [trips, activeTripId],
  );

  const passengers = useMemo(
    () =>
      Array.isArray(passengersResponse?.data) ? passengersResponse.data : [],
    [passengersResponse],
  );

  const tripPassengers = useMemo(() => {
    return Array.isArray(passengers) ? passengers : [];
  }, [passengers]);

  const passengerHomeBusMap = useMemo(() => {
    const map = new Map<string, string | null>();
    passengers.forEach((p) => {
      const assignedBus =
        (p as { assigned_trip_bus?: string | null }).assigned_trip_bus ?? null;
      map.set(String(p.id), assignedBus);
    });
    return map;
  }, [passengers]);

  const rounds = useMemo(
    () => (Array.isArray(roundsResponse?.data) ? roundsResponse.data : []),
    [roundsResponse],
  );

  const roundBuses = useMemo(
    () =>
      Array.isArray(roundBusesResponse?.data) ? roundBusesResponse.data : [],
    [roundBusesResponse],
  );

  const tripBuses = useMemo(
    () =>
      Array.isArray(tripBusesResponse?.data) ? tripBusesResponse.data : [],
    [tripBusesResponse],
  );

  const isAdminUser = isAdminLike(currentUser);
  const isFleetLeadUser = isFleetLead(currentUser);
  const canManageAllBuses = isAdminUser;

  const buses = useMemo(
    () => (Array.isArray(busesResponse?.data) ? busesResponse.data : []),
    [busesResponse],
  );

  const transactions = useMemo(
    () =>
      Array.isArray(transactionsResponse?.data)
        ? transactionsResponse.data
        : [],
    [transactionsResponse],
  );

  const passengerTransfers = useMemo(
    () => passengerTransfersResponse ?? [],
    [passengerTransfersResponse],
  );

  const passengerTransferMap = useMemo(() => {
    const map: Record<string, string> = {};
    passengerTransfers.forEach((t) => {
      map[t.passenger] = t.to_trip_bus;
    });
    return map;
  }, [passengerTransfers]);

  const transferByPassenger = useMemo(() => {
    const map = new Map<string, PassengerTransfer>();
    passengerTransfers.forEach((t) => {
      map.set(String(t.passenger), t);
    });
    return map;
  }, [passengerTransfers]);

  const passengerTransfersByTrip = useMemo(() => {
    const tripId = activeTripId || "";
    const result: Record<string, Record<string, string>> = { [tripId]: {} };
    passengerTransfers.forEach((t) => {
      if (!result[tripId]) result[tripId] = {};
      result[tripId][t.passenger] = t.to_trip_bus;
    });
    return result;
  }, [passengerTransfers, activeTripId]);

  const tripBusesByTrip = useMemo(() => {
    const map = new Map<string, TripBus[]>();
    tripBuses.forEach((tb) => {
      const tripIdStr = String(tb.trip);
      const list = map.get(tripIdStr) ?? [];
      list.push(tb);
      map.set(tripIdStr, list);
    });
    return map;
  }, [tripBuses]);

  const roundsByTrip = useMemo(() => {
    const map = new Map<string, RoundItem[]>();
    rounds.forEach((round) => {
      const tripIdStr = String(round.trip);
      const list = map.get(tripIdStr) ?? [];
      list.push(round);
      map.set(tripIdStr, list);
    });
    return map;
  }, [rounds]);

  const roundToTrip = useMemo(() => {
    const map = new Map<string, string>();
    rounds.forEach((round) => {
      map.set(String(round.id), String(round.trip));
    });
    return map;
  }, [rounds]);

  const busLabelMap = useMemo(
    () =>
      new Map(
        buses.map((b) => [String(b.id), b.registration_number || b.bus_code]),
      ),
    [buses],
  );

  const tripBusLabelMap = useMemo(() => {
    const map = new Map<string, string>();
    tripBuses.forEach((tb) => {
      const label = busLabelMap.get(String(tb.bus)) || "Bus";
      map.set(String(tb.id), label);
    });
    return map;
  }, [tripBuses, busLabelMap]);

  const roundBusByKey = useMemo(() => {
    const map = new Map<string, RoundBusItem>();
    roundBuses.forEach((rb) => {
      map.set(`${rb.round}-${rb.trip_bus}`, rb);
    });
    return map;
  }, [roundBuses]);

  const roundBusesByRound = useMemo(() => {
    const map = new Map<string, RoundBusItem[]>();
    roundBuses.forEach((rb) => {
      const roundIdStr = String(rb.round);
      const list = map.get(roundIdStr) ?? [];
      list.push(rb);
      map.set(roundIdStr, list);
    });
    return map;
  }, [roundBuses]);

  const roundBusToRound = useMemo(() => {
    const map = new Map<string, string>();
    roundBuses.forEach((rb) => {
      map.set(String(rb.id), String(rb.round));
    });
    return map;
  }, [roundBuses]);

  const roundBusToTripBus = useMemo(() => {
    const map = new Map<string, string>();
    roundBuses.forEach((rb) => {
      map.set(String(rb.id), String(rb.trip_bus));
    });
    return map;
  }, [roundBuses]);

  const canOperateTripBus = (tripBusId?: string) => {
    if (!tripBusId) return false;
    if (canManageAllBuses) return true;
    if (isFleetLeadUser) return true;
    return false;
  };

  const canOperateRoundBus = (roundBusId?: string) => {
    if (!roundBusId) return false;
    const tripBusId = roundBusToTripBus.get(String(roundBusId));
    return canOperateTripBus(tripBusId);
  };

  const finalizedRoundBuses = useMemo(() => {
    const map: Record<string, Record<string, string>> = {};
    roundBuses.forEach((rb) => {
      if (!rb.finalized_at) return;
      const tripId = roundToTrip.get(String(rb.round)) || "";
      if (!tripId) return;
      const nextTrip = map[tripId] || {};
      nextTrip[rb.id] = rb.finalized_at;
      map[tripId] = nextTrip;
    });
    return map;
  }, [roundBuses, roundToTrip]);

  const checkoutFinalizedRoundBuses = useMemo(() => {
    const map: Record<string, Record<string, string>> = {};
    roundBuses.forEach((rb) => {
      if (!rb.checkout_finalized_at) return;
      const tripId = roundToTrip.get(String(rb.round)) || "";
      if (!tripId) return;
      const nextTrip = map[tripId] || {};
      nextTrip[rb.id] = rb.checkout_finalized_at;
      map[tripId] = nextTrip;
    });
    return map;
  }, [roundBuses, roundToTrip]);

  const transactionsForActiveRound = useMemo(() => {
    if (!activeRoundId) return [] as TransactionItem[];
    return transactions.filter(
      (tx) =>
        String(roundBusToRound.get(String(tx.round_bus))) ===
        String(activeRoundId),
    );
  }, [transactions, activeRoundId, roundBusToRound]);

  const tripScopedRound = useMemo(
    () => roundsByTrip.get(activeTripId || "") || [],
    [roundsByTrip, activeTripId],
  );

  const tripRoundsSorted = useMemo(() => {
    const list = [...tripScopedRound];
    list.sort((a, b) => {
      if (a.sequence !== b.sequence)
        return (a.sequence || 0) - (b.sequence || 0);
      return a.name.localeCompare(b.name);
    });
    return list;
  }, [tripScopedRound]);

  const transactionByPassenger = useMemo(() => {
    const map = new Map<string, TransactionItem>();
    
    // We want to find the latest transaction for each passenger,
    // but ONLY up to the active round, to preserve history.
    const activeRoundIndex = tripRoundsSorted.findIndex((r) => String(r.id) === String(activeRoundId));
    if (activeRoundIndex < 0) return map;

    const validRoundIds = new Set(
      tripRoundsSorted.slice(0, activeRoundIndex + 1).map((r) => String(r.id))
    );

    transactions.forEach((tx) => {
      // Only consider transactions for buses in the active trip
      const tripBusId = roundBusToTripBus.get(String(tx.round_bus));
      if (!tripBusId) return;
      const tripIdForBus = tripBuses.find((tb) => String(tb.id) === String(tripBusId))?.trip;
      if (String(tripIdForBus) !== String(activeTripId)) return;

      const roundId = roundBusToRound.get(String(tx.round_bus));
      if (!roundId || !validRoundIds.has(String(roundId))) return;

      const passengerIdStr = String(tx.passenger);
      const existing = map.get(passengerIdStr);
      
      if (!existing) {
        map.set(passengerIdStr, tx);
        return;
      }
      
      const existingTime = dayjs(existing.check_in || existing.created_at);
      const currentTime = dayjs(tx.check_in || tx.created_at);
      if (currentTime.isAfter(existingTime)) {
        map.set(passengerIdStr, tx);
      }
    });
    return map;
  }, [transactions, activeTripId, tripBuses, roundBusToTripBus, tripRoundsSorted, activeRoundId, roundBusToRound]);

  const passengerBusAtStartOfRound = useMemo(() => {
    const map = new Map<string, string | null>();
    
    const activeRoundIndex = tripRoundsSorted.findIndex((r) => String(r.id) === String(activeRoundId));
    if (activeRoundIndex <= 0) {
      passengers.forEach(p => {
        map.set(String(p.id), (p as { assigned_trip_bus?: string | null }).assigned_trip_bus || null);
      });
      return map;
    }

    const validRoundIdsBeforeActive = new Set(
      tripRoundsSorted.slice(0, activeRoundIndex).map((r) => String(r.id))
    );

    const latestTxnBeforeActive = new Map<string, TransactionItem>();

    transactions.forEach((tx) => {
      const tripBusId = roundBusToTripBus.get(String(tx.round_bus));
      if (!tripBusId) return;
      const tripIdForBus = tripBuses.find((tb) => String(tb.id) === String(tripBusId))?.trip;
      if (String(tripIdForBus) !== String(activeTripId)) return;

      const roundId = roundBusToRound.get(String(tx.round_bus));
      if (!roundId || !validRoundIdsBeforeActive.has(String(roundId))) return;

      const passengerIdStr = String(tx.passenger);
      const existing = latestTxnBeforeActive.get(passengerIdStr);
      
      if (!existing) {
        latestTxnBeforeActive.set(passengerIdStr, tx);
        return;
      }
      
      const existingTime = dayjs(existing.check_in || existing.created_at).valueOf();
      const currentTime = dayjs(tx.check_in || tx.created_at).valueOf();
      if (currentTime > existingTime) {
        latestTxnBeforeActive.set(passengerIdStr, tx);
      } else if (currentTime === existingTime) {
        if (tx.id > existing.id) {
          latestTxnBeforeActive.set(passengerIdStr, tx);
        }
      }
    });

    passengers.forEach(p => {
      const pid = String(p.id);
      const txn = latestTxnBeforeActive.get(pid);
      if (txn) {
        map.set(pid, roundBusToTripBus.get(String(txn.round_bus)) || null);
      } else {
        map.set(pid, (p as { assigned_trip_bus?: string | null }).assigned_trip_bus || null);
      }
    });

    return map;
  }, [passengers, transactions, tripRoundsSorted, activeRoundId, roundBusToTripBus, roundBusToRound, tripBuses, activeTripId]);

  const isRoundFullyFinalized = useMemo(() => {
    const tripId = activeTripId;
    return (roundId: string) => {
      const trip = tripId || roundToTrip.get(String(roundId)) || "";
      const buses = roundBusesByRound.get(String(roundId)) ?? [];
      if (!buses.length) return false;
      return buses.every((rb) => Boolean(finalizedRoundBuses[trip]?.[rb.id]));
    };
  }, [activeTripId, finalizedRoundBuses, roundBusesByRound, roundToTrip]);

  const openRoundId = useMemo(() => {
    const first = tripRoundsSorted.find((r) => !isRoundFullyFinalized(r.id));
    return first?.id;
  }, [isRoundFullyFinalized, tripRoundsSorted]);

  const openRoundLabel = useMemo(() => {
    if (!openRoundId) return undefined;
    const round = tripRoundsSorted.find((r) => r.id === openRoundId);
    if (!round) return undefined;
    return `${round.sequence ? `#${round.sequence} ` : ""}${round.name}`;
  }, [openRoundId, tripRoundsSorted]);

  const tripLockedForAttendance = useMemo(
    () => (activeTrip ? activeTrip.status !== "doing" : true),
    [activeTrip],
  );

  const roundLockedBySequence = useMemo(() => {
    if (tripLockedForAttendance) return true;
    if (!activeRoundId) return false;
    if (!openRoundId) return true; // all rounds done -> lock edits
    return String(activeRoundId) !== String(openRoundId);
  }, [activeRoundId, openRoundId, tripLockedForAttendance]);

  const roundAlreadyFinalized = useMemo(
    () => (activeRoundId ? isRoundFullyFinalized(activeRoundId) : false),
    [activeRoundId, isRoundFullyFinalized],
  );

  const canModifyRound = Boolean(
    !tripLockedForAttendance &&
      openRoundId &&
      String(activeRoundId) === String(openRoundId) &&
      !roundAlreadyFinalized,
  );

  const roundBusIdFor = React.useCallback(
    (roundId: string | undefined, tripBusId: string | undefined) => {
      if (!roundId || !tripBusId) return undefined;
      return roundBusByKey.get(`${roundId}-${tripBusId}`)?.id;
    },
    [roundBusByKey],
  );

  const getRoundVisualStatus = React.useCallback(
    (roundId: string | number, index: number): RoundVisualStatus => {
      if (isRoundFullyFinalized(String(roundId))) return "past";
      if (tripLockedForAttendance) return "upcoming";
      if (openRoundId && String(roundId) === String(openRoundId)) return "current";

      const openIndex = openRoundId
        ? tripRoundsSorted.findIndex((r) => String(r.id) === String(openRoundId))
        : -1;

      if (openIndex >= 0) {
        if (index < openIndex) return "past";
        if (index > openIndex) return "upcoming";
        return "current";
      }

      return "upcoming";
    },
    [
      isRoundFullyFinalized,
      openRoundId,
      tripLockedForAttendance,
      tripRoundsSorted,
    ],
  );

  const tripScopedTripBuses = useMemo(
    () => tripBusesByTrip.get(activeTripId || "") || [],
    [tripBusesByTrip, activeTripId],
  );

  const isDriverOrManager = isFleetLeadUser || isDriver(currentUser);

  const visibleTripBuses = useMemo(() => {
    return tripScopedTripBuses.filter((tb) => {
      if (isDriverOrManager) {
        return (
          String(tb.driver) === String(currentUser?.id) ||
          String(tb.manager) === String(currentUser?.id)
        );
      }
      return true;
    });
  }, [tripScopedTripBuses, isDriverOrManager, currentUser?.id]);

  const activeTripObj = useMemo(
    () => trips.find((t) => String(t.id) === activeTripId),
    [trips, activeTripId],
  );

  const tripStatusInfo = useMemo(() => {
    if (!activeTripObj) return null;
    const now = dayjs();
    const startDate = dayjs(activeTripObj.start_date).startOf("day");
    const endDate = dayjs(activeTripObj.end_date).endOf("day");
    const isOverdue = now.isAfter(endDate);
    const isStarted = now.isAfter(startDate) || now.isSame(startDate, "day");
    return { isOverdue, isStarted, status: activeTripObj.status };
  }, [activeTripObj]);

  const isLoadingData =
    loadingTrips ||
    loadingPassengers ||
    loadingRounds ||
    loadingRoundBuses ||
    loadingTripBuses ||
    loadingBuses ||
    loadingTransactions ||
    loadingTransfers;

  const isRefreshingData =
    fetchingTrips ||
    fetchingPassengers ||
    fetchingRounds ||
    fetchingRoundBuses ||
    fetchingTripBuses ||
    fetchingBuses ||
    fetchingTransactions ||
    fetchingTransfers;

  return {
    currentUser,
    trips,
    tripPassengers,
    passengerHomeBusMap,
    rounds,
    roundBuses,
    tripBuses,
    buses,
    transactions,
    passengerTransfers,
    passengerTransferMap,
    transferByPassenger,
    passengerTransfersByTrip,
    tripBusesByTrip,
    roundsByTrip,
    roundToTrip,
    busLabelMap,
    tripBusLabelMap,
    roundBusByKey,
    roundBusesByRound,
    roundBusToRound,
    roundBusToTripBus,
    canOperateTripBus,
    canOperateRoundBus,
    finalizedRoundBuses,
    checkoutFinalizedRoundBuses,
    transactionsForActiveRound,
    transactionByPassenger,
    tripScopedRound,
    tripRoundsSorted,
    isRoundFullyFinalized,
    openRoundId,
    openRoundLabel,
    tripLockedForAttendance,
    roundLockedBySequence,
    roundAlreadyFinalized,
    canModifyRound,
    roundBusIdFor,
    getRoundVisualStatus,
    tripScopedTripBuses,
    isDriverOrManager,
    visibleTripBuses,
    activeTripObj,
    tripStatusInfo,
    isLoadingData,
    isRefreshingData,
    passengerBusAtStartOfRound,
  };
}
