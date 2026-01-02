import React, { useEffect } from "react";

import { LockOutlined, MailOutlined, UserOutlined } from "@ant-design/icons";
import { Button, Card, Form, Input } from "antd";
import { Link } from "react-router-dom";

import { useRegister } from "../../hooks/useAuth";
import { ROUTES } from "../../utils/routers";

import type { IRegisterFormData } from "../../utils/types";

const Register = () => {
  const [form] = Form.useForm<
    IRegisterFormData & { confirmPassword: string }
  >();
  const { mutate: mutateRegister, isPending } = useRegister();

  useEffect(() => {
    const accessToken = localStorage.getItem("access_token");
    if (accessToken) {
      window.location.href = ROUTES.DASHBOARD;
    }
  }, []);

  const handleSubmit = (
    values: IRegisterFormData & { confirmPassword: string },
  ) => {
    mutateRegister({
      name: values.name,
      email: values.email,
      username: values.username,
      password: values.password,
    });
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
              Tạo tài khoản mới
            </h1>
            <p className="mt-4 text-slate-600">
              Tham gia hệ thống để quản lý chuyến, vòng và hành khách dễ dàng
              hơn.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-white rounded-xl shadow-sm border border-slate-100">
              <p className="text-xs text-slate-500">Bảo mật</p>
              <p className="text-lg font-semibold text-slate-900">JWT Access</p>
            </div>
            <div className="p-4 bg-white rounded-xl shadow-sm border border-slate-100">
              <p className="text-xs text-slate-500">Trải nghiệm</p>
              <p className="text-lg font-semibold text-slate-900">
                UI thân thiện
              </p>
            </div>
          </div>
        </div>

        <div className="p-8 md:p-10">
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-slate-900">Đăng ký</h2>
            <p className="text-slate-500 mt-2">
              Điền thông tin để tạo tài khoản mới.
            </p>
          </div>

          <Card className="shadow-sm border border-slate-100">
            <Form
              form={form}
              name="register"
              onFinish={handleSubmit}
              size="large"
              layout="vertical"
              requiredMark={false}
              initialValues={{
                username: "",
                name: "",
                email: "",
                password: "",
              }}
            >
              <Form.Item
                label={
                  <span className="text-slate-800 font-medium">
                    Tên hiển thị
                  </span>
                }
                name="name"
                rules={[
                  { required: true, message: "Vui lòng nhập tên hiển thị" },
                ]}
              >
                <Input
                  prefix={<UserOutlined className="text-sky-600" />}
                  placeholder="Nguyễn Văn A"
                  className="rounded-lg"
                />
              </Form.Item>

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
                  placeholder="username"
                  className="rounded-lg"
                />
              </Form.Item>

              <Form.Item
                label={
                  <span className="text-slate-800 font-medium">Email</span>
                }
                name="email"
                rules={[
                  { required: true, message: "Vui lòng nhập email" },
                  { type: "email", message: "Email không hợp lệ" },
                ]}
              >
                <Input
                  prefix={<MailOutlined className="text-sky-600" />}
                  placeholder="you@example.com"
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
                  placeholder="Tối thiểu 6 ký tự"
                  className="rounded-lg"
                />
              </Form.Item>

              <Form.Item
                label={
                  <span className="text-slate-800 font-medium">
                    Nhập lại mật khẩu
                  </span>
                }
                name="confirmPassword"
                dependencies={["password"]}
                rules={[
                  { required: true, message: "Vui lòng nhập lại mật khẩu" },
                  ({ getFieldValue }) => ({
                    validator(_, value) {
                      if (!value || getFieldValue("password") === value) {
                        return Promise.resolve();
                      }
                      return Promise.reject(new Error("Mật khẩu không khớp"));
                    },
                  }),
                ]}
              >
                <Input.Password
                  prefix={<LockOutlined className="text-sky-600" />}
                  placeholder="Nhập lại mật khẩu"
                  className="rounded-lg"
                />
              </Form.Item>

              <div className="flex items-center justify-between mb-6 text-sm">
                <span className="text-slate-500">Đã có tài khoản?</span>
                <Link to={ROUTES.LOGIN} className="text-sky-600 font-medium">
                  Đăng nhập
                </Link>
              </div>

              <Form.Item className="mb-0">
                <Button
                  type="primary"
                  htmlType="submit"
                  loading={isPending}
                  className="w-full h-11 rounded-lg bg-sky-600"
                >
                  {isPending ? "Đang tạo tài khoản..." : "Đăng ký"}
                </Button>
              </Form.Item>
            </Form>
          </Card>

          <p className="text-center text-xs text-slate-500 mt-6">
            Thông tin của bạn sẽ được bảo mật và chỉ sử dụng cho quản trị hệ
            thống.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Register;
