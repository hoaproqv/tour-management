import React from "react";

import { CloseCircleOutlined } from "@ant-design/icons";
import { Button, Popconfirm, Tooltip } from "antd";

import type { ButtonProps } from "antd";

type DeleteItemProps = {
  onConfirm: () => void;
  confirmMessage?: string;
  tooltip?: string;
} & Omit<ButtonProps, "onClick">;

const CloseItem: React.FC<DeleteItemProps> = ({
  onConfirm,
  confirmMessage = "Are you sure you want to close this item?",
  // tooltip = "Close",
  ...props
}) => {
  return (
    <Popconfirm
      title={confirmMessage}
      onConfirm={onConfirm}
      okText="Yes"
      cancelText="No"
    >
      <Tooltip>
        <Button
          icon={<CloseCircleOutlined />}
          size="small"
          className="bg-red-500 text-white hover:!bg-red-600 hover:!text-white hover:!border-red-700"
          {...props}
        />
      </Tooltip>
    </Popconfirm>
  );
};

export default CloseItem;
