import { baseApi } from "@/redux/base/api";

export interface ConnectedPage {
  id: string;
  pageId: string;
  name: string;
  url: string;
  followers: number;
  lastCheckedAt: string | null;
  lastError: string | null;
}

export interface FacebookPagesResponse {
  /** False when the server has no Facebook app credentials. */
  configured: boolean;
  pages: ConnectedPage[];
}

export const facebookApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getFacebookPages: build.query<FacebookPagesResponse, void>({
      query: () => "/integrations/facebook/pages",
      providesTags: [{ type: "FacebookPage", id: "LIST" }],
    }),
    disconnectFacebookPage: build.mutation<{ disconnected: boolean }, string>({
      query: (id) => ({
        url: `/integrations/facebook/pages/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: [{ type: "FacebookPage", id: "LIST" }],
    }),
  }),
});

export const { useGetFacebookPagesQuery, useDisconnectFacebookPageMutation } =
  facebookApi;
