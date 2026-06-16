import React, { type FC } from "react";

const Footer: FC = () => {
  return (
    <footer className="fixed bottom-0 left-0 w-full bg-[#f5f6f8] text-gray-600 border-t border-gray-200 px-3 md:px-6 z-50 h-[45px] flex items-center">
      <div className="w-full max-w-6xl mx-auto flex flex-row items-center justify-between gap-2 text-[10px] md:text-sm">
        <span className="truncate">Copyright @ 2025 SOICT, HUST</span>
        <span className="hidden md:inline">
          Đồ án Hàn Minh Hòa / 20239221 / K68-CNTT-VB2
        </span>
        <span className="whitespace-nowrap">Status: Online</span>
      </div>
    </footer>
  );
};

export default Footer;
