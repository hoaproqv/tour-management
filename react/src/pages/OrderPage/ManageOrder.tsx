import React from "react";

import SectionHeader from "../../components/SectionHeader";

import { CreateOrder } from "./comps/CreateOrder";
import { OrderTable } from "./comps/OrderTable";
import { PositionTable } from "./comps/PositionTable";

const OrderScreen = () => {
  return (
    <div className="manage-order flex flex-col gap-5 p-4 bg-background w-full">
      <SectionHeader
        title="Trading Workspace"
        description="Comprehensive trading dashboard with order management and portfolio overview"
      ></SectionHeader>
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <CreateOrder />
        <div className="col-span-1 xl:col-span-2 flex flex-col gap-4">
          <OrderTable />
          <PositionTable />
        </div>
      </div>
    </div>
  );
};

export default OrderScreen;
