import React, { useState, useEffect } from "react";

import {
  BellOutlined,
  CheckCircleFilled,
  ExclamationCircleFilled,
  InfoCircleFilled,
  SearchOutlined,
} from "@ant-design/icons";
import { Card, Input, Select, Typography, Button, Tag } from "antd";
import { useNavigate } from "react-router-dom";

import { notificationService } from "../../services/NotificationService";
import { ROUTES } from "../../utils/routers";

import type { INotification } from "../../services/NotificationService";

const { Title, Text } = Typography;
const { Option } = Select;

export default function NotificationList() {
  const [notifications, setNotifications] = useState<INotification[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("ALL");
  const [filterStatus, setFilterStatus] = useState("ALL"); // ALL, UNREAD, READ
  const navigate = useNavigate();

  useEffect(() => {
    const unsubscribe = notificationService.subscribe((data) => {
      setNotifications(data);
    });
    return () => unsubscribe();
  }, []);

  const handleNotificationClick = (item: INotification) => {
    notificationService.markAsRead(item.id);
    if (item.reference_type === "ROUND") {
      navigate(ROUTES.ROUND);
    } else if (item.reference_type === "TRIP") {
      navigate(ROUTES.TRIP);
    }
  };

  const filteredNotifications = notifications.filter((n) => {
    const matchesSearch =
      n.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      n.message.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === "ALL" || n.type === filterType;
    const matchesStatus =
      filterStatus === "ALL" ||
      (filterStatus === "UNREAD" && !n.is_read) ||
      (filterStatus === "READ" && n.is_read);
    return matchesSearch && matchesType && matchesStatus;
  });

  const getIcon = (type: string) => {
    switch (type) {
      case "WARNING":
        return <ExclamationCircleFilled className="text-amber-500 text-2xl" />;
      case "SUCCESS":
        return <CheckCircleFilled className="text-emerald-500 text-2xl" />;
      case "ERROR":
        return <ExclamationCircleFilled className="text-red-500 text-2xl" />;
      default:
        return <InfoCircleFilled className="text-blue-500 text-2xl" />;
    }
  };

  return (
    <div className="p-6 max-w-5xl mx-auto h-[calc(100vh-80px)] overflow-y-auto custom-scrollbar">
      <div className="flex justify-between items-center mb-6">
        <div>
          <Title
            level={3}
            className="!text-slate-800 mb-1 flex items-center gap-2"
          >
            <BellOutlined className="text-blue-500" /> Quản lý Thông báo
          </Title>
          <Text className="text-slate-500">
            Xem và quản lý tất cả thông báo hệ thống của bạn
          </Text>
        </div>
        <div className="flex gap-3">
          <Button
            type="primary"
            onClick={() => notificationService.markAllAsRead()}
            className="bg-blue-600 hover:bg-blue-500"
          >
            Đánh dấu đã đọc tất cả
          </Button>
        </div>
      </div>

      <Card className="shadow-sm border border-slate-100 rounded-xl mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          <Input
            placeholder="Tìm kiếm thông báo..."
            prefix={<SearchOutlined className="text-slate-400" />}
            className="flex-1 rounded-lg"
            size="large"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <Select
            defaultValue="ALL"
            size="large"
            className="w-full md:w-48 rounded-lg"
            onChange={(val) => setFilterType(val)}
          >
            <Option value="ALL">Tất cả loại</Option>
            <Option value="INFO">Thông tin</Option>
            <Option value="SUCCESS">Thành công</Option>
            <Option value="WARNING">Cảnh báo</Option>
            <Option value="ERROR">Lỗi</Option>
          </Select>
          <Select
            defaultValue="ALL"
            size="large"
            className="w-full md:w-48 rounded-lg"
            onChange={(val) => setFilterStatus(val)}
          >
            <Option value="ALL">Tất cả trạng thái</Option>
            <Option value="UNREAD">Chưa đọc</Option>
            <Option value="READ">Đã đọc</Option>
          </Select>
        </div>
      </Card>

      <Card
        className="shadow-sm border border-slate-100 rounded-xl overflow-hidden"
        styles={{ body: { padding: 0 } }}
      >
        {filteredNotifications.length === 0 ? (
          <div className="p-12 text-center text-slate-400 flex flex-col items-center">
            <BellOutlined className="text-5xl mb-4 text-slate-200" />
            <span className="text-lg">
              Không tìm thấy thông báo nào phù hợp.
            </span>
          </div>
        ) : (
          <div className="flex flex-col">
            {filteredNotifications.map((item) => (
              <div
                key={item.id}
                className={`p-5 cursor-pointer transition-all hover:bg-slate-50 border-b border-slate-100 last:border-0 ${!item.is_read ? "bg-blue-50/40" : ""}`}
                onClick={() => handleNotificationClick(item)}
              >
                <div className="flex gap-4 items-start">
                  <div className="mt-1 flex-shrink-0">{getIcon(item.type)}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex items-center gap-3">
                        <Text
                          className={`text-[15px] font-semibold ${!item.is_read ? "text-slate-900" : "text-slate-700"}`}
                        >
                          {item.title}
                        </Text>
                        {!item.is_read && (
                          <Tag color="blue" className="border-0 font-medium">
                            Mới
                          </Tag>
                        )}
                      </div>
                      <Text className="text-sm text-slate-400 whitespace-nowrap">
                        {new Date(item.created_at).toLocaleString("vi-VN")}
                      </Text>
                    </div>
                    <Text className="text-slate-600 text-[14px] leading-relaxed block">
                      {item.message}
                    </Text>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
