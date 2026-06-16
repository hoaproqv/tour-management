import React, { useEffect, useMemo, useState } from "react";

import Icon, {
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
import { useLocation, useNavigate } from "react-router-dom";

import { useGetAccountInfo } from "../hooks/useAuth";
import {
  isFleetLead,
  isDriver,
  isAdminLike,
  isTourManagerLike,
} from "../utils/helper";
import { ROUTES } from "../utils/routers";

import type { IUser } from "../utils/types";

const BusSvg = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" width="1em" height="1em">
    <path d="M4 16c0 .88.39 1.67 1 2.22V20a1 1 0 0 0 1 1h1a1 1 0 0 0 1-1v-1h8v1a1 1 0 0 0 1 1h1a1 1 0 0 0 1-1v-1.78c.61-.55 1-1.34 1-2.22V6c0-3.5-3.58-4-8-4s-8 .5-8 4v10zm3.5 1c-.83 0-1.5-.67-1.5-1.5S6.67 14 7.5 14s1.5.67 1.5 1.5S8.33 17 7.5 17zm9 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zm1.5-6H6V6h12v5z" />
  </svg>
);
const BusIcon = (props: any) => <Icon component={BusSvg} {...props} />;

const baseMenuItems: Required<MenuProps>["items"] = [
  {
    key: ROUTES.DASHBOARD,
    icon: <DashboardOutlined style={{ color: "#fff" }} />,
    label: "Trang chủ",
  },
  {
    key: ROUTES.TENANT,
    icon: <ApartmentOutlined style={{ color: "#fff" }} />,
    label: "Công ty",
  },
  {
    key: ROUTES.ACCOUNT,
    icon: <TeamOutlined style={{ color: "#fff" }} />,
    label: "Người dùng",
  },
  {
    key: ROUTES.TRIP,
    icon: <CompassOutlined style={{ color: "#fff" }} />,
    label: "Chuyến đi",
  },
  {
    key: ROUTES.BUS,
    icon: <BusIcon style={{ color: "#fff" }} />,
    label: "Xe khách",
  },
  {
    key: ROUTES.ROUND,
    icon: <EnvironmentOutlined style={{ color: "#fff" }} />,
    label: "Chặng",
  },
  {
    key: ROUTES.PASSENGER,
    icon: <UserOutlined style={{ color: "#fff" }} />,
    label: "Hành khách",
  },
  {
    key: ROUTES.TRANSACTIONS,
    icon: <WalletOutlined style={{ color: "#fff" }} />,
    label: "Điểm danh hành khách",
  },
  {
    key: ROUTES.GUIDE,
    icon: <InfoCircleOutlined style={{ color: "#fff" }} />,
    label: "Hướng dẫn sử dụng",
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

  const navigate = useNavigate();

  const hideManagement = isFleetLead(currentUser) || isDriver(currentUser);
  const isAdmin = isAdminLike(currentUser);
  const isTourManager = isTourManagerLike(currentUser);

  const menuItems = useMemo(() => {
    let items = baseMenuItems;
    const roleSlug = (currentUser?.role_name || currentUser?.role || "").toString().toLowerCase();
    const isCompanyManager = roleSlug === "company_manager";

    if (isAdmin) {
      items = baseMenuItems.filter(
        (item) =>
          item?.key === ROUTES.DASHBOARD ||
          item?.key === ROUTES.TENANT ||
          item?.key === ROUTES.ACCOUNT,
      );
    } else if (isCompanyManager) {
      items = baseMenuItems.filter(
        (item) =>
          item?.key === ROUTES.DASHBOARD ||
          item?.key === ROUTES.PASSENGER ||
          item?.key === ROUTES.TRIP ||
          item?.key === ROUTES.ROUND ||
          item?.key === ROUTES.BUS ||
          item?.key === ROUTES.TRANSACTIONS ||
          item?.key === ROUTES.ACCOUNT ||
          item?.key === ROUTES.GUIDE,
      );
      // Change label to "Nhân viên" for company manager
      items = items.map(item => {
        if (item?.key === ROUTES.ACCOUNT) {
          return { ...item, label: "Nhân viên" };
        }
        return item;
      });
    } else if (isTourManager) {
      items = baseMenuItems.filter(
        (item) =>
          item?.key === ROUTES.DASHBOARD ||
          item?.key === ROUTES.PASSENGER ||
          item?.key === ROUTES.TRIP ||
          item?.key === ROUTES.ROUND ||
          item?.key === ROUTES.BUS ||
          item?.key === ROUTES.TRANSACTIONS ||
          item?.key === ROUTES.GUIDE,
      );
    } else if (hideManagement) {
      items = baseMenuItems.filter(
        (item) =>
          item?.key === ROUTES.DASHBOARD ||
          item?.key === ROUTES.TRANSACTIONS ||
          item?.key === ROUTES.ROUND ||
          item?.key === ROUTES.GUIDE,
      );
    }
    
    return items;
  }, [hideManagement, isAdmin, isTourManager, currentUser]);

  const findSelectedKey = () => {
    if (location.pathname.startsWith(ROUTES.ROUND)) return ROUTES.ROUND;
    if (location.pathname.startsWith(ROUTES.BUS)) return ROUTES.BUS;
    if (location.pathname.startsWith(ROUTES.TRIP)) return ROUTES.TRIP;
    if (location.pathname.startsWith(ROUTES.TENANT)) return ROUTES.TENANT;
    if (location.pathname.startsWith(ROUTES.PASSENGER)) return ROUTES.PASSENGER;
    if (location.pathname.startsWith(ROUTES.TRANSACTIONS))
      return ROUTES.TRANSACTIONS;
    if (location.pathname.startsWith(ROUTES.ACCOUNT)) return ROUTES.ACCOUNT;
    if (location.pathname.startsWith(ROUTES.GUIDE)) return ROUTES.GUIDE;
    return ROUTES.DASHBOARD;
  };

  const handleMenuClick: MenuProps["onClick"] = (e) => {
    navigate(e.key);
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
            onClick={handleMenuClick}
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
        <div
          className="flex items-center justify-between border-b border-white/10 px-4 flex-shrink-0"
          style={{ height: 56 }}
        >
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
            onClick={handleMenuClick}
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
          Quản lý Chuyến đi v1.0
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
        .custom-sidebar-menu .ant-menu-title-content {
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
        .custom-sidebar-menu .ant-menu-item:hover .ant-menu-title-content,
        .custom-sidebar-menu .ant-menu-item-selected .ant-menu-title-content,
        .custom-sidebar-menu .ant-menu-submenu-title:hover .ant-menu-title-content {
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
        .ant-menu-submenu-popup .ant-menu-item .ant-menu-title-content {
          color: #fff !important;
        }
      `,
      }}
    />
  );
}
