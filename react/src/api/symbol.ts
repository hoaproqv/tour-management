import { BASE_URL } from "../utils/constant";

import { fetchData, postData } from "./api";

import type { ISymbolListResponse } from "../utils/types";

const BASE_MT5_MANAGEMENT_URL = BASE_URL.MT5_MANAGEMENT;

export const getSymbols = async (
  searchSymbols: string,
): Promise<ISymbolListResponse> => {
  const url = searchSymbols
    ? `${BASE_MT5_MANAGEMENT_URL}/symbols?search=${searchSymbols}`
    : `${BASE_MT5_MANAGEMENT_URL}/symbols`;
  const response = await fetchData(url);

  if (!response || !response.symbols) {
    return { symbols: [] };
  }

  return response;
};

export const streamingSymbol = async (symbol: string): Promise<any> => {
  const response = await postData(
    `${BASE_MT5_MANAGEMENT_URL}/streaming_symbol`,
    { symbol },
  );
  return response;
};
