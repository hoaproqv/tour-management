import { useMutation } from "@tanstack/react-query";

import { createOrder } from "../api/mt5_management";

import type { ICreateOrderPayload } from "../utils/types";

export const useCreateOrder = () => {
  return useMutation({
    mutationFn: (orderData: ICreateOrderPayload) => createOrder(orderData),
  });
};
