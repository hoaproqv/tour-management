import React from "react";

import { ClockCircleOutlined, DeleteOutlined } from "@ant-design/icons";
import { Button, Card, message, Popconfirm, Table } from "antd";

import DeletableItem from "../../../components/DeleteItem";
import { useDeleteAllOrder, useDeleteOrder } from "../../../hooks/useMT5Api";
import useSubscribeMessage from "../../../hooks/useSubscribeFirebase";
import { MessageFirebasePath } from "../../../utils/constant";

import type { ColumnsType } from "antd/es/table";
// eslint-disable-next-line import/order
import type { IOrderItem } from "../../../utils/types";

export const PositionTable = () => {
  const { message: orderData } = useSubscribeMessage(
    MessageFirebasePath.ORDERS,
  );

  const { mutate: deleteOrder } = useDeleteOrder();

  const { mutate: deleteAllOrder } = useDeleteAllOrder();

  const handleDelete = (ticket: number) => {
    deleteOrder(
      { ticket },
      {
        onSuccess: () => {
          message.success(`Deleted order #${ticket} successfully`);
        },
        onError: (err: any) => {
          message.error(err?.message || "Failed to delete order");
        },
      },
    );
  };

  const handleDeleteAll = () => {
    deleteAllOrder(undefined, {
      onSuccess: () => {
        message.success("All orders deleted successfully");
      },
      onError: (err: any) => {
        message.error(err?.message || "Failed to delete orders");
      },
    });
  };
  const columnsOrders: ColumnsType<IOrderItem> = [
    { title: "Symbol", dataIndex: "symbol", key: "symbol" },
    { title: "Order Type", dataIndex: "order_type", key: "order_type" },
    { title: "Volume", dataIndex: "volume_current", key: "volume_current" },
    { title: "Price", dataIndex: "price_open", key: "price_open" },
    {
      title: "SL / TP",
      key: "sl_tp",
      render: (record) => `${record.sl} / ${record.tp}`,
    },
    {
      title: "State",
      dataIndex: "state",
      key: "state",
    },
    {
      title: "Actions",
      key: "actions",
      align: "center",
      width: 80,
      render: (record) => (
        <DeletableItem onConfirm={() => handleDelete(record.ticket)} />
      ),
    },
  ];
  return (
    <Card
      className="rounded-2xl"
      title={
        <span>
          <ClockCircleOutlined className="me-2" />
          Pending Orders
        </span>
      }
      extra={
        <>
          <Popconfirm
            title="Are you sure you want to delete all orders?"
            onConfirm={handleDeleteAll}
            okText="Yes"
            cancelText="No"
          >
            <Button
              danger
              icon={<DeleteOutlined />}
              size="small"
              className="me-2"
            >
              Delete All
            </Button>
          </Popconfirm>
        </>
      }
    >
      <Table
        size="small"
        columns={columnsOrders}
        dataSource={orderData || []}
        rowKey={(record) => record.ticket}
        pagination={false}
        scroll={{ x: "max-content" }}
      />
    </Card>
  );
};
