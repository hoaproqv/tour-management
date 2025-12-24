import React from "react";

import { Outlet } from "react-router-dom";

import Footer from "../components/Footer";
import Header from "../components/Header";

export const MainLayout = () => (
  <div className="wrapper h-full">
    <Header />
    <Outlet />
    <Footer />
  </div>
);
