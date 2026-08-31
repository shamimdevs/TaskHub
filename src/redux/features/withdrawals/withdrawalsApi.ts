import { baseApi } from "@/redux/base/api";
import type { PaymentMethod, Withdrawal } from "@/types";

export interface CreateWithdrawalBody {
  method: PaymentMethod;
  accountNumber: string;
  amount: number;
}

export const withdrawalsApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getWithdrawals: build.query<Withdrawal[], { scope?: "mine" | "all" } | void>({
      query: (params) => ({ url: "/withdrawals", params: params ?? undefined }),
      providesTags: [{ type: "Withdrawal", id: "LIST" }],
    }),
    createWithdrawal: build.mutation<Withdrawal, CreateWithdrawalBody>({
      query: (body) => ({ url: "/withdrawals", method: "POST", body }),
      invalidatesTags: [
        { type: "Withdrawal", id: "LIST" },
        { type: "Wallet", id: "ME" },
      ],
    }),
    reviewWithdrawal: build.mutation<
      Withdrawal,
      { id: string; action: "approve" | "reject" | "markPaid"; note?: string }
    >({
      query: ({ id, ...body }) => ({ url: `/withdrawals/${id}`, method: "PATCH", body }),
      invalidatesTags: [
        { type: "Withdrawal", id: "LIST" },
        { type: "Kpi", id: "ADMIN" },
      ],
    }),
  }),
});

export const {
  useGetWithdrawalsQuery,
  useCreateWithdrawalMutation,
  useReviewWithdrawalMutation,
} = withdrawalsApi;
