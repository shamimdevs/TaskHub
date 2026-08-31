import { baseApi } from "@/redux/base/api";
import type { Deposit, PaymentMethod } from "@/types";

export interface CreateDepositBody {
  method: PaymentMethod;
  senderNumber: string;
  trxId: string;
  amount: number;
}

export const depositsApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getDeposits: build.query<Deposit[], { scope?: "mine" | "all" } | void>({
      query: (params) => ({ url: "/deposits", params: params ?? undefined }),
      providesTags: [{ type: "Deposit", id: "LIST" }],
    }),
    createDeposit: build.mutation<Deposit, CreateDepositBody>({
      query: (body) => ({ url: "/deposits", method: "POST", body }),
      invalidatesTags: [{ type: "Deposit", id: "LIST" }],
    }),
    reviewDeposit: build.mutation<
      Deposit,
      { id: string; action: "approve" | "reject"; note?: string }
    >({
      query: ({ id, ...body }) => ({ url: `/deposits/${id}`, method: "PATCH", body }),
      invalidatesTags: [
        { type: "Deposit", id: "LIST" },
        { type: "Kpi", id: "ADMIN" },
      ],
    }),
  }),
});

export const {
  useGetDepositsQuery,
  useCreateDepositMutation,
  useReviewDepositMutation,
} = depositsApi;
