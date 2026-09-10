import { baseApi } from "@/redux/base/api";
import type { User, WalletTransaction } from "@/types";

export interface WalletResponse {
  user: Pick<
    User,
    "id" | "name" | "role" | "balance" | "heldBalance" | "lifetimeEarned" | "lifetimeSpent"
  >;
  transactions: WalletTransaction[];
}

export const walletApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getWallet: build.query<WalletResponse, void>({
      query: () => "/wallet",
      providesTags: [{ type: "Wallet", id: "ME" }],
    }),
  }),
});

export const { useGetWalletQuery } = walletApi;
