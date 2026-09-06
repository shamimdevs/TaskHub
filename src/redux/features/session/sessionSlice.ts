import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { Role } from "@/types";

interface SessionState {
  /** Active panel role — set from the route segment by <AppShell>. */
  role: Role;
  /** Mobile drawer open state (shared so Topbar + Sidebar stay in sync). */
  mobileNavOpen: boolean;
}

const initialState: SessionState = {
  role: "worker",
  mobileNavOpen: false,
};

const sessionSlice = createSlice({
  name: "session",
  initialState,
  reducers: {
    setRole(state, action: PayloadAction<Role>) {
      state.role = action.payload;
    },
    setMobileNavOpen(state, action: PayloadAction<boolean>) {
      state.mobileNavOpen = action.payload;
    },
  },
});

export const { setRole, setMobileNavOpen } = sessionSlice.actions;
export default sessionSlice.reducer;
