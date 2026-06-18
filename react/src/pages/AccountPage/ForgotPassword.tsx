import React from "react";

import { ArrowLeftOutlined, MailOutlined } from "@ant-design/icons";
import { Button, Form, Input } from "antd";
import { Link } from "react-router-dom";

import { LogoIcon } from "../../components/LogoIcon";
import { useForgotPassword } from "../../hooks/useAuth";
import { ROUTES } from "../../utils/routers";

const ForgotPassword = () => {
  const [form] = Form.useForm<{ email: string }>();
  const { mutate: sendForgotEmail, isPending } = useForgotPassword();

  const onFinish = (values: { email: string }) => {
    sendForgotEmail(values.email);
  };

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background Decorators */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-blue-400/20 blur-3xl animate-blob"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-cyan-400/20 blur-3xl animate-blob animation-delay-2000"></div>

      <div className="w-full max-w-5xl grid grid-cols-1 md:grid-cols-2 gap-6 relative z-10 items-center">
        {/* Left column: Info */}
        <div className="hidden md:flex flex-col justify-center pr-12">
          <div className="bg-gradient-to-tr from-blue-600 to-cyan-400 rounded-2xl h-16 w-16 flex items-center justify-center shadow-lg shadow-blue-500/30 mb-8 transform -rotate-3">
            <LogoIcon className="text-white w-8 h-8" />
          </div>

          <h1 className="text-5xl font-black text-slate-800 mb-6 leading-tight tracking-tight">
            Quên <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-cyan-500">
              Mật khẩu?
            </span>
          </h1>

          <p className="text-lg text-slate-600 leading-relaxed mb-10 max-w-md">
            Đừng lo lắng! Hãy nhập email liên kết với tài khoản của bạn và chúng
            tôi sẽ gửi cho bạn đường dẫn để tạo mật khẩu mới.
          </p>
        </div>

        {/* Right column: Form */}
        <div className="bg-white/80 backdrop-blur-xl p-8 sm:p-10 rounded-[2.5rem] shadow-2xl border border-white/50 w-full max-w-md mx-auto">
          <div className="md:hidden flex justify-center mb-6">
            <div className="bg-gradient-to-tr from-blue-600 to-cyan-400 rounded-2xl h-14 w-14 flex items-center justify-center shadow-lg shadow-blue-500/30">
              <LogoIcon className="text-white w-7 h-7" />
            </div>
          </div>

          <div className="mb-10 text-center md:text-left">
            <h2 className="text-3xl font-bold text-slate-800 mb-2 tracking-tight">
              Khôi phục mật khẩu
            </h2>
            <p className="text-slate-500">
              Nhập email để nhận đường dẫn đặt lại
            </p>
          </div>

          <Form
            form={form}
            name="forgot_password"
            layout="vertical"
            onFinish={onFinish}
            requiredMark={false}
            className="login-form"
          >
            <Form.Item
              label={
                <span className="text-slate-700 font-semibold">Email</span>
              }
              name="email"
              rules={[
                { required: true, message: "Vui lòng nhập email" },
                { type: "email", message: "Email không hợp lệ" },
              ]}
            >
              <Input
                prefix={<MailOutlined className="text-slate-400 mr-1" />}
                placeholder="yourmail@gmail.com"
                className="rounded-xl px-4 py-3 bg-slate-50 border-slate-200 hover:border-blue-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 transition-all text-base"
              />
            </Form.Item>

            <Form.Item className="mt-8 mb-6">
              <Button
                type="primary"
                htmlType="submit"
                loading={isPending}
                className="w-full h-14 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 border-0 text-white font-bold text-lg shadow-[0_4px_14px_0_rgba(14,165,233,0.39)] hover:shadow-[0_6px_20px_rgba(14,165,233,0.23)] hover:-translate-y-0.5 transition-all duration-300"
              >
                Gửi liên kết khôi phục
              </Button>
            </Form.Item>

            <div className="text-center">
              <Link
                to={ROUTES.LOGIN}
                className="text-slate-500 font-medium hover:text-slate-800 transition-all flex items-center justify-center gap-2"
              >
                <ArrowLeftOutlined /> Quay lại Đăng nhập
              </Link>
            </div>
          </Form>
        </div>
      </div>

      <style
        dangerouslySetInnerHTML={{
          __html: `
        @keyframes blob {
          0% { transform: translate(0px, 0px) scale(1); }
          33% { transform: translate(30px, -50px) scale(1.1); }
          66% { transform: translate(-20px, 20px) scale(0.9); }
          100% { transform: translate(0px, 0px) scale(1); }
        }
        .animate-blob {
          animation: blob 7s infinite;
        }
        .animation-delay-2000 {
          animation-delay: 2s;
        }
        .login-form .ant-input-affix-wrapper-focused {
          border-color: #3b82f6 !important;
          box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.2) !important;
        }
      `,
        }}
      />
    </div>
  );
};

export default ForgotPassword;
