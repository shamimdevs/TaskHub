import { baseApi } from "@/redux/base/api";
import type { Notification } from "@/types";

export const notificationsApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getNotifications: build.query<Notification[], void>({
      query: () => "/notifications",
      providesTags: [{ type: "Notification", id: "LIST" }],
    }),
    markNotificationsRead: build.mutation<{ ok: true }, void>({
      query: () => ({ url: "/notifications", method: "PATCH" }),
      invalidatesTags: [{ type: "Notification", id: "LIST" }],
    }),
  }),
});

export const { useGetNotificationsQuery, useMarkNotificationsReadMutation } =
  notificationsApi;
