import type { AppSettings } from "@/types";

export const APP_NAME = "Our Space";

export const STORAGE_PREFIX = "ourspace.";

export const DEFAULT_SETTINGS: AppSettings = {
  anniversary: "2023-02-18",
  nextMeeting: "2026-09-28",
  nextMeetingLabel: "Gặp nhau",
  theme: "light",
  places: {
    anh: { city: "Tokyo", country: "Nhật Bản", lat: 35.6764, lng: 139.65 },
    em: { city: "TP. Hồ Chí Minh", country: "Việt Nam", lat: 10.7626, lng: 106.6602 },
  },
};

export const TIMEZONES = {
  vietnam: "Asia/Ho_Chi_Minh",
  japan: "Asia/Tokyo",
} as const;
