import { baseApi } from "@/redux/base/api";
import type { Referral } from "@/types";

export interface ReferralSummary {
  code: string;
  link: string;
  totalInvited: number;
  totalEarned: number;
  bonusPerReferral: number;
  people: Referral[];
}

export const referralsApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getReferrals: build.query<ReferralSummary, void>({
      query: () => "/referrals",
      providesTags: [{ type: "Referral", id: "ME" }],
    }),
  }),
});

export const { useGetReferralsQuery } = referralsApi;
