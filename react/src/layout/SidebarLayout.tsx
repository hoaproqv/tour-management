import React, { useState } from "react";

import { MenuOutlined } from "@ant-design/icons";
import { Button } from "antd";
import { Outlet } from "react-router-dom";

import Sidebar from "../components/Sidebar";

export default function SidebarLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="mt-header-height">
      <div className="flex flex-row pt-header-height bg-[#f2f3f7] min-h-screen">
        {/* Desktop sidebar – always visible */}
        <div className="hidden md:flex">
          <Sidebar />
        </div>

        {/* Mobile sidebar – overlay drawer */}
        <div className="md:hidden">
          <Sidebar
            mobileOpen={mobileOpen}
            onMobileClose={() => setMobileOpen(false)}
          />
        </div>

        <main className="flex-1 min-w-0 px-3 md:px-6 pb-10">
          {/* Mobile toggle button */}
          <div className="flex md:hidden items-center pt-3 pb-2">
            <Button
              type="default"
              icon={<MenuOutlined />}
              onClick={() => setMobileOpen(true)}
              size="small"
              className="mr-2 border-slate-300"
            >
              Menu
            </Button>
          </div>

          <Outlet />
        </main>
      </div>
    </div>
  );
}
