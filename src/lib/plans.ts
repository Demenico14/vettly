/** Plan limits, shared by the browser and the server. Prices in USD a year. */
export const PLAN_LIMITS = {
  starter: { seats: 5, tests: 100, cvs: 600, price: 1200 },
  growth: { seats: 20, tests: 500, cvs: 3000, price: 4800 },
  enterprise: { seats: 50, tests: 1500, cvs: 10000, price: 15600 },
} as const;
