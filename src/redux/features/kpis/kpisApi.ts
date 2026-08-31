import { baseApi } from "@/redux/base/api";
import type { AdminKpis } from "@/types";

export const kpisApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getKpis: build.query<AdminKpis, void>({
      query: () => "/kpis",
      providesTags: [{ type: "Kpi", id: "ADMIN" }],
    }),
  }),
});

export const { useGetKpisQuery } = kpisApi;
