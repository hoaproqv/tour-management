import React from "react";

import { ArrowLeftOutlined, MailOutlined, UserOutlined } from "@ant-design/icons";
import { Button, Card, Form, Input, message } from "antd";
import { Link } from "react-router-dom";

import { useForgotPassword } from "../../hooks/useAuth";
import { ROUTES } from "../../utils/routers";

interface ForgotPasswordFormData {
  username: number;
  email: string;
}

const ForgotPassword = () => {
  const [form] = Form.useForm();

  const { mutate: forgotPassword, isPending: isForgotPasswordPending } = useForgotPassword();

  const handleForgotPassword = async (values: ForgotPasswordFormData) => {
    values.username = Number(values.username);
    
    try {
      forgotPassword(values);
      
      form.resetFields();
    } catch (error: any) {
      message.error(error?.message || "Failed to send reset email. Please try again.");
    } 
  };

  return (
    <div className="h-screen flex items-center justify-center px-4 sm:px-6 lg:px-8 bg-primary">
      <div className="max-w-md w-full space-y-8">
        {/* Header */}
        <div className="text-center">
          <h2 className="mt-6 text-3xl font-bold text-white">
            Forgot Password
          </h2>
          <p className="mt-2 text-sm text-green-100">
            Enter your username and email to take back your account information
          </p>
        </div>

        {/* Forgot Password Form */}
        <Card className="shadow-lg border-0 rounded-lg bg-white border-none">
          <Form
            form={form}
            name="forgotPassword"
            onFinish={handleForgotPassword}
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
                type="number"
                prefix={<UserOutlined className="text-primary" />}
                placeholder="Enter your username"
                className="bg-white-light border border-primary text-primary-text rounded-md"
              />
            </Form.Item>

            {/* Email Field */}
            <Form.Item
              label={<span className="text-primary font-medium">Email</span>}
              name="email"
              rules={[
                { required: true, message: "Please enter your email" },
                { type: "email", message: "Please enter a valid email address" }
              ]}
            >
              <Input
                prefix={<MailOutlined className="text-primary" />}
                placeholder="Enter your email address"
                className="bg-white-light border border-primary text-primary-text rounded-md"
              />
            </Form.Item>

            {/* Submit Button */}
            <Form.Item className="mb-0">
              <Button
                type="primary"
                htmlType="submit"
                loading={isForgotPasswordPending}
                className="w-full h-12 text-base font-medium rounded-md bg-primary border border-primary text-white"
              >
                {isForgotPasswordPending ? "Sending..." : "Send Email"}
              </Button>
            </Form.Item>
          </Form>

          {/* Back to Login */}
          <div className="mt-6 text-center">
            <Link
              to={ROUTES.LOGIN}
              className="inline-flex items-center gap-2 text-primary hover:opacity-80 font-medium"
            >
              <ArrowLeftOutlined />
              Back to login
            </Link>
          </div>

          {/* Footer Links */}
          <div className="mt-4 text-center">
            <div className="text-sm text-primary">
              Need help?{" "}
              <Link to="#" className="hover:opacity-80 font-medium">
                Contact administrator
              </Link>
            </div>
          </div>
        </Card>

        {/* Bottom Text */}
        <div className="text-center">
          <p className="text-xs text-green-100 opacity-80">
            If you don't receive an email within a few minutes, please check your spam folder
          </p>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
