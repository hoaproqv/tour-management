import React, { useState } from "react";

import { MenuOutlined } from "@ant-design/icons";
import { Button } from "antd";
import { Outlet } from "react-router-dom";

import Sidebar from "../components/Sidebar";

export default function SidebarLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="pt-header-height pb-[45px] bg-[#f2f3f7] h-screen overflow-hidden flex flex-col">
      <div className="flex flex-row flex-1 overflow-hidden">
        {/* Desktop sidebar – always visible */}
        <div className="hidden md:flex h-full overflow-y-auto custom-scrollbar">
          <Sidebar />
        </div>

        {/* Mobile sidebar – overlay drawer */}
        <div className="md:hidden">
          <Sidebar
            mobileOpen={mobileOpen}
            onMobileClose={() => setMobileOpen(false)}
          />
        </div>

        <main className="flex-1 min-w-0 px-3 md:px-6 pb-10 overflow-y-auto custom-scrollbar">
          {/* Mobile toggle button */}
          <div className="md:hidden sticky top-0 z-30 bg-[#f2f3f7] py-3 -mx-3 px-3 mb-4 shadow-sm border-b border-gray-200 flex items-center justify-between">
            <span className="font-medium text-gray-700">Trình điều khiển</span>
            <Button
              type="primary"
              icon={<MenuOutlined />}
              onClick={() => setMobileOpen(true)}
              className="bg-sky-600 hover:bg-sky-700 shadow-sm"
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
