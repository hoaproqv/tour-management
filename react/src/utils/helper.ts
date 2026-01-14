import type { IUser } from "./types";

export const getAccountFromLocalStorage = (): IUser | null => {
  const account = localStorage.getItem("account");
  return account ? (JSON.parse(account) as IUser) : null;
};

export const getRoleSlug = (
  account?: Pick<
    IUser,
    "role_name" | "is_superuser" | "is_staff" | "role" | "id" | "username"
  > | null,
): string => {
  if (!account) return "";
  const raw = account.role_name ?? account.role ?? "";
  return raw ? raw.toString().toLowerCase() : "";
};

export const isAdminLike = (
  account?: Pick<IUser, "role_name" | "is_superuser" | "is_staff"> | null,
) => {
  const roleSlug = getRoleSlug(account);
  return Boolean(
    account?.is_superuser || account?.is_staff || roleSlug === "admin",
  );
};

export const isTourManagerLike = (
  account?: Pick<IUser, "role_name"> | null,
) => {
  return getRoleSlug(account) === "tour_manager";
};

export const isFleetLead = (account?: Pick<IUser, "role_name"> | null) => {
  return getRoleSlug(account) === "fleet_lead";
};

export const isDriver = (account?: Pick<IUser, "role_name"> | null) => {
  return getRoleSlug(account) === "driver";
};

export const canManageCatalog = (
  account?: Pick<IUser, "role_name" | "is_superuser" | "is_staff"> | null,
) => {
  return isAdminLike(account) || isTourManagerLike(account);
};
