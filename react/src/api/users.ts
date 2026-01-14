import { deleteData, fetchData, postData, putData } from "./api";

import type { PaginatedParams, PaginatedResponse } from "./tenants";
import type { IRoleItem, IUser, IUserPayload } from "../utils/types";

export interface UserListParams extends PaginatedParams {
  role?: string;
  tenant?: string | number;
}

const buildQueryString = (
  params: UserListParams,
  defaultLimit: number,
): { queryString: string; page: number; limit: number } => {
  const page = params.page ?? 1;
  const limit = params.limit ?? defaultLimit;
  const search = params.search ?? "";
  const role = params.role ?? "";
  const tenant = params.tenant;

  const query = new URLSearchParams({
    page: String(page),
    limit: String(limit),
  });

  if (search.trim()) {
    query.append("search", search.trim());
  }

  if (role.trim()) {
    query.append("role", role.trim());
  }

  if (tenant !== undefined && tenant !== null && `${tenant}`.trim()) {
    query.append("tenant", `${tenant}`.trim());
  }

  const queryString = query.toString();
  return { queryString, page, limit };
};

const normalizePaginated = <T>(
  res: unknown,
  fallback: { page: number; limit: number },
): PaginatedResponse<T> => {
  const data = Array.isArray((res as { data?: unknown })?.data)
    ? ((res as { data: T[] }).data ?? [])
    : [];

  return {
    data,
    pagination: {
      page:
        (res as { pagination?: { page?: number } })?.pagination?.page ??
        fallback.page,
      limit:
        (res as { pagination?: { limit?: number } })?.pagination?.limit ??
        fallback.limit,
      total_page:
        (res as { pagination?: { total_page?: number } })?.pagination
          ?.total_page ?? 1,
      total_items:
        (res as { pagination?: { total_items?: number } })?.pagination
          ?.total_items ?? data.length,
    },
  };
};

export const getUsers = async (
  params: UserListParams = {},
): Promise<PaginatedResponse<IUser>> => {
  const { queryString, page, limit } = buildQueryString(params, 20);
  const res = await fetchData(`/users/${queryString ? `?${queryString}` : ""}`);
  return normalizePaginated<IUser>(res, { page, limit });
};

export const createUser = async (payload: IUserPayload) =>
  postData("/users/", payload);

export const updateUser = async (
  id: number | string,
  payload: Partial<IUserPayload>,
) => putData(`/users/${id}/`, payload);

export const deleteUser = async (id: number | string) =>
  deleteData(`/users/${id}/`);

export const getRoles = async (): Promise<IRoleItem[]> => {
  const res = await fetchData("/roles/");
  if (Array.isArray((res as { data?: unknown })?.data)) {
    return (res as { data: IRoleItem[] }).data;
  }
  if (Array.isArray(res)) return res as IRoleItem[];
  return [];
};
