import React, { type FC } from "react";

import {
  CustomerServiceOutlined,
  FileTextOutlined,
  SafetyOutlined,
  UserSwitchOutlined,
} from "@ant-design/icons";
import { Link } from "react-router-dom";

const Footer: FC = () => {
  return (
    <footer className="bg-gradient-to-br from-[#2c3e50] to-[#34495e] text-white py-8 border-t-[3px] border-primary">
      <div className="container mx-auto px-10">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <strong className="text-lg">Tour Management</strong> – Travel Planning
            Platform
            <br />
            <small className="text-white/70">© 2025 All rights reserved</small>
          </div>
          <div className="flex flex-wrap gap-6 text-white/80 text-sm">
            <Link to="#" className="hover:text-white flex items-center gap-1">
              <SafetyOutlined /> Security
            </Link>
            <Link to="#" className="hover:text-white flex items-center gap-1">
              <CustomerServiceOutlined /> Support
            </Link>
            <Link to="#" className="hover:text-white flex items-center gap-1">
              <FileTextOutlined /> Terms
            </Link>
            <Link to="#" className="hover:text-white flex items-center gap-1">
              <UserSwitchOutlined /> Privacy
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
