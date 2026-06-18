import { message } from "antd";
import dayjs from "dayjs";

import type { RoundItem } from "../../../api/trips";

interface ValidationResult {
  isValid: boolean;
  errorDay?: string;
}

export function validateTripRounds(
  tripDays: string[],
  localRounds: RoundItem[],
  tripId: number,
): ValidationResult {
  for (const day of tripDays) {
    const dayRounds = localRounds.filter((r) => r.round_date === day);
    let roundsToValidate = dayRounds;

    if (roundsToValidate.length === 0) {
      roundsToValidate = [
        {
          id: "mock-1",
          trip: tripId,
          sequence: 1,
          name: "Tập trung và xuất phát",
          location: "",
          round_date: day,
          estimate_time: "",
        } as unknown as RoundItem,
      ];
    }

    const sortedRounds = [...roundsToValidate].sort(
      (a, b) => a.sequence - b.sequence,
    );

    // 1. Validate completeness
    for (let i = 0; i < sortedRounds.length; i++) {
      const r = sortedRounds[i];
      if (!r.name || !r.location || !r.estimate_time) {
        message.error(
          `Ngày ${dayjs(day).format(
            "DD/MM/YYYY",
          )}: Vui lòng điền đầy đủ thông tin (tên, địa điểm, giờ) cho chặng ${
            r.sequence
          }`,
        );
        return { isValid: false, errorDay: day };
      }
    }

    // 2. Validate chronological order
    let prevTimeMinutes = -1;
    for (let i = 0; i < sortedRounds.length; i++) {
      const timeStr = sortedRounds[i].estimate_time;
      if (timeStr) {
        const [h, m] = timeStr.split(":").map(Number);
        const currentMinutes = h * 60 + m;
        if (currentMinutes < prevTimeMinutes) {
          message.error(
            `Ngày ${dayjs(day).format(
              "DD/MM/YYYY",
            )}: Thời gian dự kiến của các chặng phải hợp lý (chặng sau không được sớm hơn chặng trước)`,
          );
          return { isValid: false, errorDay: day };
        }
        prevTimeMinutes = currentMinutes;
      }
    }
  }

  return { isValid: true };
}
