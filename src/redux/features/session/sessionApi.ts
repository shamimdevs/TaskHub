import { baseApi } from "@/redux/base/api";
import type { User } from "@/types";

export type Me = User & {
  emailVerified: boolean;
  /** false for accounts that only ever signed in with Google */
  hasPassword: boolean;
  /** false when the server has no ImageKit credentials configured */
  canUploadImages: boolean;
};

export const sessionApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getMe: build.query<Me, void>({
      query: () => "/session",
      providesTags: [{ type: "Session", id: "ME" }],
    }),
  }),
});

export const { useGetMeQuery } = sessionApi;
