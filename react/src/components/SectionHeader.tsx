import React from "react";

interface SectionHeaderProps {
  title: string;
  description?: string;
  marketOpen?: boolean;
  children?: React.ReactNode;
}

const SectionHeader: React.FC<SectionHeaderProps> = ({
  title,
  description,
  marketOpen,
  children,
}) => {
  return (
    <div className="bg-primary text-white py-8 rounded-2xl text-center relative overflow-hidden px-4">
      <h1 className="text-2xl md:text-4xl font-bold [text-shadow:0_2px_4px_rgba(0,0,0,0.1)]">
        {title}
      </h1>
      {description && <p className="text-lg md:text-xl mb-2">{description}</p>}
      {typeof marketOpen === "boolean" && (
        <div
          className={`inline-flex items-center mt-2 px-4 py-1 rounded-full font-semibold ${
            marketOpen
              ? "bg-green-100 text-green-600"
              : "bg-red-100 text-red-600"
          }`}
        >
          <span className="w-2 h-2 rounded-full bg-current mr-2"></span>
          Market {marketOpen ? "Open" : "Closed"}
        </div>
      )}
      {children && <div className="mt-4">{children}</div>}
    </div>
  );
};

export default SectionHeader;
