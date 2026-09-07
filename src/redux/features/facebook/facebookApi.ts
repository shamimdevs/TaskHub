import { baseApi } from "@/redux/base/api";

export interface ConnectedPage {
  id: string;
  pageId: string;
  name: string;
  url: string;
  followers: number;
  /**
   * The Instagram business account attached to this page, when there is one.
   * Its follower count is the only thing an Instagram campaign can be settled
   * against, so a page without one cannot host one.
   */
  instagram: {
    id: string;
    username: string | null;
    followers: number;
    url: string;
  } | null;
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
