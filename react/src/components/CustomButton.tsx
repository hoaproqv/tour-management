import React from "react";

import { Button } from "antd";
import classNames from "classnames";

import type { ButtonProps } from "antd";

type CustomButtonProps = ButtonProps & {
  href?: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  bgColor?: string;           
  textColor?: string;     
  borderColor?: string;       
  hoverBgColor?: string;      
  hoverBorderColor?: string; 
  hoverTextColor?: string; 
  center?: boolean;
};

const CustomButton: React.FC<CustomButtonProps> = ({
  href,
  icon,
  children,
  bgColor = "bg-gray-200",
  textColor = "text-black",
  borderColor = "border",
  hoverBgColor = "hover:bg-gray-300",
  hoverBorderColor = "",
  hoverTextColor = "",
  className,
  center = false,
  ...rest
}) => {
  const finalClass = classNames(
    "flex items-center justify-start gap-2 px-5 py-5 font-semibold rounded-xl transition-transform duration-300 transform hover:-translate-y-[1px]",
    center ? "justify-center" : "justify-start",
    bgColor,
    textColor,
    borderColor,
    hoverBgColor,
    hoverBorderColor,
    hoverTextColor,
    className
  );

  return (
    <Button
      type="default"
      href={href}
      icon={icon}
      block
      className={finalClass}
      {...rest}
    >
      {children}
    </Button>
  );
};

export default CustomButton;
