import { deleteData, fetchData, postData, putData } from "./api";

export interface TenantItem {
  id: number | string;
  name: string;
  description: string;
  created_at?: string;
  updated_at?: string;
}

export type TenantPayload = Omit<
  TenantItem,
  "id" | "created_at" | "updated_at"
>;

export interface PaginationInfo {
  page: number;
  limit: number;
  total_page: number;
  total_items: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: PaginationInfo;
}

export interface PaginatedParams {
  page?: number;
  limit?: number;
  search?: string;
}

const buildQueryString = (
  params: PaginatedParams,
  defaultLimit: number,
): { queryString: string; page: number; limit: number; search: string } => {
  const page = params.page ?? 1;
  const limit = params.limit ?? defaultLimit;
  const search = params.search ?? "";

  const query = new URLSearchParams({
    page: String(page),
    limit: String(limit),
  });

  if (search.trim()) {
    query.append("search", search.trim());
  }

  const queryString = query.toString();
  return { queryString, page, limit, search };
};

const normalizePaginated = <T>(
  res: unknown,
  fallback: { page: number; limit: number },
): PaginatedResponse<T> => {
  const data = Array.isArray((res as { data?: unknown })?.data)
    ? ((res as { data: T[] }).data ?? [])
    : [];

  const pagination: PaginationInfo = {
    page:
      (res as { pagination?: PaginationInfo })?.pagination?.page ??
      fallback.page,
    limit:
      (res as { pagination?: PaginationInfo })?.pagination?.limit ??
      fallback.limit,
    total_page:
      (res as { pagination?: PaginationInfo })?.pagination?.total_page ?? 1,
    total_items:
      (res as { pagination?: PaginationInfo })?.pagination?.total_items ??
      data.length,
  };

  return { data, pagination };
};

export const getTenants = async (
  params: PaginatedParams = {},
): Promise<PaginatedResponse<TenantItem>> => {
  const { queryString, page, limit } = buildQueryString(params, 1000);
  const res = await fetchData(
    `/tenants/${queryString ? `?${queryString}` : ""}`,
  );
  return normalizePaginated<TenantItem>(res, { page, limit });
};

export const createTenant = async (payload: TenantPayload) =>
  postData("/tenants/", payload);

export const updateTenant = async (
  id: number | string,
  payload: TenantPayload,
) => putData(`/tenants/${id}/`, payload);

export const deleteTenant = async (id: number | string) =>
  deleteData(`/tenants/${id}/`);
