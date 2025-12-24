import React from "react";

import { Outlet } from "react-router-dom";

import Sidebar from "../components/Sidebar";

export default function SidebarLayout() {
  return (
    <div className="mt-header-height">
      <div className="flex flex-col md:flex-row pt-header-height bg-[#f2f3f7] min-h-screen">
        <Sidebar />
        <Outlet />
      </div>
    </div>
  );
}
