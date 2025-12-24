export const MessageFirebasePath = {
  POSITIONS: "mt5_positions",
  ORDERS: "mt5_orders",
  DEALS: "mt5_deals",
  SUMMARY: "mt5_summary",
  STREAMING: "streaming",
};

export const DealTypeDisplay = {
  BUY: "Buy",
  SELL: "Sell",
};

export const OrderTypeTime = [
  {
    label: "GTC",
    value: 0,
  },
  {
    label: "Today",
    value: 1,
  },
  {
    label: "Specified",
    value: 2,
  },
  {
    label: "Specified day",
    value: 3,
  },
];

export const marketOrders = [
  { label: "Buy", value: 0 },
  { label: "Sell", value: 1 },
];

export const fullPendingOrders = [
  { label: "Buy Limit", value: 2 },
  { label: "Sell Limit", value: 3 },
  { label: "Buy Stop", value: 4 },
  { label: "Sell Stop", value: 5 },
  { label: "Buy Stop Limit", value: 6 },
  { label: "Sell Stop Limit", value: 7 },
];

export const expirationTimes = [
  { label: "GTC", value: 0 },
  { label: "Today", value: 1 },
  { label: "Specified", value: 2 },
  { label: "Specified day", value: 3 },
];

export const fillPolicy = [
  {
    label: "Fill or Kill",
    value: 0,
  },
  {
    label: "Immediate or Cancel",
    value: 1,
  },
];

export const BASE_URL = {
  MT5_MANAGEMENT: "/api/mt5",
  AUTH: "/auth",
};
