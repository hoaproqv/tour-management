import React, { useEffect, useState } from "react";

// Ant Design Icons
import { ClockCircleOutlined } from "@ant-design/icons";
import {
  IconCoins,
  IconList,
  IconTrendingDown,
  IconTrendingUp,
} from "@tabler/icons-react";
import { Button, Card, DatePicker, Select, Space, Table, Tag } from "antd";
import dayjs from "dayjs";

import SectionHeader from "../components/SectionHeader";
import StatCard from "../components/StatCard";
import {
  useGetHistoryDeals,
  useGetHistoryFilterSettings,
} from "../hooks/useMT5Api";
import useSubscribeMessage from "../hooks/useSubscribeFirebase";
import { MessageFirebasePath } from "../utils/constant";

import type { ColumnsType } from "antd/es/table";

// Define SortOrder type locally since it's not exported by antd
type SortOrder = "ascend" | "descend" | undefined;

const { Option } = Select;

interface DashboardProps {}

const History: React.FC<DashboardProps> = () => {
  const [sort, setSort] = useState<{ field?: string; order_by?: string }>({});
  const [dataHistoryDeals, setDataHistoryDeals] = useState<any[]>([]);
  const [pagination, setPagination] = useState<{
    current: number;
    limit: number;
    total_pages: number;
    total_items: number;
  }>({
    current: 1,
    limit: 10,
    total_pages: 0,
    total_items: 0,
  });
  const [filter, setFilter] = useState<{
    symbol?: string;
    type?: number;
    entry?: number;
    profitType?: string;
    dateRange?: [string, string];
  }>({});
  const [finalFilter, setFinalFilter] = useState(filter);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  // Chuyển filter object thành query string (bỏ qua type/entry là NaN, symbol/profitType là '', dateRange là ["",""])
  const filterString = [
    ...Object.entries(finalFilter)
      .filter(([k, v]) => {
        if (k === "type" || k === "entry") {
          return v !== undefined && !isNaN(Number(v));
        }
        if (k === "symbol" || k === "profitType") {
          return v !== "" && v !== undefined;
        }
        if (k === "dateRange" && Array.isArray(v)) {
          return v[0] !== "" || v[1] !== "";
        }
        return v !== undefined && v !== "";
      })
      .flatMap(([k, v]) => {
        if (k === "dateRange" && Array.isArray(v)) {
          const params = [];
          if (v[0]) params.push(`date_from=${v[0]}`);
          if (v[1]) params.push(`date_to=${v[1]}`);
          return params;
        }
        if (k === "profitType") {
          return `profit_type=${v}`;
        }
        return `${k}=${v}`;
      }),
    sort.field ? `sort=${sort.field}` : null,
    sort.order_by ? `order_by=${sort.order_by}` : null,
  ]
    .filter(Boolean)
    .join("&");

  const { data: historyDeals } = useGetHistoryDeals(
    pagination.current,
    pagination.limit,
    filterString,
  );

  const { data: historyFilterSettings } = useGetHistoryFilterSettings();

  const { message: summaryData } = useSubscribeMessage(
    MessageFirebasePath.SUMMARY,
  );

  const {
    closed_deals_count: closedOrdersCount = 0,
    total_profit: totalProfit = 0,
    total_loss: totalLoss = 0,
    avg_profit: avgProfit = 0,
  } = summaryData || {};

  const columns: ColumnsType<any> = [
    {
      title: "Ticket",
      dataIndex: "ticket",
      key: "ticket",
      sorter: (a, b) => Number(a.ticket) - Number(b.ticket),
      defaultSortOrder:
        sort.field === "ticket"
          ? ((sort.order_by === "asc" ? "ascend" : "descend") as SortOrder)
          : undefined,
    },
    { title: "Symbol", dataIndex: "symbol", key: "symbol" },
    {
      title: "Entry",
      dataIndex: "entry",
      key: "entry",
      render: (entry: number) => {
        const entryColors = ["blue", "orange", "green", "red"];
        const entryLabels = ["In", "Out", "In/Out", "Out by"];
        const color = entryColors[entry] ?? "gray";
        const label = entryLabels[entry] ?? "Unknown";
        // Đặt width cố định, căn giữa nội dung
        return (
          <Tag
            color={color}
            style={{
              display: "inline-block",
              minWidth: 50,
              textAlign: "center",
            }}
          >
            {label}
          </Tag>
        );
      },
    },
    {
      title: "Type",
      dataIndex: "type_display",
      key: "type_display",
    },
    {
      title: "Volume",
      dataIndex: "volume",
      key: "volume",
      sorter: (a, b) => Number(a.volume) - Number(b.volume),
      defaultSortOrder:
        sort.field === "volume"
          ? ((sort.order_by === "asc" ? "ascend" : "descend") as SortOrder)
          : undefined,
    },
    {
      title: "Profit/Loss",
      dataIndex: "profit",
      key: "profit",
      sorter: (a, b) => Number(a.profit) - Number(b.profit),
      defaultSortOrder:
        sort.field === "profit"
          ? ((sort.order_by === "asc" ? "ascend" : "descend") as SortOrder)
          : undefined,
      render: (value: any) => (
        <span
          style={{
            color: value > 0 ? "#28a745" : value < 0 ? "#dc3545" : "#6c757d",
            fontWeight: "bold",
          }}
        >
          {value > 0
            ? `+${value.toFixed(2)}`
            : value < 0
              ? `${value.toFixed(2)}`
              : "0"}
        </span>
      ),
    },
    {
      title: "Time",
      dataIndex: "time",
      key: "time",
      sorter: (a, b) => dayjs(a.time).valueOf() - dayjs(b.time).valueOf(),
      defaultSortOrder:
        sort.field === "time"
          ? ((sort.order_by === "asc" ? "ascend" : "descend") as SortOrder)
          : undefined,
      render: (value: string) => dayjs(value).format("YYYY-MM-DD HH:mm"),
    },
  ];

  const handleFilter = () => {
    setFinalFilter(filter);
  };

  useEffect(() => {
    if (historyDeals) {
      setDataHistoryDeals(historyDeals.data);
      setLastUpdated(dayjs().format("YYYY-MM-DD HH:mm:ss"));
      setPagination({
        current: historyDeals.pagination.page,
        limit: historyDeals.pagination.limit,
        total_pages: historyDeals.pagination.total_pages,
        total_items: historyDeals.pagination.total_items,
      });
    }
  }, [historyDeals]);

  return (
    <div className="flex flex-col gap-5 p-4 bg-background w-full">
      <SectionHeader
        title="Trading History"
        description="Complete record of all your trading activities"
      ></SectionHeader>

      {/* Statistics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-4 gap-6">
        <StatCard
          icon={<IconList size={24} />}
          label="TOTAL TRADES"
          value={closedOrdersCount}
          changeLabel=""
          colorClass="bg-blue-400"
        />
        <StatCard
          icon={<IconTrendingUp size={24} />}
          label="TOTAL PROFIT"
          value={`$${totalProfit.toFixed(2)}`}
          changeLabel=""
          colorClass="bg-green-500"
          valueClassName="text-green-500"
        />
        <StatCard
          icon={<IconTrendingDown size={24} />}
          label="TOTAL LOSS"
          value={`$${totalLoss.toFixed(2)}`}
          changeLabel=""
          colorClass="bg-red-500"
          valueClassName="text-red-500"
        />
        <StatCard
          icon={<IconCoins />}
          label="AVG. PROFIT"
          value={`$${avgProfit.toFixed(2)}`}
          changeLabel=""
          colorClass="bg-amber-400"
          valueClassName={`${avgProfit > 0 ? "text-green-500" : avgProfit < 0 ? "text-red-500" : "text-[#2C3E50]"}`}
        />
      </div>

      {/* Filters */}
      <Card>
        <div className="flex flex-col gap-4">
          <h5 className="font-semibold text-lg">Filters</h5>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Symbol */}
            <div className="flex flex-col">
              <label className="text-sm font-medium text-gray-600 mb-1">
                Symbol
              </label>
              <Select
                value={filter.symbol ?? ""}
                className="w-full"
                allowClear
                onChange={(value) =>
                  setFilter((prev) => ({ ...prev, symbol: value }))
                }
              >
                <Option value="">All</Option>
                {historyFilterSettings?.symbols?.map((symbol: string) => (
                  <Option key={symbol} value={symbol}>
                    {symbol}
                  </Option>
                ))}
              </Select>
            </div>
            {/* Trade Type */}
            <div className="flex flex-col">
              <label className="text-sm font-medium text-gray-600 mb-1">
                Trade Type
              </label>
              <Select
                value={filter.type ?? NaN}
                className="w-full"
                allowClear
                onChange={(value: number) =>
                  setFilter((prev) => ({
                    ...prev,
                    type: isNaN(value) ? NaN : Number(value),
                  }))
                }
              >
                <Option value={NaN}>All</Option>
                {historyFilterSettings?.type?.map(
                  (type: string, idx: number) => (
                    <Option key={type} value={idx}>
                      {type.charAt(0).toUpperCase() + type.slice(1)}
                    </Option>
                  ),
                )}
              </Select>
            </div>
            {/* Entry Type */}
            <div className="flex flex-col">
              <label className="text-sm font-medium text-gray-600 mb-1">
                Entry Type
              </label>
              <Select
                value={filter.entry ?? NaN}
                className="w-full"
                allowClear
                onChange={(value) =>
                  setFilter((prev) => ({
                    ...prev,
                    entry: isNaN(value) ? NaN : Number(value),
                  }))
                }
              >
                <Option value={NaN}>All</Option>
                {historyFilterSettings?.entry?.map(
                  (entry: string, idx: number) => (
                    <Option key={entry} value={idx}>
                      {entry.charAt(0).toUpperCase() + entry.slice(1)}
                    </Option>
                  ),
                )}
              </Select>
            </div>
            {/* Profit / Loss */}
            <div className="flex flex-col">
              <label className="text-sm font-medium text-gray-600 mb-1">
                Profit / Loss
              </label>
              <Select
                value={filter.profitType ?? ""}
                className="w-full"
                allowClear
                onChange={(value) =>
                  setFilter((prev) => ({ ...prev, profitType: value }))
                }
              >
                <Option value="">All</Option>
                {historyFilterSettings?.profit_type?.map((type: string) => (
                  <Option key={type} value={type}>
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                  </Option>
                ))}
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex flex-col">
              <label className="text-sm font-medium text-gray-600 mb-1">
                Start Date
              </label>
              <DatePicker
                className="w-full"
                value={
                  filter.dateRange && filter.dateRange[0]
                    ? dayjs(filter.dateRange[0])
                    : undefined
                }
                onChange={(date) => {
                  setFilter((prev) => ({
                    ...prev,
                    dateRange: [
                      date ? date.format("YYYY-MM-DD") : "",
                      prev.dateRange && prev.dateRange[1]
                        ? prev.dateRange[1]
                        : "",
                    ],
                  }));
                }}
                allowClear
              />
            </div>
            <div className="flex flex-col">
              <label className="text-sm font-medium text-gray-600 mb-1">
                End Date
              </label>
              <DatePicker
                className="w-full"
                value={
                  filter.dateRange && filter.dateRange[1]
                    ? dayjs(filter.dateRange[1])
                    : undefined
                }
                onChange={(date) => {
                  setFilter((prev) => ({
                    ...prev,
                    dateRange: [
                      prev.dateRange && prev.dateRange[0]
                        ? prev.dateRange[0]
                        : "",
                      date ? date.format("YYYY-MM-DD") : "",
                    ],
                  }));
                }}
                allowClear
              />
            </div>
          </div>
          <div className="flex items-center justify-end gap-2">
            <Button
              type="primary"
              className="bg-indigo-600"
              onClick={handleFilter}
            >
              Apply Filters
            </Button>
            <Button
              className="bg-gray-600 text-white"
              onClick={() => setFilter({})}
            >
              Clear Filters
            </Button>
          </div>
        </div>
      </Card>

      {/* Table */}
      <Card>
        <Space className="mb-4 w-full justify-between">
          <h5 className="text-lg font-medium">Trade History</h5>
          <span className="text-sm text-gray-500">
            <ClockCircleOutlined className="mr-1" /> Last updated: {lastUpdated}
          </span>
        </Space>
        <Table
          columns={columns}
          dataSource={dataHistoryDeals}
          rowKey="ticket"
          pagination={{
            pageSize: pagination.limit,
            total: pagination.total_items,
            current: pagination.current,
          }}
          scroll={{ x: "max-content" }}
          onChange={(pagination, filters, sorter) => {
            setPagination((prev) => ({
              ...prev,
              current: pagination.current ?? prev.current,
              limit:
                typeof pagination.pageSize === "number"
                  ? pagination.pageSize
                  : prev.limit,
            }));
            let sortObj: any = sorter;
            if (Array.isArray(sorter)) {
              sortObj = sorter[0];
            }
            if (sortObj && typeof sortObj === "object" && "field" in sortObj) {
              setSort({
                field: sortObj.field,
                order_by: sortObj.order === "ascend" ? "asc" : "desc",
              });
            } else {
              setSort({});
            }
          }}
        />
      </Card>
    </div>
  );
};

export default History;
