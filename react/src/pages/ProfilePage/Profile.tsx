import React, { useMemo, useState } from "react";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Button,
  Card,
  Form,
  Input,
  message,
  Tabs,
  Typography,
  Table,
  Tag,
  Space,
} from "antd";

import { changePassword, checkPassword, updateProfile } from "../../api/auth";
import { getUsers } from "../../api/users";
import { useGetAccountInfo } from "../../hooks/useAuth";

import type { IUser } from "../../utils/types";
import type { TableColumnsType } from "antd";

const { Title, Text } = Typography;

const roleMeta: Record<string, { label: string; color: string }> = {
  company_manager: { label: "Quản lý công ty", color: "purple" },
  tour_manager: { label: "Quản lý chuyến đi", color: "geekblue" },
  fleet_lead: { label: "Trưởng xe", color: "cyan" },
  driver: { label: "Lái xe", color: "green" },
  admin: { label: "Admin", color: "red" },
};

const renderRoleTag = (roleName?: string | null) => {
  const meta = roleMeta[roleName ?? ""];
  if (!roleName) return <Tag>Không có</Tag>;
  if (!meta) return <Tag color="default">{roleName}</Tag>;
  return <Tag color={meta.color}>{meta.label}</Tag>;
};

export const Profile = () => {
  const queryClient = useQueryClient();
  const { data: accountData } = useGetAccountInfo();
  const currentUser = accountData as IUser | undefined;

  const [profileForm] = Form.useForm();
  const [passwordForm] = Form.useForm();
  const [newPasswordForm] = Form.useForm();

  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [isPasswordVerified, setIsPasswordVerified] = useState(false);
  const [currentPasswordCache, setCurrentPasswordCache] = useState("");

  const [isEditingProfile, setIsEditingProfile] = useState(false);

  const [pagination, setPagination] = useState({ page: 1, limit: 10 });

  React.useEffect(() => {
    if (currentUser) {
      profileForm.setFieldsValue({
        username: currentUser.username,
        name: currentUser.name,
        email: currentUser.email,
        phone: currentUser.phone,
      });
    }
  }, [currentUser, profileForm]);

  const updateProfileMutation = useMutation({
    mutationFn: (data: Partial<IUser>) => updateProfile(data),
    onSuccess: async () => {
      message.success("Cập nhật thông tin thành công");
      setIsEditingProfile(false);
      await queryClient.invalidateQueries({ queryKey: ["auth-me"] });
    },
    onError: (error: any) => {
      message.error(error?.message || "Không thể cập nhật thông tin");
    },
  });

  const handleUpdateProfile = (values: any) => {
    if (!currentUser) return;
    
    const isChanged =
      values.name !== currentUser.name ||
      values.email !== currentUser.email ||
      values.phone !== currentUser.phone;

    if (!isChanged) {
      setIsEditingProfile(false);
      return;
    }

    updateProfileMutation.mutate({
      name: values.name,
      email: values.email,
      phone: values.phone,
    });
  };

  const checkPasswordMutation = useMutation({
    mutationFn: (current_password: string) => checkPassword({ current_password }),
    onSuccess: (_, current_password) => {
      setIsPasswordVerified(true);
      setCurrentPasswordCache(current_password);
    },
    onError: (error: any) => {
      message.error(error?.message || "Mật khẩu không chính xác");
    },
  });

  const handleVerifyPassword = (values: any) => {
    checkPasswordMutation.mutate(values.current_password);
  };

  const changePasswordMutation = useMutation({
    mutationFn: (new_password: string) =>
      changePassword({ current_password: currentPasswordCache, new_password }),
    onSuccess: () => {
      message.success("Đổi mật khẩu thành công");
      setIsChangingPassword(false);
      setIsPasswordVerified(false);
      setCurrentPasswordCache("");
      passwordForm.resetFields();
      newPasswordForm.resetFields();
    },
    onError: (error: any) => {
      message.error(error?.message || "Không thể đổi mật khẩu");
    },
  });

  const handleChangePassword = (values: any) => {
    changePasswordMutation.mutate(values.new_password);
  };

  const usersQuery = useQuery({
    queryKey: ["users", "company", pagination.page, pagination.limit, currentUser?.tenant],
    queryFn: () =>
      getUsers({
        page: pagination.page,
        limit: pagination.limit,
        tenant: currentUser?.tenant ? String(currentUser.tenant) : undefined,
      }),
    enabled: Boolean(currentUser),
  });

  const users = useMemo(() => usersQuery.data?.data ?? [], [usersQuery.data]);

  const columns: TableColumnsType<IUser> = [
    {
      title: "Tên hiển thị",
      dataIndex: "name",
      render: (val: string) => val || "—",
    },
    {
      title: "Email",
      dataIndex: "email",
    },
    {
      title: "Số điện thoại",
      dataIndex: "phone",
      render: (val: string | undefined) => val || "—",
    },
    {
      title: "Vai trò",
      dataIndex: "role_name",
      render: (roleName: string) => renderRoleTag(roleName),
    },
  ];

  const renderPersonalInfo = () => (
    <div className="max-w-2xl">
      <Card className="shadow-sm border-slate-100 rounded-2xl mb-6">
        <Form
          layout="vertical"
          form={profileForm}
          onFinish={handleUpdateProfile}
        >
          <Form.Item
            label="Tên đăng nhập (Username)"
            name="username"
          >
            <Input disabled />
          </Form.Item>
          
          <Form.Item
            label="Họ và tên"
            name="name"
            rules={[{ required: true, message: "Vui lòng nhập họ tên" }]}
          >
            <Input placeholder="Nhập họ và tên" disabled={!isEditingProfile} />
          </Form.Item>

          <Form.Item
            label="Email"
            name="email"
            rules={[
              { required: true, message: "Vui lòng nhập email" },
              { type: "email", message: "Email không hợp lệ" },
            ]}
          >
            <Input placeholder="Nhập email" disabled={!isEditingProfile} />
          </Form.Item>

          <Form.Item
            label="Số điện thoại"
            name="phone"
          >
            <Input placeholder="Nhập số điện thoại" disabled={!isEditingProfile} />
          </Form.Item>

          <Form.Item className="mb-0">
            {!isEditingProfile ? (
              <Button
                type="primary"
                onClick={(e) => {
                  e.preventDefault();
                  setIsEditingProfile(true);
                }}
              >
                Sửa thông tin
              </Button>
            ) : (
              <Space>
                <Button
                  type="primary"
                  htmlType="submit"
                  loading={updateProfileMutation.isPending}
                >
                  Lưu thay đổi
                </Button>
                <Button
                  onClick={() => {
                    setIsEditingProfile(false);
                    if (currentUser) {
                      profileForm.setFieldsValue({
                        username: currentUser.username,
                        name: currentUser.name,
                        email: currentUser.email,
                        phone: currentUser.phone,
                      });
                    }
                  }}
                >
                  Hủy
                </Button>
              </Space>
            )}
          </Form.Item>
        </Form>
      </Card>

      <Card className="shadow-sm border-slate-100 rounded-2xl">
        <Title level={4} className="!mb-4">Đổi mật khẩu</Title>
        {!isChangingPassword ? (
          <Button onClick={() => setIsChangingPassword(true)}>
            Thay đổi mật khẩu
          </Button>
        ) : (
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
            {!isPasswordVerified ? (
              <Form
                layout="vertical"
                form={passwordForm}
                onFinish={handleVerifyPassword}
              >
                <Form.Item
                  label="Mật khẩu hiện tại"
                  name="current_password"
                  rules={[{ required: true, message: "Vui lòng nhập mật khẩu hiện tại" }]}
                >
                  <Input.Password placeholder="Nhập mật khẩu hiện tại" />
                </Form.Item>
                <Space>
                  <Button
                    type="primary"
                    htmlType="submit"
                    loading={checkPasswordMutation.isPending}
                  >
                    Xác thực
                  </Button>
                  <Button onClick={() => {
                    setIsChangingPassword(false);
                    passwordForm.resetFields();
                  }}>Hủy</Button>
                </Space>
              </Form>
            ) : (
              <Form
                layout="vertical"
                form={newPasswordForm}
                onFinish={handleChangePassword}
              >
                <Form.Item
                  label="Mật khẩu mới"
                  name="new_password"
                  rules={[
                    { required: true, message: "Vui lòng nhập mật khẩu mới" },
                    { min: 8, message: "Mật khẩu phải có ít nhất 8 ký tự" },
                  ]}
                >
                  <Input.Password placeholder="Nhập mật khẩu mới" />
                </Form.Item>
                <Form.Item
                  label="Xác nhận mật khẩu mới"
                  name="confirm_password"
                  dependencies={["new_password"]}
                  rules={[
                    { required: true, message: "Vui lòng xác nhận mật khẩu mới" },
                    ({ getFieldValue }) => ({
                      validator(_, value) {
                        if (!value || getFieldValue("new_password") === value) {
                          return Promise.resolve();
                        }
                        return Promise.reject(new Error("Mật khẩu không khớp!"));
                      },
                    }),
                  ]}
                >
                  <Input.Password placeholder="Xác nhận mật khẩu mới" />
                </Form.Item>
                <Space>
                  <Button
                    type="primary"
                    htmlType="submit"
                    loading={changePasswordMutation.isPending}
                  >
                    Cập nhật mật khẩu
                  </Button>
                  <Button onClick={() => {
                    setIsChangingPassword(false);
                    setIsPasswordVerified(false);
                    newPasswordForm.resetFields();
                    passwordForm.resetFields();
                  }}>Hủy</Button>
                </Space>
              </Form>
            )}
          </div>
        )}
      </Card>
    </div>
  );

  const renderCompanyMembers = () => (
    <Card className="shadow-sm border-slate-100 rounded-2xl" styles={{ body: { padding: 0 } }}>
      <div className="p-4 border-b border-slate-100">
        <Title level={4} className="!m-0">Thành viên công ty</Title>
        <Text type="secondary">Danh sách nhân viên cùng công ty</Text>
      </div>
      <Table
        size="small"
        scroll={{ x: "max-content" }}
        rowKey="id"
        dataSource={users}
        loading={usersQuery.isLoading || usersQuery.isFetching}
        columns={columns}
        pagination={{
          current: pagination.page,
          pageSize: pagination.limit,
          total: usersQuery.data?.pagination?.total_items ?? users.length,
          onChange: (page, pageSize) => setPagination({ page, limit: pageSize }),
          showSizeChanger: true,
          pageSizeOptions: [10, 20, 50, 100],
        }}
      />
    </Card>
  );

  return (
    <div className="w-full bg-[#f4f7fb] h-full py-6">
      <div className="bg-white shadow-sm rounded-2xl p-6 border border-slate-100">
        <div className="mb-6">
          <p className="text-sm uppercase tracking-[0.25em] text-sky-700 font-semibold">
            Profile Configuration
          </p>
          <Title level={2} style={{ margin: 0 }}>
            Thông tin cá nhân
          </Title>
        </div>

        <Tabs
          defaultActiveKey="1"
          items={[
            {
              key: "1",
              label: "Thông tin cá nhân",
              children: renderPersonalInfo(),
            },
            {
              key: "2",
              label: "Thành viên công ty",
              children: renderCompanyMembers(),
            },
          ]}
        />
      </div>
    </div>
  );
};

export default Profile;
