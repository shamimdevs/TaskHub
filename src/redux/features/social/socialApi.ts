import { baseApi } from "@/redux/base/api";
import type { Platform } from "@/types";

export interface SocialAccount {
  id: string;
  provider: Platform;
  name: string;
  profileUrl: string | null;
  connectedAt: string;
}

export interface SocialAccountsResponse {
  /** Providers this server can actually link right now. */
  available: { facebook: boolean };
  accounts: SocialAccount[];
}

export const socialApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getSocialAccounts: build.query<SocialAccountsResponse, void>({
      query: () => "/integrations/social",
      providesTags: [{ type: "SocialAccount", id: "LIST" }],
    }),
    setSocialProfileUrl: build.mutation<
      SocialAccount,
      { id: string; profileUrl: string }
    >({
      query: ({ id, ...body }) => ({
        url: `/integrations/social/${id}`,
        method: "PATCH",
        body,
      }),
      invalidatesTags: [{ type: "SocialAccount", id: "LIST" }],
    }),
    unlinkSocialAccount: build.mutation<{ unlinked: boolean }, string>({
      query: (id) => ({ url: `/integrations/social/${id}`, method: "DELETE" }),
      invalidatesTags: [{ type: "SocialAccount", id: "LIST" }],
    }),
  }),
});

export const {
  useGetSocialAccountsQuery,
  useSetSocialProfileUrlMutation,
  useUnlinkSocialAccountMutation,
} = socialApi;
