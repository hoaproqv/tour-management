import React from "react";

import { useQuery } from "@tanstack/react-query";
import { Select } from "antd";

import { getTrips } from "../api/trips";

interface TripFilterSelectorProps {
  value: string | null;
  onChange: (_value: string | null) => void;
  className?: string;
  allowAll?: boolean;
}

export default function TripFilterSelector({
  value,
  onChange,
  className,
  allowAll = false,
}: TripFilterSelectorProps) {
  const { data: tripsResponse, isLoading } = useQuery({
    queryKey: ["trips"],
    queryFn: () => getTrips({ page: 1, limit: 1000 }),
  });

  const trips = Array.isArray(tripsResponse?.data) ? tripsResponse.data : [];
  
  const options = trips
    .sort((a, b) => {
      const timeA = a.created_at ? new Date(a.created_at).getTime() : 0;
      const timeB = b.created_at ? new Date(b.created_at).getTime() : 0;
      return timeB - timeA;
    })
    .map((trip) => ({
      value: String(trip.id),
      label: trip.name,
    }));

  if (allowAll) {
    options.unshift({ value: "all", label: "Tất cả chuyến đi" });
  }

  return (
    <Select
      className={className}
      value={value || (allowAll ? "all" : undefined)}
      onChange={(val) => onChange(val === "all" ? "all" : val)}
      options={options}
      loading={isLoading}
      showSearch
      optionFilterProp="label"
      placeholder="Chọn chuyến đi"
    />
  );
}
