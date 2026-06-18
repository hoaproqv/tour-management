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
  const roleSlug = getRoleSlug(account);
  return roleSlug === "tour_manager" || roleSlug === "company_manager";
};

export const isCompanyManager = (account?: Partial<IUser> | null) => {
  return getRoleSlug(account) === "company_manager";
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

export const compareVietnameseNames = (nameA: string, nameB: string): number => {
  const getSortKeys = (fullName: string) => {
    const parts = fullName.trim().split(/\s+/);
    const firstName = parts[parts.length - 1] || "";
    const lastName = parts[0] || "";
    const middleName = parts.slice(1, -1).join(" ");
    return { firstName, middleName, lastName };
  };

  const keysA = getSortKeys(nameA);
  const keysB = getSortKeys(nameB);

  const cmpFirst = keysA.firstName.localeCompare(keysB.firstName, 'vi', { sensitivity: 'base' });
  if (cmpFirst !== 0) return cmpFirst;

  const cmpMiddle = keysA.middleName.localeCompare(keysB.middleName, 'vi', { sensitivity: 'base' });
  if (cmpMiddle !== 0) return cmpMiddle;

  return keysA.lastName.localeCompare(keysB.lastName, 'vi', { sensitivity: 'base' });
};

export const extractApiError = (error: any, defaultMessage: string = "Có lỗi xảy ra"): string => {
  if (error?.response?.data?.detail) {
    return String(error.response.data.detail);
  }
  if (error?.response?.data?.message) {
    return String(error.response.data.message);
  }
  if (typeof error?.detail === 'string') {
     return error.detail;
  }
  if (typeof error?.message === 'string') {
     return error.message;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return defaultMessage;
};
