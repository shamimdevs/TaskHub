import { baseApi } from "@/redux/base/api";
import type { PlatformSettings } from "@/types";

export const settingsApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getSettings: build.query<PlatformSettings, void>({
      query: () => "/settings",
      providesTags: [{ type: "Settings", id: "PLATFORM" }],
    }),
    updateSettings: build.mutation<PlatformSettings, Partial<PlatformSettings>>({
      query: (body) => ({ url: "/settings", method: "PUT", body }),
      invalidatesTags: [{ type: "Settings", id: "PLATFORM" }],
    }),
  }),
});

export const { useGetSettingsQuery, useUpdateSettingsMutation } = settingsApi;
