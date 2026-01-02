export interface IIconProps {
  width?: number | string;
  height?: number | string;
  fill?: string;
}

export interface IDealItem {
  ticket: number;
  symbol: string;
  entry: number;
  type: number;
  volume: number;
  profit: number;
  time: string | Date;
  price: number;
  entry_display: string; // "in" | "out" | "in/out" | "out by"
  type_display?: string; // "Buy" | "Sell"
  reason_display?: string;
}

export interface IListDealResponse {
  deals: IDealItem[];
}

export interface IListHistoryDealItem {
  ticket: number;
  order: number;
  position_id: number;
  symbol: string;
  type: string;
  volume: number;
  price: number;
  profit: number;
  swap: number;
  commission: number;
  fee: number;
  magic: number;
  comment: string;
  time: string;
  entry: string;
}

interface IPagination {
  page: number;
  limit: number;
  total_pages: number;
  total_items: number;
}

export interface IListHistoryDealResponse {
  data: IListHistoryDealItem[];
  pagination: IPagination;
}

export interface IHistoryFilterSettings {
  symbols: string[];
  type: string[];
  entry: string[];
  profit_type: string[];
}

export interface IPositionItem {
  ticket: number;
  symbol: string;
  volume: number;
  price_open: number;
  price_current: number;
  sl: number | null;
  tp: number | null;
  profit: number;
  time: string;
  comment: string;
  swap: number;
  type: string; // "buy" | "sell"
  magic: number;
}

export interface IOrderItem {
  ticket: number;
  symbol: string;
  volume: number;
  price: number;
  stop_loss: number | null;
  take_profit: number | null;
  order_type: string;
  comment: string;
  stoplimit: number;
  time_setup: string | Date;
}

export interface ICreateOrderPayload {
  symbol: string;
  volume: number;
  type: string;
  price?: number;
  sl?: number;
  tp?: number;
}

export interface IDeleteOrderPayload {
  ticket: number;
}

export interface IHistorySummaryResponse {
  summary: {
    total_profit: number;
    total_loss: number;
    total_deals: number;
    average_profit: number;
  };
}

export interface ISymbol {
  uuid: string;
  ticker: string;
  code: string;
  description: string;
  created_at: string;
  updated_at: string;
}

export interface ISymbolListResponse {
  symbols: ISymbol[];
}

export interface IItem {
  label: string;
  value: string | number;
}

export interface ILoginFormData {
  username: string;
  password: string;
}

export interface IRegisterFormData {
  username: string;
  email: string;
  name: string;
  password: string;
}

export interface IUser {
  id: string | number;
  username: string;
  email: string;
  name: string;
  tenant?: string | number | null;
  role?: string | number | null;
  is_active?: boolean;
  is_staff?: boolean;
}
