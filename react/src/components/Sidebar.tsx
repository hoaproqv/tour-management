import React, { useEffect, useState } from "react";

import {
  faCaretLeft,
  faChartLine,
  faHistory,
  faIndent,
  faTachometerAlt,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { Button, Menu, type MenuProps } from "antd";
import { Link, useLocation } from "react-router-dom";

import { ROUTES } from "../utils/routers";

const menuItems: Required<MenuProps>["items"] = [
  {
    key: "1",
    icon: <FontAwesomeIcon icon={faTachometerAlt} />,
    label: (
      <Link
        to={ROUTES.DASHBOARD}
        style={{ color: "inherit", textDecoration: "none" }}
      >
        Dashboard
      </Link>
    ),
  },
  {
    key: "2",
    icon: <FontAwesomeIcon icon={faChartLine} />,
    label: (
      <Link
        to={ROUTES.MANAGE_ORDER}
        style={{ color: "inherit", textDecoration: "none" }}
      >
        Order
      </Link>
    ),
  },
  {
    key: "3",
    icon: <FontAwesomeIcon icon={faHistory} />,
    label: (
      <Link
        to={ROUTES.HISTORY}
        style={{ color: "inherit", textDecoration: "none" }}
      >
        History
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
  const path = location.pathname;
  const selectedKey =
    path === ROUTES.DASHBOARD
      ? "1"
      : path === ROUTES.MANAGE_ORDER
        ? "2"
        : path === ROUTES.HISTORY
          ? "3"
          : "1";

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    if (isMobile) setCollapsed(true);
  }, [isMobile]);

  const toggleCollapsed = () => {
    setCollapsed((prev) => !prev);
  };

  return (
    <div
      className="sidebar"
      style={{
        maxWidth: collapsed ? 87 : 180,
        minWidth: collapsed ? 87 : 180,
        width: "100%",
        backgroundColor: "#16a085",
        boxShadow: "2px 0 8px rgba(0,0,0,0.1)",
        transition: "max-width 0.3s cubic-bezier(.4,0,.2,1), box-shadow 0.3s",
        overflow: "hidden",
        padding: "8px 0",
      }}
    >
      {/* Toggle Button - Ẩn trên mobile */}
      {!isMobile && (
        <div
          className="flex w-full pl-[2px]"
          style={{ justifyContent: collapsed ? "center" : "flex-end" }}
        >
          <Button
            type="text"
            onClick={toggleCollapsed}
            style={{
              color: "white",
              border: "none",
              transition: "background 0.2s, color 0.2s",
              fontSize: collapsed ? "16px" : "28px",
            }}
            className="hover:bg-white hover:bg-opacity-20"
          >
            {collapsed ? (
              <FontAwesomeIcon icon={faIndent} />
            ) : (
              <FontAwesomeIcon icon={faCaretLeft} />
            )}
          </Button>
        </div>
      )}

      {/* Menu - chỉ dùng inlineCollapsed để icon vẫn hiển thị khi thu nhỏ */}
      <Menu
        defaultSelectedKeys={[selectedKey]}
        mode="inline"
        inlineCollapsed={collapsed}
        items={menuItems}
        style={{
          backgroundColor: "transparent",
          border: "none",
          color: "white",
        }}
        theme="dark"
        className="custom-sidebar-menu"
      />

      {/* Global CSS for menu styling */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
          .custom-sidebar-menu .ant-menu {
            padding-top:4px;
          }
          .custom-sidebar-menu .ant-menu-item {
            color: rgba(255, 255, 255, 0.85) !important;
            margin: 4px 8px !important;
            border-radius: 6px !important;
            transition: background 0.2s, color 0.2s;
          }
          .custom-sidebar-menu .ant-menu-item:hover {
            background-color: rgba(255, 255, 255, 0.15) !important;
            color: white !important;
          }
          .custom-sidebar-menu .ant-menu-item-selected {
            background-color: rgba(255, 255, 255, 0.2) !important;
            color: white !important;
          }
          .custom-sidebar-menu .ant-menu-item-icon {
            color: rgba(255, 255, 255, 0.85) !important;
            transition: color 0.2s;
          }
          .custom-sidebar-menu .ant-menu-item:hover .ant-menu-item-icon {
            color: white !important;
          }
          .custom-sidebar-menu .ant-menu-item-selected .ant-menu-item-icon {
            color: white !important;
          }
        `,
        }}
      />
    </div>
  );
}
