import type { DashboardPeriod } from "@/types";

export const PERIOD_LABEL: Record<DashboardPeriod, string> = {
  "7d": "Last 7 days",
  "30d": "Last 30 days",
  "90d": "Last 90 days",
};

export const PREVIOUS_LABEL: Record<DashboardPeriod, string> = {
  "7d": "previous 7 days",
  "30d": "previous 30 days",
  "90d": "previous 90 days",
};

export const HISTORY_LABEL: Record<DashboardPeriod, string> = {
  "7d": "Last 8 days",
  "30d": "Last 8 weeks",
  "90d": "Last 8 months",
};
