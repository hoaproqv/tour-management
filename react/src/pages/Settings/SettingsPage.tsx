import React, { useEffect, useState } from "react";

import {
  BellOutlined,
  MailOutlined,
  MobileOutlined,
  SaveOutlined,
} from "@ant-design/icons";
import { Button, Card, Divider, Form, Switch, Typography, message } from "antd";

import { updateProfile } from "../../api/auth";
import { getAccountFromLocalStorage } from "../../utils/helper";

import type { IUser } from "../../utils/types";

const { Title, Text } = Typography;

export default function SettingsPage() {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const account = getAccountFromLocalStorage() as IUser | null;

  useEffect(() => {
    if (account) {
      form.setFieldsValue({
        receive_in_app_notifications:
          account.receive_in_app_notifications ?? true,
        receive_device_notifications:
          account.receive_device_notifications ?? true,
        receive_email_notifications:
          account.receive_email_notifications ?? false,
      });
    }
  }, [account, form]);

  const onFinish = async (values: any) => {
    setLoading(true);
    try {
      await updateProfile(values);
      message.success("Lưu cài đặt thành công");
    } catch (error) {
      console.error(error);
      message.error("Có lỗi xảy ra khi lưu cài đặt");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="mb-6">
        <Title level={2} className="!mb-1">
          Cài đặt
        </Title>
        <Text className="text-slate-500">
          Quản lý các tùy chọn cá nhân và thiết lập ứng dụng
        </Text>
      </div>

      <Form
        form={form}
        layout="vertical"
        onFinish={onFinish}
        initialValues={{
          receive_in_app_notifications: true,
          receive_device_notifications: true,
          receive_email_notifications: false,
        }}
      >
        <Card
          title={
            <div className="flex items-center gap-2">
              <BellOutlined className="text-blue-500" />
              <span>Cài đặt thông báo</span>
            </div>
          }
          bordered={false}
          className="shadow-sm rounded-xl overflow-hidden"
          headStyle={{
            backgroundColor: "#f8fafc",
            borderBottom: "1px solid #f1f5f9",
            fontWeight: 600,
          }}
        >
          <div className="flex flex-col gap-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <MobileOutlined className="text-slate-400" />
                  <Text className="font-semibold text-slate-800 text-base">
                    Thông báo trên thiết bị (Popup)
                  </Text>
                </div>
                <Text className="text-slate-500 block pl-6">
                  Hiển thị popup thông báo (push notification) của trình duyệt
                  kể cả khi bạn không mở ứng dụng.
                </Text>
              </div>
              <Form.Item
                name="receive_device_notifications"
                valuePropName="checked"
                className="mb-0"
              >
                <Switch />
              </Form.Item>
            </div>

            <Divider className="my-0" />

            <div className="flex items-center justify-between">
              <div className="flex-1 pr-6">
                <div className="flex items-center gap-2 mb-1">
                  <MailOutlined className="text-slate-400" />
                  <Text className="font-semibold text-slate-800 text-base">
                    Thông báo qua Email
                  </Text>
                </div>
                <Text className="text-slate-500 block pl-6">
                  Nhận email tóm tắt hoặc thông báo quan trọng.
                  <br />
                  <span className="text-blue-500 font-medium">
                    (Gửi về mail đã đăng ký trong tài khoản là:{" "}
                    {account?.email || "Chưa có email"})
                  </span>
                </Text>
              </div>
              <Form.Item
                name="receive_email_notifications"
                valuePropName="checked"
                className="mb-0"
              >
                <Switch />
              </Form.Item>
            </div>
          </div>
        </Card>

        <div className="mt-8 flex justify-end">
          <Button
            type="primary"
            htmlType="submit"
            icon={<SaveOutlined />}
            size="large"
            loading={loading}
            className="bg-blue-600 px-8 rounded-lg shadow-sm font-medium"
          >
            Lưu cài đặt
          </Button>
        </div>
      </Form>
    </div>
  );
}
