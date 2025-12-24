import React from "react";

import { CloseCircleOutlined, SyncOutlined } from "@ant-design/icons";
import { Button, Card, message, Popconfirm, Table } from "antd";

import CloseItem from "../../../components/CloseItem";
import {
  useCloseAllPosition,
  useClosePosition,
} from "../../../hooks/useMT5Api";
import useSubscribeMessage from "../../../hooks/useSubscribeFirebase";
import { MessageFirebasePath } from "../../../utils/constant";

import type { ColumnsType } from "antd/es/table";
// eslint-disable-next-line import/order
import type { IPositionItem } from "../../../utils/types";

export const OrderTable = () => {
  const { message: positionData } = useSubscribeMessage(
    MessageFirebasePath.POSITIONS,
  );
  const { mutate: closeAllPosition } = useCloseAllPosition();

  const { mutate: closePosition } = useClosePosition();

  const handleClose = (ticket: number) => {
    closePosition(
      { ticket },
      {
        onSuccess: () => {
          message.success(`Closed position #${ticket} successfully`);
        },
        onError: (err: any) => {
          message.error(err?.message || "Failed to close position");
        },
      },
    );
  };

  const columnsPositions: ColumnsType<IPositionItem> = [
    { title: "Symbol", dataIndex: "symbol", key: "symbol" },
    {
      title: "Type",
      dataIndex: "type",
      key: "type",
      render: (type: string) => (
        <span
          style={{
            color:
              type === "Sell"
                ? "#dc3545"
                : type === "Buy"
                  ? "#28a745"
                  : "inherit",
            fontWeight: "bold",
          }}
        >
          {type}
        </span>
      ),
    },
    { title: "Volume", dataIndex: "volume", key: "volume" },
    {
      title: "Opening Price",
      dataIndex: "price_open",
      key: "price_open",
      render: (price: number) => `$${price}`,
    },
    {
      title: "Current Price",
      dataIndex: "price_current",
      key: "price_current",
      render: (price: number) => `$${price}`,
    },
    {
      title: "SL / TP",
      key: "sl_tp",
      render: (record: { sl: number; tp: number }) =>
        `${record.sl} / ${record.tp}`,
    },
    {
      title: "P&L",
      dataIndex: "profit",
      key: "profit",
      render: (profit: number) => (
        <span
          style={{
            color: profit < 0 ? "#dc3545" : profit > 0 ? "#28a745" : "inherit",
            fontWeight: "bold",
            minWidth: "60px",
          }}
        >
          {profit > 0 ? `+${profit.toFixed(2)}` : `${profit.toFixed(2)}`}
        </span>
      ),
    },
    {
      title: "Actions",
      key: "actions",
      align: "center",
      width: 80,
      render: (record) => (
        <CloseItem onConfirm={() => handleClose(record.ticket)} />
      ),
    },
  ];

  const handleCloseAll = () => {
    closeAllPosition(undefined, {
      onSuccess: () => {
        message.success("All positions closed successfully");
      },
      onError: (err: any) => {
        message.error(err?.message || "Failed to close positions");
      },
    });
  };
  return (
    <Card
      className="rounded-2xl"
      title={
        <span>
          <SyncOutlined className="me-2" />
          Open Positions
        </span>
      }
      extra={
        <>
          <Popconfirm
            title="Are you sure you want to close all positions?"
            onConfirm={handleCloseAll}
            okText="Yes"
            cancelText="No"
          >
            <Button
              danger
              icon={<CloseCircleOutlined />}
              size="small"
              className="me-2"
            >
              Close All
            </Button>
          </Popconfirm>
        </>
      }
    >
      <Table
        size="small"
        columns={columnsPositions}
        dataSource={positionData || []}
        rowKey={(record) => record.ticket}
        pagination={false}
        scroll={{ x: "max-content" }}
      />
    </Card>
  );
};
