import React, { useEffect, useState } from "react";

import { BellOutlined, InfoCircleFilled, ExclamationCircleFilled, CheckCircleFilled } from "@ant-design/icons";
import { Badge, Button, Dropdown, Typography } from "antd";
import { useNavigate } from "react-router-dom";

import { notificationService } from "../services/NotificationService";
import { getAccountFromLocalStorage } from "../utils/helper";
import { ROUTES } from "../utils/routers";

import type { INotification } from "../services/NotificationService";

const { Text } = Typography;

export const NotificationDropdown: React.FC = () => {
  const [notifications, setNotifications] = useState<INotification[]>([]);
  const navigate = useNavigate();
  const account = getAccountFromLocalStorage();

  useEffect(() => {
    // Init MQTT if we have a logged in user
    if (account?.id) {
      notificationService.initMqtt(account.id);
    }
    
    // Subscribe to local state
    const unsubscribe = notificationService.subscribe((data) => {
      setNotifications(data);
    });

    return () => {
      unsubscribe();
    };
  }, [account?.id]);

  const unreadCount = notifications.filter(n => !n.is_read).length;

  const handleNotificationClick = (item: INotification) => {
    notificationService.markAsRead(item.id);
    
    // Routing logic based on reference type
    if (item.reference_type === 'ROUND') {
      navigate(ROUTES.ROUND);
    } else if (item.reference_type === 'TRIP') {
      navigate(ROUTES.TRIP);
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'WARNING': return <ExclamationCircleFilled className="text-amber-500 text-[22px]" />;
      case 'SUCCESS': return <CheckCircleFilled className="text-emerald-500 text-[22px]" />;
      case 'ERROR': return <ExclamationCircleFilled className="text-red-500 text-[22px]" />;
      default: return <InfoCircleFilled className="text-blue-500 text-[22px]" />;
    }
  };

  const notificationMenu = (
    <div className="bg-white rounded-xl shadow-[0_10px_40px_rgba(0,0,0,0.15)] w-[360px] md:w-[420px] overflow-hidden border border-slate-100 mt-2">
      <div className="flex justify-between items-center px-5 py-4 border-b border-slate-100 bg-slate-50/80 backdrop-blur-sm">
        <span className="font-bold text-slate-800 text-base">Thông báo</span>
        {unreadCount > 0 && (
          <Button 
            type="link" 
            size="small" 
            className="text-blue-600 text-xs font-semibold p-0 hover:text-blue-700"
            onClick={() => notificationService.markAllAsRead()}
          >
            Đánh dấu đọc tất cả
          </Button>
        )}
      </div>
      
      <div className="max-h-[420px] overflow-y-auto custom-scrollbar bg-white">
        {notifications.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-sm flex flex-col items-center">
            <BellOutlined className="text-4xl mb-3 text-slate-200" />
            Không có thông báo nào mới.
          </div>
        ) : (
          <div className="flex flex-col">
            {notifications.map((item) => (
              <div 
                key={item.id}
                className={`px-5 py-4 cursor-pointer transition-all hover:bg-slate-50 border-b border-slate-100/50 last:border-0 ${!item.is_read ? 'bg-blue-50/40' : ''}`}
                onClick={() => handleNotificationClick(item)}
              >
                <div className="flex gap-4 items-start w-full relative">
                  <div className="mt-0.5 flex-shrink-0">
                    {getIcon(item.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start mb-1">
                      <Text className={`text-[14px] font-semibold truncate pr-3 ${!item.is_read ? 'text-slate-800' : 'text-slate-600'}`}>
                        {item.title}
                      </Text>
                      {!item.is_read && <div className="w-2.5 h-2.5 rounded-full bg-blue-500 flex-shrink-0 mt-1 shadow-[0_0_4px_rgba(59,130,246,0.5)]" />}
                    </div>
                    <Text className="text-[13px] text-slate-600 line-clamp-3 leading-relaxed">
                      {item.message}
                    </Text>
                    <Text className="text-[12px] text-slate-400 mt-2 block font-medium">
                      {new Date(item.created_at).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })} - {new Date(item.created_at).toLocaleDateString('vi-VN')}
                    </Text>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      <div className="px-5 py-3 border-t border-slate-100 bg-slate-50/80 text-center">
        <Button 
          type="link" 
          size="small" 
          className="text-slate-600 text-[14px] font-semibold hover:text-blue-600 w-full"
          onClick={() => {
            navigate(ROUTES.NOTIFICATIONS);
          }}
        >
          Xem tất cả thông báo
        </Button>
      </div>
    </div>
  );

  return (
    <Dropdown popupRender={() => notificationMenu} trigger={['click']} placement="bottomRight">
      <Badge count={unreadCount} size="small" offset={[-4, 4]}>
        <div className="w-9 h-9 rounded-full flex items-center justify-center cursor-pointer bg-transparent hover:bg-white/10 text-slate-300 hover:text-white transition-all duration-300">
          <BellOutlined className="text-[1.15rem]" />
        </div>
      </Badge>
    </Dropdown>
  );
};

export default NotificationDropdown;
