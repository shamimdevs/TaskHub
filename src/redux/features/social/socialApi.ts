import { baseApi } from "@/redux/base/api";
import type { Platform, SocialAccount } from "@/types";

export type { SocialAccount };

export interface SocialAccountsResponse {
  /**
   * Providers this server can run an OAuth link for right now. Partial: a
   * platform with no integration at all is absent, not false.
   */
  available: Partial<Record<Platform, boolean>>;
  /** Providers a worker may instead claim by handle. */
  claimable: Platform[];
  /** Of those, the ones whose claim this server can actually settle. */
  codeVerifiable: Platform[];
  accounts: SocialAccount[];
}

export const socialApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getSocialAccounts: build.query<SocialAccountsResponse, void>({
      query: () => "/integrations/social",
      providesTags: [{ type: "SocialAccount", id: "LIST" }],
    }),
    /** Reserve a handle on a platform that will not confirm one itself. */
    claimSocialAccount: build.mutation<
      SocialAccount,
      { provider: Platform; username: string }
    >({
      query: (body) => ({ url: "/integrations/social", method: "POST", body }),
      invalidatesTags: [{ type: "SocialAccount", id: "LIST" }],
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
    /** Ask the server to look for the profile code right now. */
    checkSocialAccount: build.mutation<
      { verified: boolean; throttled?: boolean; account: SocialAccount },
      string
    >({
      query: (id) => ({
        url: `/integrations/social/${id}/check`,
        method: "POST",
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
  useClaimSocialAccountMutation,
  useCheckSocialAccountMutation,
  useSetSocialProfileUrlMutation,
  useUnlinkSocialAccountMutation,
} = socialApi;
