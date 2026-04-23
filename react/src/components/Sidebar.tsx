import React, { useEffect, useMemo, useState } from "react";

import {
  CarOutlined,
  DashboardOutlined,
  InfoCircleOutlined,
  CompassOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  TeamOutlined,
  UserOutlined,
  EnvironmentOutlined,
  WalletOutlined,
  ApartmentOutlined,
  CloseOutlined,
} from "@ant-design/icons";
import { Button, Menu, type MenuProps } from "antd";
import { Link, useLocation } from "react-router-dom";

import { useGetAccountInfo } from "../hooks/useAuth";
import { isFleetLead, isDriver } from "../utils/helper";
import { ROUTES } from "../utils/routers";

import type { IUser } from "../utils/types";

const linkClass = "text-white hover:text-white no-underline";

const baseMenuItems: Required<MenuProps>["items"] = [
  {
    key: "dashboard",
    icon: <DashboardOutlined style={{ color: "#fff" }} />,
    label: (
      <Link to={ROUTES.DASHBOARD} className={linkClass}>
        Trang chủ
      </Link>
    ),
  },
  {
    key: "users",
    icon: <TeamOutlined style={{ color: "#fff" }} />,
    label: (
      <Link to={ROUTES.ACCOUNT} className={linkClass}>
        Quản lý người dùng
      </Link>
    ),
  },
  {
    key: "tenants",
    icon: <ApartmentOutlined style={{ color: "#fff" }} />,
    label: (
      <Link to={ROUTES.TENANT} className={linkClass}>
        Công ty du lịch
      </Link>
    ),
  },
  {
    key: "passengers",
    icon: <UserOutlined style={{ color: "#fff" }} />,
    label: (
      <Link to={ROUTES.PASSENGER} className={linkClass}>
        Hành khách
      </Link>
    ),
  },
  {
    key: "trips",
    icon: <CompassOutlined style={{ color: "#fff" }} />,
    label: (
      <Link to={ROUTES.TRIP} className={linkClass}>
        Tour du lịch
      </Link>
    ),
    children: [
      {
        key: "trip-home",
        icon: <CompassOutlined style={{ color: "#fff" }} />,
        label: (
          <Link to={ROUTES.TRIP} className={linkClass}>
            Tour
          </Link>
        ),
      },
      {
        key: "rounds",
        icon: <EnvironmentOutlined style={{ color: "#fff" }} />,
        label: (
          <Link to={ROUTES.ROUND} className={linkClass}>
            Địa điểm tham quan
          </Link>
        ),
      },
      {
        key: "bus",
        icon: <CarOutlined style={{ color: "#fff" }} />,
        label: (
          <Link to={ROUTES.BUS} className={linkClass}>
            Xe khách
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
        Điểm danh hành khách
      </Link>
    ),
  },
  {
    key: "about",
    icon: <InfoCircleOutlined style={{ color: "#fff" }} />,
    label: (
      <Link to="#" className={linkClass}>
        Về chúng tôi
      </Link>
    ),
  },
];

interface SidebarProps {
  /** On mobile, the parent controls open state */
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}

export default function Sidebar({ mobileOpen, onMobileClose }: SidebarProps) {
  const { data: accountInfo } = useGetAccountInfo();
  const currentUser = accountInfo as IUser | undefined;
  const [collapsed, setCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== "undefined" ? window.innerWidth < 768 : false,
  );
  const location = useLocation();

  const hideManagement = isFleetLead(currentUser) || isDriver(currentUser);

  const menuItems = useMemo(() => {
    if (!hideManagement) return baseMenuItems;
    return baseMenuItems.filter(
      (item) => item?.key !== "users" && item?.key !== "tenants",
    );
  }, [hideManagement]);

  const findSelectedKey = () => {
    if (location.pathname.startsWith(ROUTES.ROUND)) return "trips";
    if (location.pathname.startsWith(ROUTES.BUS)) return "trips";
    if (location.pathname.startsWith(ROUTES.TRIP)) return "trips";
    if (location.pathname.startsWith(ROUTES.TENANT)) return "tenants";
    if (location.pathname.startsWith(ROUTES.PASSENGER)) return "passengers";
    if (location.pathname.startsWith(ROUTES.TRANSACTIONS))
      return "transactions";
    if (location.pathname.startsWith(ROUTES.ACCOUNT)) return "users";
    return "dashboard";
  };

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    if (isMobile) setCollapsed(true);
  }, [isMobile]);

  // Close mobile sidebar when route changes
  useEffect(() => {
    if (isMobile && onMobileClose) onMobileClose();
  }, [location.pathname]); // eslint-disable-line react-hooks/exhaustive-deps

  const toggleCollapsed = () => setCollapsed((prev) => !prev);

  /* ── Desktop sidebar ── */
  if (!isMobile) {
    return (
      <aside
        className="bg-[#1c2a3a] text-white min-h-screen flex-shrink-0"
        style={{
          maxWidth: collapsed ? 80 : 220,
          minWidth: collapsed ? 80 : 220,
          transition: "max-width 0.3s ease, min-width 0.3s ease",
        }}
      >
        <div className="px-4 py-3 flex items-center justify-between border-b border-white/10">
          {!collapsed && (
            <span className="text-lg font-semibold">Điều hướng</span>
          )}
          <Button
            type="text"
            onClick={toggleCollapsed}
            className="text-white ml-auto"
          >
            {collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
          </Button>
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
        <SidebarStyles />
      </aside>
    );
  }

  /* ── Mobile sidebar (overlay / drawer) ── */
  return (
    <>
      {/* Backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40"
          onClick={onMobileClose}
        />
      )}

      {/* Drawer */}
      <aside
        className="fixed top-0 left-0 h-full bg-[#1c2a3a] text-white z-50 flex flex-col"
        style={{
          width: 240,
          transform: mobileOpen ? "translateX(0)" : "translateX(-100%)",
          transition: "transform 0.3s ease",
        }}
      >
        <div className="px-4 py-3 flex items-center justify-between border-b border-white/10">
          <span className="text-lg font-semibold">Điều hướng</span>
          <Button type="text" onClick={onMobileClose} className="text-white">
            <CloseOutlined />
          </Button>
        </div>
        <Menu
          selectedKeys={[findSelectedKey()]}
          mode="inline"
          items={menuItems}
          style={{
            backgroundColor: "transparent",
            color: "white",
            borderInlineEnd: "none",
          }}
          className="custom-sidebar-menu"
        />
        <SidebarStyles />
      </aside>
    </>
  );
}

function SidebarStyles() {
  return (
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
  );
}
