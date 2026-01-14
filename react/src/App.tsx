// App.tsx
import React, { useEffect } from "react";

import { Route, Routes } from "react-router-dom";

import { fetchCsrfToken } from "./api/auth";
import ProtectedRoute from "./components/ProtectedRoute";
import { MainLayout } from "./layout/MainLayout";
import SidebarLayout from "./layout/SidebarLayout";
import { Account } from "./pages/AccountPage/Account";
import LoginPage from "./pages/AccountPage/Login";
import RegisterPage from "./pages/AccountPage/Register";
import BusManagement from "./pages/Bus/BusManagement";
import DashboardPage from "./pages/Dashboard";
import NotFoundPage from "./pages/NotFound";
import PassengerManagement from "./pages/Passengers/PassengerManagement";
import RoundManagement from "./pages/Rounds/RoundManagement";
import TenantManagement from "./pages/Tenants/TenantManagement";
import TransactionManagement from "./pages/Transactions/TransactionManagement";
import TripManagement from "./pages/Trips/TripManagement";
import { ROUTES } from "./utils/routers";

function App() {
  useEffect(() => {
    fetchCsrfToken();
  }, []);
  return (
    <Routes>
      <Route path={ROUTES.LOGIN} element={<LoginPage />} />
      <Route path={ROUTES.REGISTER} element={<RegisterPage />} />
      {/* Các trang dùng chung layout */}
      <Route element={<ProtectedRoute />}>
        <Route element={<MainLayout />}>
          <Route element={<SidebarLayout />}>
            <Route path={ROUTES.DASHBOARD} element={<DashboardPage />} />
            <Route path={ROUTES.TRIP} element={<TripManagement />} />
            <Route path={ROUTES.ROUND} element={<RoundManagement />} />
            <Route path={ROUTES.BUS} element={<BusManagement />} />
            <Route path={ROUTES.PASSENGER} element={<PassengerManagement />} />
            <Route
              path={ROUTES.TRANSACTIONS}
              element={<TransactionManagement />}
            />
            <Route path={ROUTES.TENANT} element={<TenantManagement />} />
            <Route path={ROUTES.ACCOUNT} element={<Account />} />
            <Route path={ROUTES.NOT_FOUND} element={<NotFoundPage />} />
          </Route>
        </Route>
      </Route>
    </Routes>
  );
}

export default App;
