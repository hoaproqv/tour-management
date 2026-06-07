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

const COLLAPSED_WIDTH = 80;
const EXPANDED_WIDTH = 220;

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
        className="bg-[#1c2a3a] text-white h-full flex-shrink-0 flex flex-col"
        style={{
          width: collapsed ? COLLAPSED_WIDTH : EXPANDED_WIDTH,
          transition: "all 0.35s cubic-bezier(0.25, 1, 0.5, 1)",
          minWidth: collapsed ? COLLAPSED_WIDTH : EXPANDED_WIDTH,
          maxWidth: collapsed ? COLLAPSED_WIDTH : EXPANDED_WIDTH,
        }}
      >
        {/* Header with toggle */}
        <div
          className="flex items-center border-b border-white/10 flex-shrink-0"
          style={{
            height: 48,
            justifyContent: collapsed ? "center" : "space-between",
            padding: collapsed ? "0" : "0 12px 0 16px",
            transition: "padding 0.25s ease, justify-content 0.25s ease",
          }}
        >
          {!collapsed && (
            <span className="text-base font-semibold whitespace-nowrap">
              Điều hướng
            </span>
          )}
          <Button
            type="text"
            onClick={toggleCollapsed}
            icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
            className="text-white"
            style={{
              color: "#fff",
              width: 32,
              height: 32,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          />
        </div>

        {/* Menu */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden custom-scrollbar">
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
        </div>
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
          style={{ transition: "opacity 0.35s ease" }}
        />
      )}

      {/* Drawer */}
      <aside
        className="fixed top-0 left-0 h-full bg-[#1c2a3a] text-white z-50 flex flex-col shadow-2xl"
        style={{
          width: 260,
          transform: mobileOpen ? "translateX(0)" : "translateX(-100%)",
          transition: "transform 0.35s cubic-bezier(0.25, 1, 0.5, 1)",
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 px-4 flex-shrink-0" style={{ height: 56 }}>
          <span className="text-lg font-semibold">Điều hướng</span>
          <Button
            type="text"
            onClick={onMobileClose}
            icon={<CloseOutlined />}
            className="text-white"
            style={{
              color: "#fff",
              width: 32,
              height: 32,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          />
        </div>

        {/* Menu */}
        <div className="flex-1 overflow-y-auto custom-scrollbar">
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
        </div>

        {/* Mobile footer info */}
        <div className="border-t border-white/10 px-4 py-3 text-xs text-white/50 flex-shrink-0">
          Tour Management v1.0
        </div>
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
          margin: 4px 8px !important;
          border-radius: 8px;
        }
        .custom-sidebar-menu.ant-menu-inline-collapsed .ant-menu-item,
        .custom-sidebar-menu.ant-menu-inline-collapsed .ant-menu-submenu-title {
          border-radius: 8px;
          margin: 4px 8px !important;
          width: 64px !important;
          padding: 0 !important;
          display: flex !important;
          justify-content: center !important;
          align-items: center !important;
        }
        .custom-sidebar-menu.ant-menu-inline-collapsed .ant-menu-item .ant-menu-item-icon,
        .custom-sidebar-menu.ant-menu-inline-collapsed .ant-menu-submenu-title .ant-menu-item-icon {
          font-size: 18px !important;
          line-height: 40px !important;
          margin: 0 !important;
        }
        .custom-sidebar-menu.ant-menu-inline-collapsed .ant-menu-title-content {
          display: none !important;
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
        /* Ant collapsed popup (submenu flyout) */
        .ant-menu-submenu-popup .ant-menu {
          background: #1c2a3a !important;
        }
        .ant-menu-submenu-popup .ant-menu-item {
          color: #fff !important;
        }
        .ant-menu-submenu-popup .ant-menu-item:hover {
          background: rgba(255,255,255,0.08) !important;
        }
        .ant-menu-submenu-popup .ant-menu-item a {
          color: #fff !important;
        }
      `,
      }}
    />
  );
}
