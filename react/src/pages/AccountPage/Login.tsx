import React, { useEffect } from "react";

import { LockOutlined, UserOutlined } from "@ant-design/icons";
import { Button, Card, Form, Input } from "antd";
import { Link } from "react-router-dom";

import { useLogin } from "../../hooks/useAuth";
import { ROUTES } from "../../utils/routers";

import type { ILoginFormData } from "../../utils/types";

const Login = () => {
  const [form] = Form.useForm<ILoginFormData>();
  const { mutate: mutateLogin, isPending: isLoggingIn } = useLogin();

  useEffect(() => {
    const accessToken = localStorage.getItem("access_token");
    if (accessToken) {
      window.location.href = ROUTES.DASHBOARD;
    }
  }, []);

  const handleLogin = (values: ILoginFormData) => {
    mutateLogin(values);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-600 via-cyan-500 to-sky-700 flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-5xl grid grid-cols-1 md:grid-cols-2 bg-white/90 backdrop-blur rounded-2xl shadow-2xl overflow-hidden">
        <div className="hidden md:flex flex-col justify-between bg-[rgba(28,100,242,0.12)] p-10 border-r border-white/40">
          <div>
            <p className="text-sm uppercase tracking-[0.2em] text-sky-700 font-semibold">
              Tour Management
            </p>
            <h1 className="text-3xl font-bold text-slate-900 mt-4 leading-tight">
              Chào mừng bạn quay lại
            </h1>
            <p className="mt-4 text-slate-600">
              Đăng nhập để quản lý chuyến, vòng, và hành khách trong hệ thống
              tour của bạn.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-white rounded-xl shadow-sm border border-slate-100">
              <p className="text-xs text-slate-500">Quản lý</p>
              <p className="text-lg font-semibold text-slate-900">
                Trips &amp; Rounds
              </p>
            </div>
            <div className="p-4 bg-white rounded-xl shadow-sm border border-slate-100">
              <p className="text-xs text-slate-500">Hành khách</p>
              <p className="text-lg font-semibold text-slate-900">
                Theo dõi realtime
              </p>
            </div>
          </div>
        </div>

        <div className="p-8 md:p-10">
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-slate-900">Đăng nhập</h2>
            <p className="text-slate-500 mt-2">
              Dùng tài khoản đã đăng ký để tiếp tục.
            </p>
          </div>

          <Card className="shadow-sm border border-slate-100">
            <Form
              form={form}
              name="login"
              onFinish={handleLogin}
              size="large"
              layout="vertical"
              requiredMark={false}
              initialValues={{ username: "", password: "" }}
            >
              <Form.Item
                label={
                  <span className="text-slate-800 font-medium">
                    Tên đăng nhập
                  </span>
                }
                name="username"
                rules={[
                  { required: true, message: "Vui lòng nhập tên đăng nhập" },
                ]}
              >
                <Input
                  prefix={<UserOutlined className="text-sky-600" />}
                  placeholder="Nhập tên đăng nhập"
                  className="rounded-lg"
                />
              </Form.Item>

              <Form.Item
                label={
                  <span className="text-slate-800 font-medium">Mật khẩu</span>
                }
                name="password"
                rules={[{ required: true, message: "Vui lòng nhập mật khẩu" }]}
              >
                <Input.Password
                  prefix={<LockOutlined className="text-sky-600" />}
                  placeholder="Nhập mật khẩu"
                  className="rounded-lg"
                />
              </Form.Item>

              <div className="flex items-center justify-between mb-6 text-sm">
                <Link
                  to={ROUTES.FORGET_PASSWORD}
                  className="text-sky-600 font-medium"
                >
                  Quên mật khẩu?
                </Link>
                <Link
                  to={ROUTES.REGISTER}
                  className="text-slate-600 hover:text-slate-800"
                >
                  Chưa có tài khoản?
                </Link>
              </div>

              <Form.Item className="mb-0">
                <Button
                  type="primary"
                  htmlType="submit"
                  loading={isLoggingIn}
                  className="w-full h-11 rounded-lg bg-sky-600"
                >
                  {isLoggingIn ? "Đang đăng nhập..." : "Đăng nhập"}
                </Button>
              </Form.Item>
            </Form>
          </Card>

          <p className="text-center text-xs text-slate-500 mt-6">
            Việc bạn tiếp tục đồng nghĩa với việc chấp nhận điều khoản sử dụng
            của hệ thống.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
