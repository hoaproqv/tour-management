import React from "react";

import { Spin } from "antd";
import { Navigate, Outlet, useLocation } from "react-router-dom";

import { useGetAccountInfo } from "../hooks/useAuth";
import { ROUTES } from "../utils/routers";

const ProtectedRoute = () => {
  const location = useLocation();
  const accessToken =
    typeof window !== "undefined" ? localStorage.getItem("access_token") : null;

  const { isLoading, isError } = useGetAccountInfo({
    enabled: Boolean(accessToken),
  });

  if (!accessToken) {
    return <Navigate to={ROUTES.LOGIN} state={{ from: location }} replace />;
  }

  if (isLoading) {
    return (
      <div className="w-full h-screen flex items-center justify-center">
        <Spin size="large" />
      </div>
    );
  }

  if (isError) {
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    localStorage.removeItem("account");
    return <Navigate to={ROUTES.LOGIN} state={{ from: location }} replace />;
  }

  return <Outlet />;
};

export default ProtectedRoute;
