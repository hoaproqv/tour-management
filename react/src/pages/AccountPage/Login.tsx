import React, { useEffect, useState } from "react";

import {
  ArrowRightOutlined,
  LockOutlined,
  UserOutlined,
} from "@ant-design/icons";
import { Button, Form, Input, Modal } from "antd";
import { Link } from "react-router-dom";

import { LogoIcon } from "../../components/LogoIcon";
import { useLogin } from "../../hooks/useAuth";
import { ROUTES } from "../../utils/routers";

import type { ILoginFormData } from "../../utils/types";

const Login = () => {
  const [form] = Form.useForm<ILoginFormData>();
  const [isModalOpen, setIsModalOpen] = useState(false);
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
    <div className="min-h-screen relative overflow-hidden bg-slate-900 flex items-center justify-center p-4 sm:p-8">
      {/* Dynamic Background Blobs */}
      <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-blue-600 rounded-full mix-blend-multiply filter blur-[128px] opacity-60 animate-blob"></div>
      <div className="absolute top-[-10%] right-[-10%] w-96 h-96 bg-cyan-400 rounded-full mix-blend-multiply filter blur-[128px] opacity-60 animate-blob animation-delay-2000"></div>
      <div className="absolute bottom-[-20%] left-[20%] w-[40rem] h-[40rem] bg-indigo-600 rounded-full mix-blend-multiply filter blur-[128px] opacity-60 animate-blob animation-delay-4000"></div>

      <div className="relative z-10 w-full max-w-5xl grid grid-cols-1 lg:grid-cols-2 rounded-3xl overflow-hidden shadow-[0_8px_32px_0_rgba(0,0,0,0.3)] bg-white/5 border border-white/10 backdrop-blur-xl">
        {/* Left Side: Branding & Info */}
        <div className="hidden lg:flex flex-col justify-between p-12 text-white bg-gradient-to-br from-white/10 to-transparent border-r border-white/10 relative">
          <div className="absolute inset-0 bg-blue-500/10 mix-blend-overlay"></div>
          <div className="relative z-10">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-white/10 border border-white/20 backdrop-blur-md mb-8 shadow-lg">
              <LogoIcon className="w-8 h-8 drop-shadow-md" />
            </div>
            <h1 className="text-4xl lg:text-5xl font-extrabold tracking-tight mb-4">
              Chào mừng đến với <br />{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500">
                GoTrip
              </span>
            </h1>
            <p className="text-blue-100 text-lg max-w-sm mt-6 font-light leading-relaxed">
              Hệ thống vận hành thông minh giúp bạn theo dõi trực tuyến chặng
              của chuyến đi, điều phối tài xế và quản lý hành khách một cách tối
              ưu.
            </p>
          </div>

          <div className="relative z-10 grid grid-cols-2 gap-4 mt-12">
            <div className="p-5 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md hover:bg-white/10 transition-colors duration-300 cursor-pointer group">
              <p className="text-xs text-blue-200 uppercase tracking-wider mb-1 font-semibold">
                Báo cáo
              </p>
              <p className="text-lg font-bold text-white group-hover:text-cyan-300 transition-colors">
                Chuyến đi, Chặng &amp; Xe khách
              </p>
            </div>
            <div className="p-5 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md hover:bg-white/10 transition-colors duration-300 cursor-pointer group">
              <p className="text-xs text-blue-200 uppercase tracking-wider mb-1 font-semibold">
                Theo dõi
              </p>
              <p className="text-lg font-bold text-white group-hover:text-cyan-300 transition-colors">
                Hành khách theo thời gian thực
              </p>
            </div>
          </div>
        </div>

        {/* Right Side: Login Form */}
        <div className="p-8 sm:p-12 lg:p-16 flex flex-col justify-center relative bg-white/95">
          <div className="mb-10">
            <h2 className="text-3xl font-bold text-slate-800 tracking-tight">
              Đăng nhập
            </h2>
            <p className="text-slate-500 mt-2 font-medium">
              Vui lòng điền thông tin để truy cập hệ thống.
            </p>
          </div>

          <Form
            form={form}
            name="login"
            onFinish={handleLogin}
            size="large"
            layout="vertical"
            requiredMark={false}
            initialValues={{ username: "", password: "" }}
            className="login-form"
          >
            <Form.Item
              label={
                <span className="text-slate-700 font-semibold">
                  Tên đăng nhập
                </span>
              }
              name="username"
              rules={[
                { required: true, message: "Vui lòng nhập tên đăng nhập" },
              ]}
            >
              <Input
                prefix={<UserOutlined className="text-slate-400 mr-1" />}
                placeholder="username"
                className="rounded-xl px-4 py-3 bg-slate-50 border-slate-200 hover:border-blue-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 transition-all"
              />
            </Form.Item>

            <Form.Item
              label={
                <span className="text-slate-700 font-semibold">Mật khẩu</span>
              }
              name="password"
              rules={[{ required: true, message: "Vui lòng nhập mật khẩu" }]}
            >
              <Input.Password
                prefix={<LockOutlined className="text-slate-400 mr-1" />}
                placeholder="••••••••"
                className="rounded-xl px-4 py-3 bg-slate-50 border-slate-200 hover:border-blue-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 transition-all"
              />
            </Form.Item>

            <div className="flex items-center justify-between mb-8 mt-2 text-sm">
              <Link
                to={ROUTES.FORGOT_PASSWORD}
                className="text-blue-600 font-semibold hover:text-blue-700 hover:underline transition-all"
              >
                Quên mật khẩu?
              </Link>
            </div>

            <Form.Item className="mb-0">
              <Button
                type="primary"
                htmlType="submit"
                loading={isLoggingIn}
                className="w-full h-14 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 border-0 text-white font-bold text-lg shadow-[0_4px_14px_0_rgba(14,165,233,0.39)] hover:shadow-[0_6px_20px_rgba(14,165,233,0.23)] hover:-translate-y-0.5 transition-all duration-300 flex items-center justify-center"
              >
                {isLoggingIn ? "Đang xử lý..." : "Đăng nhập ngay"}
                {!isLoggingIn && <ArrowRightOutlined className="ml-2" />}
              </Button>
            </Form.Item>
          </Form>

          <div className="mt-8 p-4 bg-blue-50/50 border border-blue-100 rounded-xl">
            <p className="text-center text-sm text-slate-600 mb-0">
              Bạn chưa có tài khoản?
            </p>
            <p className="text-center text-sm text-slate-600 font-medium mt-1">
              Hãy liên hệ email{" "}
              <a
                href="mailto:hanhoadev@gmail.com"
                className="text-blue-600 font-bold hover:underline"
              >
                hanhoadev@gmail.com
              </a>{" "}
              để được cấp tài khoản sử dụng ứng dụng
            </p>
          </div>

          <p className="text-center text-xs text-slate-400 mt-6">
            Việc bạn đăng nhập đồng nghĩa với việc chấp nhận{" "}
            <span
              onClick={() => setIsModalOpen(true)}
              className="text-blue-500 hover:text-blue-600 hover:underline cursor-pointer font-medium"
            >
              điều khoản sử dụng
            </span>{" "}
            của hệ thống.
          </p>
        </div>
      </div>

      {/* Modal Điều khoản sử dụng */}
      <Modal
        title={
          <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
            <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
              <LogoIcon className="w-5 h-5 drop-shadow-sm" monochrome />
            </div>
            <span className="text-xl font-bold text-slate-800 tracking-tight">
              Điều khoản sử dụng
            </span>
          </div>
        }
        open={isModalOpen}
        onOk={() => setIsModalOpen(false)}
        onCancel={() => setIsModalOpen(false)}
        closeIcon={
          <span className="text-slate-400 hover:text-slate-600 text-lg">✕</span>
        }
        footer={[
          <Button
            key="submit"
            type="primary"
            onClick={() => setIsModalOpen(false)}
            className="bg-blue-600 hover:bg-blue-500 border-0 rounded-xl px-8 h-10 font-medium shadow-md shadow-blue-500/20 transition-all"
          >
            Tôi đã hiểu và đồng ý
          </Button>,
        ]}
        width={750}
        centered
        className="terms-modal"
      >
        <div className="max-h-[60vh] overflow-y-auto custom-scrollbar pr-4 mt-4 text-slate-600 space-y-6">
          <section>
            <h3 className="text-[17px] font-bold text-slate-800 mb-2 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-sm">
                1
              </span>
              Giới thiệu
            </h3>
            <p className="leading-relaxed pl-8">
              Hệ thống GoTrip là nền tảng công nghệ giúp các đơn vị vận tải điều
              phối xe khách, tài xế và quản lý thông tin hành khách theo thời
              gian thực. Bằng việc đăng nhập, bạn xác nhận rằng mình là nhân sự
              hợp lệ được cấp quyền bởi quản lý hệ thống của công ty.
            </p>
          </section>

          <section>
            <h3 className="text-[17px] font-bold text-slate-800 mb-2 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-sm">
                2
              </span>
              Quyền riêng tư & Bảo mật dữ liệu
            </h3>
            <ul className="list-disc pl-12 space-y-2 leading-relaxed">
              <li>
                Thông tin hành khách bao gồm tên, số điện thoại, điểm đón/trả
                được bảo mật nghiêm ngặt và chỉ phục vụ duy nhất cho mục đích
                điều hành chuyến đi.
              </li>
              <li>
                Bạn có trách nhiệm giữ bí mật tuyệt đối đối với các thông tin
                nhạy cảm của hành khách, không phát tán dưới bất kỳ hình thức
                nào.
              </li>
            </ul>
          </section>

          <section>
            <h3 className="text-[17px] font-bold text-slate-800 mb-2 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-sm">
                3
              </span>
              Trách nhiệm của tài xế & điều hành viên
            </h3>
            <ul className="list-disc pl-12 space-y-2 leading-relaxed">
              <li>
                Tuân thủ lộ trình và các chặng (stages) đã được chỉ định trên hệ
                thống.
              </li>
              <li>
                Cập nhật chính xác và kịp thời trạng thái lên/xuống xe của hành
                khách để đảm bảo tính đồng bộ dữ liệu toàn hệ thống.
              </li>
              <li>
                <strong className="text-red-500">Nghiêm cấm</strong> việc chia
                sẻ tài khoản đăng nhập (JWT token/password) cho bất kỳ bên thứ
                ba nào.
              </li>
            </ul>
          </section>

          <section>
            <h3 className="text-[17px] font-bold text-slate-800 mb-2 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-sm">
                4
              </span>
              Cam kết dịch vụ
            </h3>
            <p className="leading-relaxed pl-8">
              Mọi hành vi can thiệp trái phép, làm sai lệch dữ liệu chuyến đi
              hoặc thông tin hành khách trên hệ thống sẽ dẫn đến việc khóa tài
              khoản vĩnh viễn và có thể phải chịu trách nhiệm bồi thường theo
              quy định của công ty.
            </p>
          </section>
        </div>
      </Modal>

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
        .animation-delay-4000 {
          animation-delay: 4s;
        }
        /* Override Ant Design input focus to match tailwind style */
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

export default Login;
