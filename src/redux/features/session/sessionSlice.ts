import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { Role } from "@/types";

const STORAGE_KEY = "taskhub.role";

function readRole(): Role {
  if (typeof window === "undefined") return "worker";
  const v = window.localStorage.getItem(STORAGE_KEY);
  return v === "buyer" || v === "admin" || v === "worker" ? v : "worker";
}

interface SessionState {
  /** Active panel role. In this design pass it is switched via <RoleSwitcher>. */
  role: Role;
  /** Mobile drawer open state (shared so Topbar + Sidebar stay in sync). */
  mobileNavOpen: boolean;
}

const initialState: SessionState = {
  role: readRole(),
  mobileNavOpen: false,
};

const sessionSlice = createSlice({
  name: "session",
  initialState,
  reducers: {
    setRole(state, action: PayloadAction<Role>) {
      state.role = action.payload;
      if (typeof window !== "undefined") {
        window.localStorage.setItem(STORAGE_KEY, action.payload);
      }
    },
    setMobileNavOpen(state, action: PayloadAction<boolean>) {
      state.mobileNavOpen = action.payload;
    },
  },
});

export const { setRole, setMobileNavOpen } = sessionSlice.actions;
export default sessionSlice.reducer;
