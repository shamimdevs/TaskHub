import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

/**
 * Single RTK Query API slice. Feature endpoints are injected from
 * `src/redux/features/*` so code-splitting stays clean.
 * Requests hit the real Route Handlers under `src/app/api/*`; the Better Auth
 * session cookie rides along automatically (same-origin).
 */
export const baseApi = createApi({
  reducerPath: "api",
  baseQuery: fetchBaseQuery({
    baseUrl: "/api",
    credentials: "same-origin",
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
    "FacebookPage",
    "SocialAccount",
  ],
  endpoints: () => ({}),
});
