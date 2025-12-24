import { useMutation, useQuery } from "@tanstack/react-query";

import {
  closeAllPosition,
  closePosition,
  createOrder,
  deleteAllOrder,
  deleteOrder,
  getHistoryDeals,
  getHistoryFilterSettings,
  getListDeal,
} from "../api/mt5_management";

import type {
  ICreateOrderPayload,
  IDeleteOrderPayload,
  IHistoryFilterSettings,
  IListDealResponse,
  IListHistoryDealResponse,
} from "../utils/types";

export const useGetListDeal = () => {
  return useQuery<IListDealResponse>({
    queryKey: ["list_deal"],
    queryFn: () => getListDeal(),
  });
};

export const useGetHistoryDeals = (
  page: number,
  limit: number,
  filter: string | null = null,
) => {
  return useQuery<IListHistoryDealResponse>({
    queryKey: ["history_deals", page, limit, filter],
    queryFn: () => getHistoryDeals(page, limit, filter),
  });
};

export const useGetHistoryFilterSettings = () => {
  return useQuery<IHistoryFilterSettings>({
    queryKey: ["history_filter_settings"],
    queryFn: () => getHistoryFilterSettings(),
  });
};

export const useCreateOrder = () => {
  return useMutation({
    mutationFn: (orderData: ICreateOrderPayload) => createOrder(orderData),
  });
};

export const useDeleteOrder = () => {
  return useMutation({
    mutationFn: (orderData: IDeleteOrderPayload) => deleteOrder(orderData),
  });
};

export const useClosePosition = () => {
  return useMutation({
    mutationFn: (orderData: IDeleteOrderPayload) => closePosition(orderData),
  });
};

export const useCloseAllPosition = () => {
  return useMutation({
    mutationFn: () => closeAllPosition(),
  });
};

export const useDeleteAllOrder = () => {
  return useMutation({
    mutationFn: () => deleteAllOrder(),
  });
};
