import React, { useEffect, useState } from "react";

import {
  CarOutlined,
  DashboardOutlined,
  InfoCircleOutlined,
  CompassOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  TeamOutlined,
  UserOutlined,
  UserSwitchOutlined,
  SearchOutlined,
  EnvironmentOutlined,
  WalletOutlined,
} from "@ant-design/icons";
import { Button, Input, Menu, type MenuProps } from "antd";
import { Link, useLocation } from "react-router-dom";

import { ROUTES } from "../utils/routers";

const linkClass = "text-white hover:text-white no-underline";

const menuItems: Required<MenuProps>["items"] = [
  {
    key: "dashboard",
    icon: <DashboardOutlined style={{ color: "#fff" }} />,
    label: (
      <Link to={ROUTES.DASHBOARD} className={linkClass}>
        Dashboard
      </Link>
    ),
  },
  {
    key: "users",
    icon: <TeamOutlined style={{ color: "#fff" }} />,
    label: (
      <Link to={ROUTES.ACCOUNT} className={linkClass}>
        User Management
      </Link>
    ),
  },
  {
    key: "roles",
    icon: <UserSwitchOutlined style={{ color: "#fff" }} />,
    label: (
      <Link to="#" className={linkClass}>
        Role Management
      </Link>
    ),
  },
  {
    key: "passengers",
    icon: <UserOutlined style={{ color: "#fff" }} />,
    label: (
      <Link to={ROUTES.PASSENGER} className={linkClass}>
        Passengers
      </Link>
    ),
  },
  {
    key: "trips",
    icon: <CompassOutlined style={{ color: "#fff" }} />,
    label: (
      <Link to={ROUTES.TRIP} className={linkClass}>
        Trips
      </Link>
    ),
    children: [
      {
        key: "trip-home",
        icon: <CompassOutlined style={{ color: "#fff" }} />,
        label: (
          <Link to={ROUTES.TRIP} className={linkClass}>
            Trip
          </Link>
        ),
      },
      {
        key: "rounds",
        icon: <EnvironmentOutlined style={{ color: "#fff" }} />,
        label: (
          <Link to={ROUTES.ROUND} className={linkClass}>
            Rounds
          </Link>
        ),
      },
      {
        key: "bus",
        icon: <CarOutlined style={{ color: "#fff" }} />,
        label: (
          <Link to={ROUTES.BUS} className={linkClass}>
            Bus
          </Link>
        ),
      },
    ],
  },
  {
    key: "transactions",
    icon: <WalletOutlined style={{ color: "#fff" }} />,
    label: (
      <Link to={ROUTES.TRANSACTIONS} className={linkClass}>
        Transaction
      </Link>
    ),
  },
  {
    key: "about",
    icon: <InfoCircleOutlined style={{ color: "#fff" }} />,
    label: (
      <Link to="#" className={linkClass}>
        About us
      </Link>
    ),
  },
];

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== "undefined" ? window.innerWidth < 768 : false,
  );
  const location = useLocation();

  const findSelectedKey = () => {
    if (location.pathname.startsWith(ROUTES.ROUND)) return "trips";
    if (location.pathname.startsWith(ROUTES.BUS)) return "trips";
    if (location.pathname.startsWith(ROUTES.TRIP)) return "trips";
    if (location.pathname.startsWith(ROUTES.PASSENGER)) return "passengers";
    if (location.pathname.startsWith(ROUTES.TRANSACTIONS))
      return "transactions";
    if (location.pathname.startsWith(ROUTES.ACCOUNT)) return "users";
    return "dashboard";
  };

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    if (isMobile) setCollapsed(true);
  }, [isMobile]);

  const toggleCollapsed = () => setCollapsed((prev) => !prev);

  return (
    <aside
      className="bg-[#1c2a3a] text-white min-h-screen"
      style={{
        maxWidth: collapsed ? 90 : 220,
        minWidth: collapsed ? 90 : 220,
        transition: "max-width 0.3s ease",
      }}
    >
      <div className="px-4 py-3 flex items-center justify-between border-b border-white/10">
        {!collapsed && (
          <span className="text-lg font-semibold">Main Navigation</span>
        )}
        <Button type="text" onClick={toggleCollapsed} className="text-white">
          {collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
        </Button>
      </div>

      <div className="px-4 py-3">
        <Input
          allowClear
          placeholder="Tìm kiếm..."
          prefix={<SearchOutlined className="text-slate-400" />}
          className="bg-[#243447] border-none text-white placeholder:text-slate-400"
        />
      </div>

      <Menu
        selectedKeys={[findSelectedKey()]}
        mode="inline"
        inlineCollapsed={collapsed}
        items={menuItems}
        style={{
          backgroundColor: "transparent",
          color: "white",
          borderInlineEnd: "none",
        }}
        className="custom-sidebar-menu"
      />

      <style
        dangerouslySetInnerHTML={{
          __html: `
          .custom-sidebar-menu .ant-menu-item,
          .custom-sidebar-menu .ant-menu-submenu-title {
            margin: 6px 12px;
            border-radius: 8px;
          }
          .custom-sidebar-menu .ant-menu-item-icon,
          .custom-sidebar-menu .ant-menu-submenu-arrow {
            color: #fff !important;
          }
          .custom-sidebar-menu .ant-menu-title-content a {
            color: #fff !important;
          }
          .custom-sidebar-menu .ant-menu-item-selected {
            background: rgba(255,255,255,0.14) !important;
            color: #fff !important;
          }
          .custom-sidebar-menu .ant-menu-item:hover,
          .custom-sidebar-menu .ant-menu-submenu-title:hover {
            background: rgba(255,255,255,0.08) !important;
            color: #fff !important;
          }
          .custom-sidebar-menu .ant-menu-item:hover .ant-menu-title-content a,
          .custom-sidebar-menu .ant-menu-item-selected .ant-menu-title-content a,
          .custom-sidebar-menu .ant-menu-submenu-title:hover .ant-menu-title-content a {
            color: #fff !important;
          }
          .custom-sidebar-menu .ant-menu-submenu-arrow {
            color: rgba(255,255,255,0.6);
          }
        `,
        }}
      />
    </aside>
  );
}
