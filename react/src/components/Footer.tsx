import React, { type FC } from "react";

const Footer: FC = () => {
  return (
    <footer className="bg-[#f5f6f8] text-gray-600 border-t border-gray-200 py-3 px-6">
      <div className="max-w-6xl mx-auto flex flex-col md:flex-row md:items-center md:justify-between gap-2 text-sm">
        <span>Copyright @ 2025 SOICT, HUST — All right reserved</span>
        <span>soict.hust.edu.vn</span>
        <span>Status: Online</span>
      </div>
    </footer>
  );
};

export default Footer;
