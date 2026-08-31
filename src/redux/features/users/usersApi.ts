import { baseApi } from "@/redux/base/api";
import type { Role, User } from "@/types";

export const usersApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getUsers: build.query<User[], { q?: string; role?: Role | "all" } | void>({
      query: (params) => ({ url: "/users", params: params ?? undefined }),
      providesTags: [{ type: "User", id: "LIST" }],
    }),
    getUser: build.query<User, string>({
      query: (id) => `/users/${id}`,
      providesTags: (_r, _e, id) => [{ type: "User", id }],
    }),
    updateUser: build.mutation<
      User,
      { id: string; action: "ban" | "unban" | "adjust"; reason?: string; amount?: number }
    >({
      query: ({ id, ...body }) => ({ url: `/users/${id}`, method: "PATCH", body }),
      invalidatesTags: (_r, _e, { id }) => [
        { type: "User", id },
        { type: "User", id: "LIST" },
      ],
    }),
  }),
});

export const { useGetUsersQuery, useGetUserQuery, useUpdateUserMutation } = usersApi;
