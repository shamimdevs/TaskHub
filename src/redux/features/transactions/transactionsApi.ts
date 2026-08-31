import { baseApi } from "@/redux/base/api";
import type { TxnType, WalletTransaction } from "@/types";

export const transactionsApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getTransactions: build.query<
      WalletTransaction[],
      { type?: TxnType | "all" } | void
    >({
      query: (params) => ({ url: "/transactions", params: params ?? undefined }),
      providesTags: [{ type: "Wallet", id: "ALL" }],
    }),
  }),
});

export const { useGetTransactionsQuery } = transactionsApi;
