import { BASE_URL } from "../utils/constant";

import { fetchData, postData } from "./api";

import type {
  ICreateOrderPayload,
  IDeleteOrderPayload,
  IHistoryFilterSettings,
  IHistorySummaryResponse,
  IListDealResponse,
  IListHistoryDealResponse,
} from "../utils/types";

const BASE_MT5_MANAGEMENT_URL = BASE_URL.MT5_MANAGEMENT;

export const getHistorySummary = async (): Promise<IHistorySummaryResponse> => {
  const response = await fetchData(
    `${BASE_MT5_MANAGEMENT_URL}/history_summary`,
  );
  return response;
};

export interface ISymbol {
  code: string;
  description: string;
  path: string;
  is_selected: boolean;
}

export const createOrder = async (
  payload: ICreateOrderPayload,
): Promise<any> => {
  const response = await postData(
    `${BASE_MT5_MANAGEMENT_URL}/create_order`,
    payload,
  );
  return response;
};

export const getListDeal = async (): Promise<IListDealResponse> => {
  const response = await fetchData(`${BASE_MT5_MANAGEMENT_URL}/deals`);
  return response;
};

export const getHistoryDeals = async (
  page: number,
  limit: number,
  filter: string | null = null,
): Promise<IListHistoryDealResponse> => {
  const response = await fetchData(
    `${BASE_MT5_MANAGEMENT_URL}/history_deals?page=${page}&limit=${limit}&${filter ? `${filter}` : ""}`,
  );
  return response;
};

export const getHistoryFilterSettings =
  async (): Promise<IHistoryFilterSettings> => {
    const response = await fetchData(
      `${BASE_MT5_MANAGEMENT_URL}/history_filter`,
    );
    return response;
  };

export const deleteOrder = async (
  payload: IDeleteOrderPayload,
): Promise<any> => {
  const response = await postData(
    `${BASE_MT5_MANAGEMENT_URL}/delete_order`,
    payload,
  );
  return response;
};

export const closePosition = async (
  payload: IDeleteOrderPayload,
): Promise<any> => {
  const response = await postData(
    `${BASE_MT5_MANAGEMENT_URL}/close_position`,
    payload,
  );
  return response;
};

export const closeAllPosition = async (): Promise<any> => {
  const response = await postData(
    `${BASE_MT5_MANAGEMENT_URL}/close_all_position`,
    {},
  );
  return response;
};

export const deleteAllOrder = async (): Promise<any> => {
  const response = await postData(
    `${BASE_MT5_MANAGEMENT_URL}/delete_all_order`,
    {},
  );
  return response;
};
