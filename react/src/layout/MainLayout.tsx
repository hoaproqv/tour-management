import React from "react";

import { Outlet } from "react-router-dom";

import Footer from "../components/Footer";
import Header from "../components/Header";
import { usePushNotifications } from "../hooks/usePushNotifications";

export const MainLayout = () => {
  usePushNotifications();

  return (
    <div className="wrapper h-full">
      <Header />
      <Outlet />
      <Footer />
    </div>
  );
};
