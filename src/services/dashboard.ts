/**
 * Dashboard data. Phase 1: mock implementation with latency and a scenario switch so reviewers can see
 * the populated, empty and failed states. Phase 2: replace with API calls of the same shape.
 */
import type { DashboardPeriod, DashboardSnapshot, FunnelStep } from "@/types";
import { emptySnapshot, funnelFor, snapshotFor } from "@/mocks/dashboard";

export type DashboardScenario = "sample" | "empty" | "error";

export interface DashboardService {
  getSnapshot(period: DashboardPeriod, scenario?: DashboardScenario): Promise<DashboardSnapshot>;
  getFunnel(period: DashboardPeriod, vacancyId: string | "all", scenario?: DashboardScenario): Promise<FunnelStep[]>;
}

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

export const mockDashboard: DashboardService = {
  async getSnapshot(period, scenario = "sample") {
    await wait(650);
    if (scenario === "error") throw new Error("The dashboard service did not respond within 30 seconds.");
    return scenario === "empty" ? emptySnapshot(period) : snapshotFor(period);
  },
  async getFunnel(period, vacancyId, scenario = "sample") {
    await wait(350);
    if (scenario === "error") throw new Error("The funnel could not be loaded.");
    if (scenario === "empty") return funnelFor(period, "all").map((s) => ({ ...s, count: 0 }));
    return funnelFor(period, vacancyId);
  },
};
