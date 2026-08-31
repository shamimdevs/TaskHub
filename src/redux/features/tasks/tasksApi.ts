import { baseApi } from "@/redux/base/api";
import type { Task } from "@/types";

export const tasksApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getTasks: build.query<Task[], { platform?: string; type?: string } | void>({
      query: (params) => ({ url: "/tasks", params: params ?? undefined }),
      providesTags: (res) =>
        res
          ? [...res.map((t) => ({ type: "Task" as const, id: t.id })), { type: "Task" as const, id: "LIST" }]
          : [{ type: "Task" as const, id: "LIST" }],
    }),
    getTask: build.query<Task, string>({
      query: (id) => `/tasks/${id}`,
      providesTags: (_r, _e, id) => [{ type: "Task", id }],
    }),
  }),
});

export const { useGetTasksQuery, useGetTaskQuery } = tasksApi;
