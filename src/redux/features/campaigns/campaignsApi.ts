import { baseApi } from "@/redux/base/api";
import type { Campaign, Platform, TaskType } from "@/types";

export interface CreateCampaignBody {
  platform: Platform;
  type: TaskType;
  title: string;
  targetUrl: string;
  quantity: number;
  note?: string;
  /** Connected Facebook page to verify against (facebook + follow only). */
  pageId?: string;
}

export const campaignsApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getCampaigns: build.query<Campaign[], { scope?: "mine" | "all" } | void>({
      query: (params) => ({ url: "/campaigns", params: params ?? undefined }),
      providesTags: [{ type: "Campaign", id: "LIST" }],
    }),
    getCampaign: build.query<Campaign, string>({
      query: (id) => `/campaigns/${id}`,
      providesTags: (_r, _e, id) => [{ type: "Campaign", id }],
    }),
    createCampaign: build.mutation<Campaign, CreateCampaignBody>({
      query: (body) => ({ url: "/campaigns", method: "POST", body }),
      invalidatesTags: [
        { type: "Campaign", id: "LIST" },
        { type: "Wallet", id: "ME" },
      ],
    }),
    updateCampaign: build.mutation<
      Campaign,
      { id: string; status: Campaign["status"] }
    >({
      query: ({ id, ...body }) => ({ url: `/campaigns/${id}`, method: "PATCH", body }),
      invalidatesTags: (_r, _e, { id }) => [
        { type: "Campaign", id },
        { type: "Campaign", id: "LIST" },
      ],
    }),
  }),
});

export const {
  useGetCampaignsQuery,
  useGetCampaignQuery,
  useCreateCampaignMutation,
  useUpdateCampaignMutation,
} = campaignsApi;
