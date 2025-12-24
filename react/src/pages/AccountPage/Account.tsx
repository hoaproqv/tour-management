import React, { useState } from "react";

import { CloseOutlined, EditOutlined, SaveOutlined } from "@ant-design/icons";
import { Button, Card, Descriptions, Input } from "antd";

import { useGetAccountInfo, useUpdateUserEmail } from "../../hooks/useAuth";

interface AccountInfo {
  login: number;
  name: string;
  server: string;
  currency: string;
  balance: number;
  equity: number;
  margin: number;
  margin_free: number;
  company: string;
}

interface User {
  uuid: string;
  username: number;
  name: string;
  email: string;
  server: string;
  created_at: string;
}

interface AccountData {
  user: User;
  account_info: AccountInfo;
}

export const Account = () => {
  const [isEditingEmail, setIsEditingEmail] = useState(false);

  const {
    data: accountData,
  }: {
    data: AccountData | undefined;
  } = useGetAccountInfo();

  const { mutate: updateEmail, data: updateEmailData } = useUpdateUserEmail();

  const { user, account_info } = accountData || {};

  const { uuid, username, name, server, email, created_at } = user || {
    uuid: "",
    username: "",
    name: "",
    server: "",
    email: "",
    created_at: "",
  };

  const { login, balance, equity, margin, margin_free, company, currency } =
    account_info || {
      login: 0,
      balance: 0,
      equity: 0,
      margin: 0,
      margin_free: 0,
      company: "",
      currency: "",
    };

  const [editedEmail, setEditedEmail] = useState("");

  const handleEditEmail = () => {
    setIsEditingEmail(true);
    setEditedEmail(updateEmailData?.user.email || email || "");
  };

  const handleSaveEmail = async () => {
    updateEmail(editedEmail);

    setIsEditingEmail(false);
  };

  const handleCancelEdit = () => {
    setIsEditingEmail(false);
    setEditedEmail(email || "");
  };

  const formatCurrency = (value: number, currency: string) => {
    if (!currency) return value.toLocaleString();
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-6 text-gray-800">
        Account Information
      </h1>

      {/* User Information Card */}
      <Card
        title="User Profile"
        className="mb-6 shadow-md"
        extra={<span className="text-sm text-gray-500">ID: {uuid}</span>}
      >
        <Descriptions column={1} bordered>
          <Descriptions.Item label="Username">{username}</Descriptions.Item>
          <Descriptions.Item label="Name">{name}</Descriptions.Item>
          <Descriptions.Item label="Email">
            {isEditingEmail ? (
              <div className="flex items-center gap-2">
                <Input
                  value={editedEmail}
                  onChange={(e) => setEditedEmail(e.target.value)}
                  className="max-w-xs"
                />
                <Button
                  icon={<SaveOutlined />}
                  type="primary"
                  size="small"
                  onClick={handleSaveEmail}
                >
                  Save
                </Button>
                <Button
                  icon={<CloseOutlined />}
                  size="small"
                  onClick={handleCancelEdit}
                >
                  Cancel
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <span>{updateEmailData?.user.email || email}</span>
                <Button
                  icon={<EditOutlined />}
                  type="link"
                  size="small"
                  onClick={handleEditEmail}
                >
                  Edit
                </Button>
              </div>
            )}
          </Descriptions.Item>
          <Descriptions.Item label="Server">{server}</Descriptions.Item>
          <Descriptions.Item label="Created At">
            {formatDate(created_at)}
          </Descriptions.Item>
        </Descriptions>
      </Card>

      {/* Account Information Card */}
      <Card title="Trading Account" className="shadow-md">
        <Descriptions column={2} bordered>
          <Descriptions.Item label="Login">
            <span className="font-semibold">{login}</span>
          </Descriptions.Item>
          <Descriptions.Item label="Name">
            <span className="font-semibold">{name}</span>
          </Descriptions.Item>
          <Descriptions.Item label="Server">{server}</Descriptions.Item>
          <Descriptions.Item label="Currency">
            <span className="font-semibold text-blue-600">{currency}</span>
          </Descriptions.Item>
          <Descriptions.Item label="Balance">
            <span className="text-lg font-bold text-green-600">
              {formatCurrency(balance, currency)}
            </span>
          </Descriptions.Item>
          <Descriptions.Item label="Equity">
            <span className="text-lg font-bold text-blue-600">
              {formatCurrency(equity, currency)}
            </span>
          </Descriptions.Item>
          <Descriptions.Item label="Margin">
            <span className="text-lg font-semibold text-orange-600">
              {formatCurrency(margin, currency)}
            </span>
          </Descriptions.Item>
          <Descriptions.Item label="Free Margin">
            <span className="text-lg font-semibold text-purple-600">
              {formatCurrency(margin_free, currency)}
            </span>
          </Descriptions.Item>
          <Descriptions.Item label="Company" span={2}>
            <span className="font-medium">{company}</span>
          </Descriptions.Item>
        </Descriptions>

        {/* Account Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-6">
          <div className="bg-green-50 p-4 rounded-lg border border-green-200">
            <h3 className="text-sm font-medium text-green-800 mb-1">Balance</h3>
            <p className="text-xl font-bold text-green-600">
              {formatCurrency(balance, currency)}
            </p>
          </div>
          <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
            <h3 className="text-sm font-medium text-blue-800 mb-1">Equity</h3>
            <p className="text-xl font-bold text-blue-600">
              {formatCurrency(equity, currency)}
            </p>
          </div>
          <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
            <h3 className="text-sm font-medium text-orange-800 mb-1">Margin</h3>
            <p className="text-xl font-bold text-orange-600">
              {formatCurrency(margin, currency)}
            </p>
          </div>
          <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
            <h3 className="text-sm font-medium text-purple-800 mb-1">
              Free Margin
            </h3>
            <p className="text-xl font-bold text-purple-600">
              {formatCurrency(margin_free, currency)}
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default Account;
