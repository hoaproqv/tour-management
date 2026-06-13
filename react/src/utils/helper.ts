import type { IUser } from "./types";

export const getAccountFromLocalStorage = (): IUser | null => {
  const account = localStorage.getItem("account");
  return account ? (JSON.parse(account) as IUser) : null;
};

export const getRoleSlug = (account?: Partial<IUser> | null): string => {
  if (!account) return "";
  const raw = account.role_name ?? account.role ?? "";
  return raw ? raw.toString().toLowerCase() : "";
};

export const isAdminLike = (account?: Partial<IUser> | null) => {
  const roleSlug = getRoleSlug(account);
  return Boolean(
    account?.is_superuser || account?.is_staff || roleSlug === "admin",
  );
};

export const isTourManagerLike = (account?: Partial<IUser> | null) => {
  return getRoleSlug(account) === "tour_manager";
};

export const isFleetLead = (account?: Partial<IUser> | null) => {
  return getRoleSlug(account) === "fleet_lead";
};

export const isDriver = (account?: Partial<IUser> | null) => {
  return getRoleSlug(account) === "driver";
};

export const canManageCatalog = (account?: Partial<IUser> | null) => {
  return isAdminLike(account) || isTourManagerLike(account);
};

export const removeAccents = (str: string): string => {
  if (!str) return "";
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D");
};
