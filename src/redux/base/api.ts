import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

/**
 * Every cache tag the app uses. Exported so the realtime bridge can refetch
 * exactly what a server-sent event invalidated.
 */
export const TAG_TYPES = [
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
] as const;

export type ApiTag = (typeof TAG_TYPES)[number];

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
  tagTypes: TAG_TYPES,
  endpoints: () => ({}),
});
