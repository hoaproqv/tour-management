import type { RoundItem } from "../../../api/trips";

export const statusMeta: Record<
  RoundItem["status"],
  { label: string; color: string }
> = {
  planned: { label: "Chưa đến", color: "blue" },
  doing: { label: "Đang đến", color: "orange" },
  done: { label: "Đã hoàn thành", color: "green" },
};
