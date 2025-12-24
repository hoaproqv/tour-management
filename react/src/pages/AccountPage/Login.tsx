import React from "react";

import {
  CloudServerOutlined,
  LockOutlined,
  UserOutlined,
} from "@ant-design/icons";
import { Button, Card, Form, Input } from "antd";
import { Link } from "react-router-dom";

import { useLogin } from "../../hooks/useAuth";
import { ROUTES } from "../../utils/routers";

interface LoginFormData {
  username: string;
  password: string;
  server: string;
}

const Login = () => {
  const [form] = Form.useForm();

  const { mutate: mutateLogin, isPending: isLoggingIn } = useLogin();

  const handleLogin = async (values: LoginFormData) => {
    try {
      mutateLogin(values);
    } catch (error) {
      console.error("Login failed:", error);
    }
  };

  return (
    <div className="h-screen flex items-center justify-center px-4 sm:px-6 lg:px-8 bg-primary">
      <div className="max-w-md w-full space-y-8">
        {/* Header */}
        <div className="text-center">
          <h2 className="mt-6 text-3xl font-bold text-white">
            Sign in to your account
          </h2>
          <p className="mt-2 text-sm text-green-100">
            Enter your credentials to access the trading platform
          </p>
        </div>

        {/* Login Form */}
        <Card className="shadow-lg border-0 rounded-lg bg-white border-none">
          <Form
            form={form}
            name="login"
            onFinish={handleLogin}
            size="large"
            layout="vertical"
            requiredMark={false}
          >
            {/* Username Field */}
            <Form.Item
              label={<span className="text-primary font-medium">Username</span>}
              name="username"
              rules={[
                { required: true, message: "Please enter your username" },
              ]}
            >
              <Input
                prefix={<UserOutlined className="text-primary" />}
                placeholder="Username"
                className="bg-white-light border border-primary text-primary-text rounded-md"
              />
            </Form.Item>

            {/* Password Field */}
            <Form.Item
              label={<span className="text-primary font-medium">Password</span>}
              name="password"
              rules={[
                { required: true, message: "Please enter your password" },
              ]}
            >
              <Input.Password
                prefix={<LockOutlined className="text-primary" />}
                placeholder="Password"
                className="rounded-md bg-white-light border border-primary text-primary-text"
              />
            </Form.Item>

            {/* Server Field */}
            <Form.Item
              label={<span className="text-primary font-medium">Server</span>}
              name="server"
              rules={[
                { required: true, message: "Please enter server address" },
              ]}
            >
              <Input
                prefix={<CloudServerOutlined className="text-primary" />}
                placeholder="Server"
                className="rounded-md bg-white-light border border-primary text-primary-text"
              />
            </Form.Item>

            {/* Submit Button */}
            <Form.Item className="mb-0">
              <Button
                type="primary"
                htmlType="submit"
                loading={isLoggingIn}
                className="w-full h-12 text-base font-medium rounded-md bg-primary border border-primary text-white"
              >
                {isLoggingIn ? "Signing in..." : "Sign in"}
              </Button>
            </Form.Item>
          </Form>

          {/* Footer Links */}
          <div className="mt-6 text-center space-y-2">
            <div className="text-sm">
              <Link
                to={ROUTES.FORGET_PASSWORD}
                className="hover:opacity-80 font-medium text-primary"
              >
                Forgot your password?
              </Link>
            </div>
            <div className="text-sm text-primary">
              Don't have an account?{" "}
              <Link to="#" className="hover:opacity-80 font-medium">
                Contact administrator
              </Link>
            </div>
          </div>
        </Card>

        {/* Bottom Text */}
        <div className="text-center">
          <p className="text-xs text-green-100 opacity-80">
            By signing in, you agree to our Terms of Service and Privacy Policy
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
