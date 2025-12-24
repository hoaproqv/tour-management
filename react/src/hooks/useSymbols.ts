import { useMutation, useQuery } from "@tanstack/react-query";

import { getSymbols, streamingSymbol } from "../api/symbol";

import type { ISymbolListResponse } from "../utils/types";

export const useGetSymbols = (searchSymbols: string) => {
  return useQuery<ISymbolListResponse>({
    queryKey: ["symbols", searchSymbols],
    queryFn: () => getSymbols(searchSymbols),
  });
};

export const useStreamingSymbol = () => {
  return useMutation({
    mutationKey: ["streamingSymbol"],
    mutationFn: (symbol: string) => streamingSymbol(symbol),
  });
};
