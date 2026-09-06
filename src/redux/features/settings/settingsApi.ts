import { baseApi } from "@/redux/base/api";
import type { PlatformSettings, RateCardEntry, SettingsPayload } from "@/types";

export const settingsApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getSettings: build.query<SettingsPayload, void>({
      query: () => "/settings",
      providesTags: [{ type: "Settings", id: "PLATFORM" }],
    }),
    updateSettings: build.mutation<
      SettingsPayload,
      Partial<PlatformSettings> & { rates?: RateCardEntry[] }
    >({
      query: (body) => ({ url: "/settings", method: "PUT", body }),
      invalidatesTags: [{ type: "Settings", id: "PLATFORM" }],
    }),
  }),
});

export const { useGetSettingsQuery, useUpdateSettingsMutation } = settingsApi;
