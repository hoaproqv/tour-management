import { useState, useEffect } from "react";

import { useQuery } from "@tanstack/react-query";

import { getTrips } from "../api/trips";

export function useGlobalTripFilter(allowAll: boolean = true) {
  const { data: tripsResponse, isSuccess } = useQuery({
    queryKey: ["trips"],
    queryFn: () => getTrips({ page: 1, limit: 1000 }),
  });

  const trips = Array.isArray(tripsResponse?.data) ? tripsResponse.data : [];
  
  const sortedTrips = [...trips].sort((a, b) => {
    const timeA = a.created_at ? new Date(a.created_at).getTime() : 0;
    const timeB = b.created_at ? new Date(b.created_at).getTime() : 0;
    return timeB - timeA;
  });

  const [tripFilter, setTripFilterState] = useState<string | "all" | null>(() => {
    const stored = localStorage.getItem("globalTripFilter");
    if (stored) return stored;
    return allowAll ? "all" : null;
  });

  useEffect(() => {
    if (!isSuccess) return;

    if (sortedTrips.length === 0) {
      if (tripFilter !== null && tripFilter !== "all") {
        setTripFilterState(allowAll ? "all" : null);
      }
      return;
    }

    // Check if the current filter is still valid
    let isValid = false;
    if (tripFilter === "all" && allowAll) isValid = true;
    if (sortedTrips.some((t) => String(t.id) === String(tripFilter))) isValid = true;

    if (!isValid) {
      // Default to the newest trip
      const newestId = String(sortedTrips[0].id);
      setTripFilterState(newestId);
      localStorage.setItem("globalTripFilter", newestId);
    }
  }, [sortedTrips, allowAll, isSuccess, tripFilter]);

  const setTripFilter = (val: string | "all" | null) => {
    setTripFilterState(val);
    if (val) {
      localStorage.setItem("globalTripFilter", val);
    }
  };

  return [tripFilter, setTripFilter] as const;
}
