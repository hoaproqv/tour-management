import React, { useEffect, useState } from "react";

import { PlusCircleOutlined, RedoOutlined } from "@ant-design/icons";
import {
  Button,
  Card,
  DatePicker,
  Form,
  Input,
  InputNumber,
  message,
  Radio,
  Select,
} from "antd";
import dayjs from "dayjs";

import CustomButton from "../../../components/CustomButton";
import { StreamPrice } from "../../../components/StreamPrice";
import { useCreateOrder } from "../../../hooks/useMT5Api";
import { useGetSymbols, useStreamingSymbol } from "../../../hooks/useSymbols";
import {
  expirationTimes,
  fillPolicy,
  fullPendingOrders,
  marketOrders,
} from "../../../utils/constant";

import type { IItem } from "../../../utils/types";

const { Option } = Select;

export const CreateOrder = () => {
  // Lưu giá trị giá bid hiện tại cho input price
  const [priceValue, setPriceValue] = useState<{
    price: number | undefined;
    sl: number | undefined;
    tp: number | undefined;
    stoplimit: number | undefined;
  }>({
    price: undefined,
    sl: undefined,
    tp: undefined,
    stoplimit: undefined,
  });
  // Reset symbol về rỗng khi reload trang

  const [form] = Form.useForm();

  const [marketExecution, setMarketExecution] = useState<boolean>(true);
  const [searchSymbols, setSearchSymbols] = useState<string>("");

  const { data: symbolData, isLoading: loadingSymbols } =
    useGetSymbols(searchSymbols);

  const { mutate: createOrder, isPending } = useCreateOrder();

  const { mutate: streamSymbol, data: streamData } = useStreamingSymbol();

  const symbolInfoDetail = streamData?.symbol_info;

  const onReset = () => form.resetFields();

  const onSubmit = (values: any) => {
    const {
      symbol,
      orderType,
      volume,
      price,
      sl,
      tp,
      stoplimit,
      comment,
      type_time,
      expiration,
      type_filling,
    } = values;

    if (!symbol || orderType === undefined || !volume) {
      message.error("Symbol, Order Type and Volume are required.");
      return;
    }

    const isMarketOrder = marketExecution;

    if (!isMarketOrder && !price) {
      message.error("Price is required for pending orders.");
      return;
    }

    const payload: any = {
      symbol,
      order_type: orderType,
      volume: Number(volume),
      ...(isMarketOrder ? {} : { price: Number(price) }),
      ...(sl ? { stop_loss: Number(sl) } : {}),
      ...(tp ? { take_profit: Number(tp) } : {}),
      ...(stoplimit ? { stoplimit: Number(stoplimit) } : {}),
      ...(comment ? { comment } : {}),
      ...(type_time !== undefined ? { type_time } : {}),
      ...(sl || tp ? { mode } : {}),
      ...(expiration && [2, 3].includes(type_time) ? { expiration } : {}),
      ...(type_filling !== undefined ? { type_filling } : {}),
    };

    createOrder(payload, {
      onSuccess: () => {
        message.success("Order submitted successfully.");
        form.resetFields();
        setSearchSymbols("");
      },
      onError: (err: any) => {
        message.error(err?.message || "Order submission failed.");
      },
    });
  };

  const orderType = Form.useWatch("orderType", form);
  const mode = Form.useWatch("mode", form);
  const typeTime = Form.useWatch("type_time", form);
  const symbolValue = Form.useWatch("symbol", form);
  const onSearchSymbols = (value: string) => {
    setSearchSymbols(value);
    streamSymbol("");
  };

  useEffect(() => {
    if (symbolValue) {
      streamSymbol(symbolValue);
    } else {
      streamSymbol("");
    }
    form.setFieldsValue({
      price: undefined,
      sl: undefined,
      tp: undefined,
      volume: undefined,
      stoplimit: undefined,
    });
    setPriceValue({
      price: undefined,
      sl: undefined,
      tp: undefined,
      stoplimit: undefined,
    });
  }, [form, streamSymbol, symbolValue]);

  return (
    <Card
      className="rounded-2xl shadow border border-gray-200 col-span-1"
      title={
        <div className="flex items-center justify-between pt-2 pb-1">
          <span className="text-lg font-semibold flex items-center gap-2">
            <PlusCircleOutlined /> New Order
          </span>
          <Button icon={<RedoOutlined />} size="small" onClick={onReset}>
            Reset Form
          </Button>
        </div>
      }
    >
      {symbolValue && <StreamPrice />}
      <Form
        form={form}
        layout="vertical"
        autoComplete="off"
        onFinish={onSubmit}
      >
        <div className="grid grid-cols-1">
          <div>
            <Form.Item
              name="symbol"
              rules={[{ required: true, message: "Please select a symbol" }]}
              label="Symbol"
            >
              <Select
                showSearch
                allowClear
                placeholder="Type to search symbols..."
                className="w-full"
                loading={loadingSymbols}
                onSearch={onSearchSymbols}
                onClear={() => {
                  setSearchSymbols("");
                  streamSymbol("");
                }}
              >
                {symbolData?.symbols?.map((symbol) => (
                  <Option key={symbol.code} value={symbol.ticker}>
                    {symbol.code}
                    {symbol.description ? ` - ${symbol.description}` : ""}
                  </Option>
                ))}
              </Select>
            </Form.Item>
          </div>

          <Form.Item
            label="Order Mode"
            name="marketExecution"
            initialValue="market"
            rules={[{ required: true, message: "Please select an order mode" }]}
            style={{ marginBottom: 16 }}
          >
            <Radio.Group
              value={marketExecution ? "market" : "pending"}
              defaultValue={marketExecution ? "market" : "pending"}
              onChange={(e) => {
                const value = e.target.value;
                setMarketExecution(value === "market");
                form.setFieldsValue({ orderType: undefined });
              }}
              className="font-medium"
            >
              <Radio value="market">
                <span className="text-gray-700">Market Execution</span>
              </Radio>
              <Radio value="pending">
                <span className="text-gray-700">Pending Order</span>
              </Radio>
            </Radio.Group>
          </Form.Item>

          <div>
            <Form.Item
              name="orderType"
              rules={[
                {
                  required: true,
                  message: "Please select an order type",
                },
              ]}
              label="Order Type"
            >
              <Select placeholder="Choose Order Type..." className="w-full">
                {(marketExecution ? marketOrders : fullPendingOrders).map(
                  (item: IItem) => (
                    <Option key={item.value} value={item.value}>
                      {item.label}
                    </Option>
                  ),
                )}
              </Select>
            </Form.Item>
          </div>

          <div>
            <Form.Item
              name="volume"
              rules={[
                { required: true, message: "Please enter a volume" },
                {
                  type: "number",
                  min: 0.01,
                  message: "Volume must be at least 0.01",
                },
              ]}
              label="Volume"
            >
              <InputNumber
                min={symbolInfoDetail?.volume_min}
                max={symbolInfoDetail?.volume_max}
                step={symbolInfoDetail?.volume_step || 0.01}
                className="w-full"
                placeholder="Enter volume (e.g. 0.01)"
              />
            </Form.Item>
          </div>

          {!marketExecution && (
            <div>
              <Form.Item
                name="price"
                label="Price"
                rules={[
                  {
                    required: true,
                    message: "Please enter a price",
                  },
                ]}
              >
                <InputNumber
                  prefix="$"
                  step={symbolInfoDetail?.point || 0.01}
                  className="w-full"
                  placeholder="Enter price (e.g. 1.23456)"
                  onStep={() => {
                    if (!priceValue.price && symbolInfoDetail.bid) {
                      setPriceValue({
                        ...priceValue,
                        price: symbolInfoDetail.bid,
                      });
                      form.setFieldsValue({ price: symbolInfoDetail.bid });
                    }
                  }}
                />
              </Form.Item>
            </div>
          )}

          {[6, 7].includes(orderType) && (
            <div>
              <Form.Item
                name="stoplimit"
                rules={[
                  {
                    required: true,
                    message: "Please enter stop limit price",
                  },
                ]}
                label="Stop Limit Price"
              >
                <InputNumber
                  prefix="$"
                  step={symbolInfoDetail?.point || 0.01}
                  className="w-full"
                  placeholder="Enter stop limit price"
                  onStep={() => {
                    if (!priceValue.stoplimit && symbolInfoDetail.bid) {
                      setPriceValue({
                        ...priceValue,
                        stoplimit: symbolInfoDetail.bid,
                      });
                      form.setFieldsValue({ stoplimit: symbolInfoDetail.bid });
                    }
                  }}
                />
              </Form.Item>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 md:gap-4">
            <div>
              <Form.Item name="mode" label="Mode" initialValue="price">
                <Select
                  className="w-full"
                  onChange={() => {
                    form.setFieldsValue({
                      sl: undefined,
                      tp: undefined,
                    });
                  }}
                >
                  <Option value="price">Price</Option>
                  <Option value="pip">Pip</Option>
                  <Option value="percent">Percent</Option>
                </Select>
              </Form.Item>
            </div>
            <div>
              <Form.Item name="sl" label="SL">
                <InputNumber
                  step={mode === "price" ? symbolInfoDetail?.point : 1}
                  className="w-full"
                  prefix={mode === "price" ? "$" : ""}
                  suffix={
                    mode === "pip" ? "pips" : mode === "percent" ? "%" : ""
                  }
                  placeholder="Stop Loss"
                  onStep={() => {
                    if (
                      !priceValue.sl &&
                      symbolInfoDetail.bid &&
                      mode === "price"
                    ) {
                      setPriceValue({
                        ...priceValue,
                        sl: symbolInfoDetail.bid,
                      });
                      form.setFieldsValue({ sl: symbolInfoDetail.bid });
                    }
                  }}
                />
              </Form.Item>
            </div>
            <div>
              <Form.Item name="tp" label="TP">
                <InputNumber
                  step={mode === "price" ? symbolInfoDetail?.point : 1}
                  className="w-full"
                  prefix={mode === "price" ? "$" : ""}
                  suffix={
                    mode === "pip" ? "pips" : mode === "percent" ? "%" : ""
                  }
                  placeholder="Take Profit"
                  onStep={() => {
                    if (
                      !priceValue.tp &&
                      symbolInfoDetail.bid &&
                      mode === "price"
                    ) {
                      setPriceValue({
                        ...priceValue,
                        tp: symbolInfoDetail.bid,
                      });
                      form.setFieldsValue({ tp: symbolInfoDetail.bid });
                    }
                  }}
                />
              </Form.Item>
            </div>
          </div>

          {!marketExecution && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Form.Item
                name="type_time"
                rules={[
                  {
                    required: true,
                    message: "Please select an expiration time",
                  },
                ]}
                label="Expiration"
                initialValue={expirationTimes[0].value}
              >
                <Select
                  placeholder="Choose Expiration Time..."
                  className="w-full"
                >
                  {expirationTimes.map((item: IItem) => (
                    <Option key={item.value} value={item.value}>
                      {item.label}
                    </Option>
                  ))}
                </Select>
              </Form.Item>

              <Form.Item
                name="expiration"
                label="Time"
                initialValue={dayjs()}
                rules={[
                  {
                    required:
                      typeTime === expirationTimes[2].value ||
                      typeTime === expirationTimes[3].value,
                    message: "Please select an expiration time",
                  },
                ]}
              >
                <DatePicker
                  className="w-full"
                  showTime={
                    typeTime !== expirationTimes[3].value
                      ? {
                          format: "HH:mm",
                          minuteStep: 1,
                          showSecond: false,
                        }
                      : false
                  }
                  value={
                    typeTime === expirationTimes[3].value
                      ? dayjs().startOf("day")
                      : dayjs()
                  }
                  placeholder={
                    typeTime === expirationTimes[2].value ? "Datetime" : "Date"
                  }
                  disabled={
                    typeTime !== expirationTimes[2].value &&
                    typeTime !== expirationTimes[3].value
                  }
                />
              </Form.Item>
            </div>
          )}

          {marketExecution && (
            <Form.Item
              name="type_filling"
              label="Fill Policy"
              initialValue={fillPolicy[0].value}
              rules={[
                {
                  required: true,
                  message: "Please select a fill policy",
                },
              ]}
            >
              <Select className="w-full">
                {fillPolicy.map((item: IItem) => (
                  <Option key={item.value} value={item.value}>
                    {item.label}
                  </Option>
                ))}
              </Select>
            </Form.Item>
          )}

          <Form.Item name="comment" label="Comment">
            <Input.TextArea
              className="w-full"
              autoSize={{ minRows: 1, maxRows: 2 }}
            />
          </Form.Item>
        </div>
        <CustomButton
          htmlType="submit"
          icon={<PlusCircleOutlined />}
          bgColor="bg-primary"
          textColor="text-white"
          borderColor="!border-primary-border"
          hoverBgColor="hover:!bg-primary-hover"
          hoverBorderColor="hover:!border-primary-hover"
          hoverTextColor="hover:!text-white"
          center
          loading={isPending}
        >
          Place Order
        </CustomButton>
      </Form>
    </Card>
  );
};
