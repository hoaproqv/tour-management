// App.tsx
import React, { useEffect } from "react";

import { Route, Routes } from "react-router-dom";

import { fetchCsrfToken } from "./api/auth";
import { MainLayout } from "./layout/MainLayout";
import SidebarLayout from "./layout/SidebarLayout";
import { Account } from "./pages/AccountPage/Account";
import ForgotPassword from "./pages/AccountPage/ForgotPassword";
import LoginPage from "./pages/AccountPage/Login";
import DashboardPage from "./pages/Dashboard";
import HistoryPage from "./pages/History";
import NotFoundPage from "./pages/NotFound";
import ManageOrderPage from "./pages/OrderPage/ManageOrder";
import { ROUTES } from "./utils/routers";

function App() {
  useEffect(() => {
    fetchCsrfToken();
  }, []);
  return (
    <Routes>
      <Route path={ROUTES.LOGIN} element={<LoginPage />} />
      <Route path={ROUTES.FORGET_PASSWORD} element={<ForgotPassword />} />
      {/* Các trang dùng chung layout */}
      <Route element={<MainLayout />}>
        {/* Các trang có sidebar */}
        <Route element={<SidebarLayout />}>
          <Route path={ROUTES.DASHBOARD} element={<DashboardPage />} />
          <Route path={ROUTES.MANAGE_ORDER} element={<ManageOrderPage />} />
          <Route path={ROUTES.HISTORY} element={<HistoryPage />} />
        </Route>

        {/* Trang không dùng sidebar layout */}
        <Route path={ROUTES.ACCOUNT} element={<Account />} />
        <Route path={ROUTES.NOT_FOUND} element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}

export default App;
