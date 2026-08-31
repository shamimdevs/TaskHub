import { baseApi } from "@/redux/base/api";
import type { User } from "@/types";

export const sessionApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getMe: build.query<User, void>({
      query: () => "/session",
      providesTags: [{ type: "Session", id: "ME" }],
    }),
  }),
});

export const { useGetMeQuery } = sessionApi;
