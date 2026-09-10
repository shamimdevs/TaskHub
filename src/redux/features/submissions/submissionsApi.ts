import { baseApi } from "@/redux/base/api";
import type { Submission, SubmissionStatus } from "@/types";

export interface CreateSubmissionBody {
  taskId: string;
  proofUrl: string;
  proofNote?: string;
}

export const submissionsApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getSubmissions: build.query<Submission[], { status?: SubmissionStatus | "all" } | void>({
      query: (params) => ({ url: "/submissions", params: params ?? undefined }),
      providesTags: [{ type: "Submission", id: "LIST" }],
    }),
    createSubmission: build.mutation<Submission, CreateSubmissionBody>({
      query: (body) => ({ url: "/submissions", method: "POST", body }),
      invalidatesTags: [
        { type: "Submission", id: "LIST" },
        { type: "Task", id: "LIST" },
      ],
    }),
    reviewSubmission: build.mutation<
      Submission,
      { id: string; action: "reject" | "penalize"; note?: string }
    >({
      query: ({ id, ...body }) => ({ url: `/submissions/${id}`, method: "PATCH", body }),
      invalidatesTags: [
        { type: "Submission", id: "LIST" },
        { type: "Kpi", id: "ADMIN" },
        { type: "Wallet", id: "ME" },
      ],
    }),
  }),
});

export const {
  useGetSubmissionsQuery,
  useCreateSubmissionMutation,
  useReviewSubmissionMutation,
} = submissionsApi;
