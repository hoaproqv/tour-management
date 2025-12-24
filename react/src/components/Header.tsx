import React, { useEffect, useState } from "react";

import {
  faChartLine,
  faCog,
  faMoon,
  faQuestionCircle,
  faSignOutAlt,
  faSun,
  faUserCircle,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { Dropdown, Space } from "antd";
import { Link } from "react-router-dom";

import { useLogout } from "../hooks/useAuth";
import { getAccountFromLocalStorage } from "../utils/helper";
import { ROUTES } from "../utils/routers";

import type { MenuProps } from "antd";

function Header() {
  const [theme, setTheme] = useState(localStorage.getItem("theme") || "light");

  const { mutate: logout } = useLogout();

  const account = getAccountFromLocalStorage();

  const items: MenuProps["items"] = [
    {
      key: "help",
      label: (
        <Link to={ROUTES.ACCOUNT}>
          <FontAwesomeIcon
            icon={faQuestionCircle}
            className="text-blue-500 mr-2"
          />
          Info
        </Link>
      ),
    },
    {
      key: "settings",
      label: (
        <Link to="#">
          <FontAwesomeIcon icon={faCog} className="text-gray-500 mr-2" />
          Settings
        </Link>
      ),
    },
    {
      type: "divider",
    },
    {
      key: "logout",
      danger: true,
      label: (
        <div onClick={() => logout()}>
          <FontAwesomeIcon icon={faSignOutAlt} className="text-red-500 mr-2" />
          Logout
        </div>
      ),
    },
  ];

  useEffect(() => {
    document.documentElement.setAttribute("data-bs-theme", theme);
    localStorage.setItem("theme", theme);
  }, [theme]);

  const themeIcon = theme === "dark" ? faSun : faMoon;

  return (
    <div className="fixed top-0 left-0 right-0 w-full h-header-height bg-primary shadow-lg z-50 flex items-center">
      <div className="w-full flex items-center justify-between px-4">
        <Link
          to="/"
          className="flex items-center gap-2 text-2xl font-bold text-white"
        >
          <FontAwesomeIcon
            icon={faChartLine}
            className="text-yellow-400 text-3xl"
          />
          <span>Tour Management</span>
        </Link>

        <div className="flex items-center gap-4">
          <button
            className="theme-toggle bg-white bg-opacity-10 border border-white border-opacity-20 text-white rounded-lg p-2 transition min-w-[34px]"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            title="Toggle Theme"
          >
            <FontAwesomeIcon icon={themeIcon} />
          </button>

          <div className="relative group">
            <Dropdown menu={{ items }}>
              <a onClick={(e) => e.preventDefault()}>
                <Space>
                  <div className="flex items-center text-white gap-2 cursor-pointer">
                    <FontAwesomeIcon icon={faUserCircle} className="text-lg" />
                    {account?.name || "Account"}
                    <i className="fas fa-caret-down ml-1"></i>
                  </div>
                </Space>
              </a>
            </Dropdown>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Header;
