import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import type { RootState } from "@/redux/store";

/**
 * Single RTK Query API slice. Feature endpoints are injected from
 * `src/redux/features/*` so code-splitting stays clean.
 * Base URL points at the mock Route Handlers under `src/app/api/*`.
 */
export const baseApi = createApi({
  reducerPath: "api",
  baseQuery: fetchBaseQuery({
    baseUrl: "/api",
    prepareHeaders: (headers, { getState }) => {
      const role = (getState() as RootState).session?.role;
      if (role) headers.set("x-role", role);
      return headers;
    },
  }),
  tagTypes: [
    "Task",
    "Submission",
    "Campaign",
    "Wallet",
    "Withdrawal",
    "Deposit",
    "User",
    "Kpi",
    "Notification",
    "Settings",
    "Session",
    "Referral",
  ],
  endpoints: () => ({}),
});
