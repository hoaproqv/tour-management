import React, { useState } from "react";

import { MenuOutlined } from "@ant-design/icons";
import { Button } from "antd";
import { Outlet } from "react-router-dom";

import Sidebar from "../components/Sidebar";

export default function SidebarLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="pt-header-height pb-[45px] bg-slate-50 h-screen overflow-hidden flex flex-col selection:bg-cyan-200 selection:text-cyan-900">
      <div className="flex flex-row flex-1 overflow-hidden">
        {/* Desktop sidebar – always visible */}
        <div className="hidden md:flex h-full overflow-y-auto custom-scrollbar border-r border-slate-200 shadow-[4px_0_24px_rgba(0,0,0,0.02)] z-10 relative">
          <Sidebar />
        </div>

        {/* Mobile sidebar – overlay drawer */}
        <div className="md:hidden">
          <Sidebar
            mobileOpen={mobileOpen}
            onMobileClose={() => setMobileOpen(false)}
          />
        </div>

        <main className="flex-1 min-w-0 px-4 md:px-8 pb-12 overflow-y-auto overflow-x-hidden custom-scrollbar bg-slate-50 relative">
          {/* Subtle background decoration for content area */}
          <div className="absolute top-0 right-0 w-[800px] h-[400px] bg-gradient-to-br from-blue-50/50 to-transparent pointer-events-none rounded-bl-full z-0"></div>

          {/* Mobile toggle button */}
          <div className="md:hidden sticky top-0 z-30 bg-white/80 backdrop-blur-md py-3 -mx-4 px-4 mb-6 shadow-sm border-b border-slate-200 flex items-center justify-between">
            <span className="font-bold tracking-tight text-slate-800">Trình điều khiển</span>
            <Button
              type="primary"
              icon={<MenuOutlined />}
              onClick={() => setMobileOpen(true)}
              className="bg-gradient-to-r from-blue-600 to-cyan-500 border-0 shadow-md"
            >
              Menu
            </Button>
          </div>

          <div className="relative z-10 pt-6">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
