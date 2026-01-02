import { configureStore, createSlice } from "@reduxjs/toolkit";

// Minimal placeholder slice to satisfy Redux store requirements until real slices are added.
const appSlice = createSlice({
  name: "app",
  initialState: {},
  reducers: {},
});

const store = configureStore({
  reducer: {
    app: appSlice.reducer,
  },
});

export type AppDispatch = typeof store.dispatch;
export type RootState = ReturnType<typeof store.getState>;

export default store;
