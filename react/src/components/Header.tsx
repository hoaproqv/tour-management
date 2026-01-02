import React from "react";

import {
  BellOutlined,
  ExportOutlined,
  HomeOutlined,
  SettingOutlined,
  UserOutlined,
} from "@ant-design/icons";
import { Avatar, Button, Dropdown, Space, Tooltip } from "antd";
import { Link } from "react-router-dom";

import { useLogout } from "../hooks/useAuth";
import { getAccountFromLocalStorage } from "../utils/helper";
import { ROUTES } from "../utils/routers";

import type { MenuProps } from "antd";

function Header() {
  const { mutate: logout } = useLogout();
  const account = getAccountFromLocalStorage();

  const items: MenuProps["items"] = [
    {
      key: "profile",
      label: (
        <Link to={ROUTES.ACCOUNT}>
          <Space>
            <UserOutlined />
            Thông tin tài khoản
          </Space>
        </Link>
      ),
    },
    {
      key: "settings",
      label: (
        <Space>
          <SettingOutlined />
          Cài đặt
        </Space>
      ),
    },
    { type: "divider" },
    {
      key: "logout",
      danger: true,
      label: (
        <div onClick={() => logout()}>
          <Space>
            <ExportOutlined />
            Đăng xuất
          </Space>
        </div>
      ),
    },
  ];

  return (
    <header className="fixed top-0 left-0 right-0 w-full h-header-height bg-sky-700 shadow-md z-50 flex items-center">
      <div className="w-full flex items-center justify-between px-5">
        <Link
          to={ROUTES.DASHBOARD}
          className="flex items-center gap-3 text-white"
        >
          <div className="bg-white/20 rounded-full h-10 w-10 flex items-center justify-center">
            <HomeOutlined className="text-xl" />
          </div>
          <div>
            <p className="text-sm leading-tight">Tour Management</p>
            <p className="text-lg font-semibold leading-tight">Dashboard</p>
          </div>
        </Link>

        <div className="flex items-center gap-3 text-white">
          <Tooltip title="Thông báo">
            <Button
              type="text"
              className="text-white"
              icon={<BellOutlined className="text-lg" />}
            />
          </Tooltip>
          <Tooltip title="Cài đặt">
            <Button
              type="text"
              className="text-white"
              icon={<SettingOutlined className="text-lg" />}
            />
          </Tooltip>

          <Dropdown menu={{ items }} placement="bottomRight" arrow>
            <div className="flex items-center gap-2 cursor-pointer">
              <Avatar
                size={36}
                style={{ backgroundColor: "#fff", color: "#0f4bb8" }}
              >
                {(account?.name || "User").charAt(0).toUpperCase()}
              </Avatar>
              <div className="leading-tight hidden sm:block">
                <p className="font-semibold">{account?.name || "My Name"}</p>
                <p className="text-xs text-white/80">Online</p>
              </div>
            </div>
          </Dropdown>
        </div>
      </div>
    </header>
  );
}

export default Header;
