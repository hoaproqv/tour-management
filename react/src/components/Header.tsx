import React from "react";

import {
  ExportOutlined,
  SettingOutlined,
  UserOutlined,
} from "@ant-design/icons";
import { Avatar, Dropdown, Space } from "antd";
import { Link } from "react-router-dom";

import { useLogout } from "../hooks/useAuth";
import { getAccountFromLocalStorage } from "../utils/helper";
import { ROUTES } from "../utils/routers";

import { LogoIcon } from "./LogoIcon";
import { NotificationDropdown } from "./NotificationDropdown";

import type { MenuProps } from "antd";

function Header() {
  const { mutate: logout } = useLogout();
  const account = getAccountFromLocalStorage();

  const items: MenuProps["items"] = [
    {
      key: "profile",
      label: (
        <Link to={ROUTES.PROFILE} className="font-medium text-slate-700">
          <Space>
            <UserOutlined className="text-blue-500" />
            Thông tin cá nhân
          </Space>
        </Link>
      ),
    },
    {
      key: "settings",
      label: (
        <Link to={ROUTES.SETTINGS} className="font-medium text-slate-700">
          <Space>
            <SettingOutlined className="text-slate-500" />
            Cài đặt
          </Space>
        </Link>
      ),
    },
    { type: "divider" },
    {
      key: "logout",
      danger: true,
      label: (
        <div onClick={() => logout()} className="font-medium">
          <Space>
            <ExportOutlined />
            Đăng xuất
          </Space>
        </div>
      ),
    },
  ];

  return (
    <header className="fixed top-0 left-0 right-0 w-full h-header-height bg-slate-900/95 backdrop-blur-md border-b border-white/10 shadow-sm z-50 flex items-center">
      <div className="w-full flex items-center justify-between px-6">
        <Link
          to={ROUTES.DASHBOARD}
          className="flex items-center gap-3 text-white group"
        >
          <div className="bg-white/10 border border-white/20 backdrop-blur-md rounded-xl h-10 w-10 flex items-center justify-center shadow-lg group-hover:bg-white/20 transition-all duration-300">
            <LogoIcon className="w-6 h-6 drop-shadow-sm" />
          </div>
          <div>
            <p className="text-xs uppercase tracking-wider text-cyan-400 font-semibold mb-0.5">
              GoTrip
            </p>
            <p className="text-lg font-bold leading-none text-white tracking-tight">
              Quản Lý Chuyến Đi
            </p>
          </div>
        </Link>

        <div className="flex items-center gap-4 text-white">
          <div className="flex gap-2 items-center">
            <NotificationDropdown />
          </div>

          <div className="h-8 w-px bg-white/20 mx-2 hidden sm:block"></div>

          <Dropdown
            menu={{ items }}
            placement="bottomRight"
            arrow={{ pointAtCenter: true }}
            trigger={["click"]}
          >
            <div className="flex items-center gap-3 cursor-pointer hover:bg-white/5 p-1.5 pr-3 rounded-full transition-all border border-transparent hover:border-white/10">
              <div className="p-[2px] rounded-full bg-gradient-to-r from-cyan-400 to-blue-500">
                <Avatar
                  size={36}
                  style={{
                    backgroundColor: "#1e293b",
                    color: "#38bdf8",
                    border: "2px solid #1e293b",
                  }}
                >
                  {(account?.name || "User").charAt(0).toUpperCase()}
                </Avatar>
              </div>
              <div className="leading-tight hidden sm:block">
                <p className="font-bold text-sm text-white mb-0.5">
                  {account?.name || "My Name"}
                </p>
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]"></div>
                  <p className="text-[11px] font-medium text-slate-300 uppercase tracking-wider">
                    Online
                  </p>
                </div>
              </div>
            </div>
          </Dropdown>
        </div>
      </div>
    </header>
  );
}

export default Header;
