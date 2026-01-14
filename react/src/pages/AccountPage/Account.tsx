import React, { useMemo, useState } from "react";

import { UserAddOutlined } from "@ant-design/icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Alert,
  Button,
  Card,
  Form,
  Input,
  Modal,
  Select,
  Space,
  Table,
  Tag,
  Typography,
  message,
} from "antd";

import { getTenants, type TenantItem } from "../../api/tenants";
import { createUser, getRoles, getUsers } from "../../api/users";
import { deleteUser, updateUser } from "../../api/users";
import { useGetAccountInfo } from "../../hooks/useAuth";

import type { IRoleItem, IUser, IUserPayload } from "../../utils/types";
import type { TableColumnsType } from "antd";

const { Title, Text } = Typography;

const roleMeta: Record<string, { label: string; color: string; permissions: string }> = {
  admin: {
    label: "Admin",
    color: "magenta",
    permissions: "Toàn quyền quản lý tất cả dữ liệu.",
  },
  tour_manager: {
    label: "Quản lý tour",
    color: "geekblue",
    permissions: "Thêm/sửa/xoá bus, trip, round, passenger.",
  },
  fleet_lead: {
    label: "Trưởng xe",
    color: "cyan",
    permissions: "Sửa transaction của xe mình, điểm danh lên xe mình và chốt điểm danh.",
  },
  driver: {
    label: "Lái xe",
    color: "green",
    permissions: "Chỉ xem transaction và lịch trình round/bus.",
  },
};

type UserFormValues = IUserPayload & { confirmPassword: string };

const renderRoleTag = (roleName?: string | null) => {
  const meta = roleMeta[roleName ?? ""];
  if (!roleName) return <Tag>Không có</Tag>;
  if (!meta) return <Tag color="default">{roleName}</Tag>;
  return <Tag color={meta.color}>{meta.label}</Tag>;
};

const formatDate = (value?: string | null) => {
  if (!value) return "—";
  try {
    return new Intl.DateTimeFormat("vi-VN", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(value));
  } catch (error) {
    console.error("Date format error", error);
    return value;
  }
};

export const Account = () => {
  const queryClient = useQueryClient();
  const [form] = Form.useForm<UserFormValues>();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<IUser | null>(null);
  const [pagination, setPagination] = useState({ page: 1, limit: 20 });

  const { data: accountData } = useGetAccountInfo();
  const currentUser = accountData as IUser | undefined;

  const isAdmin = useMemo(() => {
    const roleSlug = (currentUser?.role_name || "").toString().toLowerCase();
    return Boolean(currentUser?.is_superuser || currentUser?.is_staff || roleSlug === "admin");
  }, [currentUser]);

  const usersQuery = useQuery({
    queryKey: ["users", pagination.page, pagination.limit],
    queryFn: () => getUsers({ page: pagination.page, limit: pagination.limit }),
    enabled: Boolean(currentUser),
    retry: 1,
  });

  const tenantsQuery = useQuery({
    queryKey: ["tenants", "options"],
    queryFn: () => getTenants({ page: 1, limit: 1000 }),
    enabled: isAdmin,
  });

  const rolesQuery = useQuery({
    queryKey: ["roles"],
    queryFn: () => getRoles(),
    enabled: isAdmin,
  });

  const users = useMemo(() => usersQuery.data?.data ?? [], [usersQuery.data]);
  const tenants = useMemo(
    () => (Array.isArray(tenantsQuery.data?.data) ? tenantsQuery.data?.data : []),
    [tenantsQuery.data],
  );
  const roleOptions = useMemo(() => {
    const allowed = new Set(["tour_manager", "fleet_lead", "driver"]);
    return (rolesQuery.data ?? []).filter((role) => allowed.has(String(role.name)));
  }, [rolesQuery.data]);

  const createUserMutation = useMutation({
    mutationFn: (payload: IUserPayload) => createUser(payload),
    onSuccess: async () => {
      message.success("Tạo user thành công");
      await queryClient.invalidateQueries({ queryKey: ["users"] });
      setIsModalOpen(false);
      form.resetFields();
    },
    onError: (error: any) => {
      message.error(error?.message || "Không thể tạo user");
    },
  });

  const updateUserMutation = useMutation({
    mutationFn: (data: { id: number | string; payload: Partial<IUserPayload> }) =>
      updateUser(data.id, data.payload),
    onSuccess: async () => {
      message.success("Cập nhật user thành công");
      await queryClient.invalidateQueries({ queryKey: ["users"] });
      setIsModalOpen(false);
      setEditingUser(null);
      form.resetFields();
    },
    onError: (error: any) => {
      message.error(error?.message || "Không thể cập nhật user");
    },
  });

  const deleteUserMutation = useMutation({
    mutationFn: (id: number | string) => deleteUser(id),
    onSuccess: async () => {
      message.success("Xóa user thành công");
      await queryClient.invalidateQueries({ queryKey: ["users"] });
    },
    onError: (error: any) => message.error(error?.message || "Không thể xóa user"),
  });

  const columns: TableColumnsType<IUser> = [
    {
      title: "Tên hiển thị",
      dataIndex: "name",
      render: (val: string) => val || "—",
    },
    {
      title: "Username",
      dataIndex: "username",
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
      title: "Tenant",
      dataIndex: "tenant_name",
      render: (_: string, record: IUser) => record.tenant_name || record.tenant || "—",
    },
    {
      title: "Role",
      dataIndex: "role_name",
      render: (roleName: string) => renderRoleTag(roleName),
    },
    {
      title: "Trạng thái",
      dataIndex: "is_active",
      render: (value: boolean) => (
        <Tag color={value ? "green" : "red"}>{value ? "Active" : "Inactive"}</Tag>
      ),
    },
    {
      title: "Ngày tạo",
      dataIndex: "created_at",
      render: (val: string | null | undefined) => formatDate(val),
    },
    {
      title: "Thao tác",
      dataIndex: "actions",
      render: (_: unknown, record: IUser) => (
        <Space>
          <Button type="link" onClick={() => openEditModal(record)}>
            Sửa
          </Button>
          <Button
            type="link"
            danger
            onClick={() =>
              Modal.confirm({
                title: "Xóa user?",
                content: `Bạn chắc chắn muốn xóa ${record.name || record.username}?`,
                okText: "Xóa",
                cancelText: "Hủy",
                onOk: () => deleteUserMutation.mutate(record.id),
              })
            }
          >
            Xóa
          </Button>
        </Space>
      ),
    },
  ];

  const openCreateModal = () => {
    if (!isAdmin) {
      message.warning("Chỉ admin mới được thêm user.");
      return;
    }
    form.resetFields();
    setEditingUser(null);
    setIsModalOpen(true);
  };

  const openEditModal = (user: IUser) => {
    if (!isAdmin) {
      message.warning("Chỉ admin mới được sửa user.");
      return;
    }
    setEditingUser(user);
    form.setFieldsValue({
      name: user.name,
      username: user.username,
      email: user.email,
      phone: user.phone,
      tenant: (user.tenant ?? undefined) as string | number | undefined,
      role: (user.role ?? undefined) as string | number | undefined,
      password: undefined,
      confirmPassword: undefined,
    });
    setIsModalOpen(true);
  };

  const handleSubmitUser = () => {
    form
      .validateFields()
      .then((values) => {
        const basePayload: IUserPayload = {
          username: values.username.trim(),
          name: values.name.trim(),
          email: values.email.trim(),
          phone: values.phone?.trim(),
          password: values.password,
          tenant: values.tenant,
          role: values.role,
          is_active: true,
        };
        if (editingUser) {
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          const { password, confirmPassword, ...rest } = values as any;  
          updateUserMutation.mutate({
            id: editingUser.id,
            payload: {
              name: rest.name?.trim(),
              email: rest.email?.trim(),
              phone: rest.phone?.trim(),
              tenant: rest.tenant,
              role: rest.role,
              is_active: editingUser.is_active,
            },
          });
        } else {
          createUserMutation.mutate(basePayload);
        }
      })
      .catch(() => undefined);
  };

  return (
    <div className="w-full bg-[#f4f7fb] min-h-screen py-6">
      <div className="bg-white shadow-sm rounded-2xl p-6 border border-slate-100">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <p className="text-sm uppercase tracking-[0.25em] text-sky-700 font-semibold">
              User Management
            </p>
            <Title level={2} style={{ margin: 0 }}>
              Danh sách user
            </Title>
            <Text type="secondary">
              Quản lý tài khoản và vai trò. Chỉ admin mới có thể thêm user mới.
            </Text>
          </div>
          {isAdmin && (
            <Button
              type="primary"
              icon={<UserAddOutlined />}
              onClick={openCreateModal}
              size="large"
            >
              Thêm user
            </Button>
          )}
        </div>

        <Alert
          className="mt-5"
          message="Quyền theo role"
          description={
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 mt-2">
              {Object.entries(roleMeta).map(([key, meta]) => (
                <div key={key} className="flex items-start gap-2">
                  {renderRoleTag(key)}
                  <div>
                    <p className="font-semibold text-slate-800 text-sm">{meta.label}</p>
                    <p className="text-xs text-slate-600 leading-snug">{meta.permissions}</p>
                  </div>
                </div>
              ))}
            </div>
          }
          type="info"
          showIcon
        />

        <Card className="mt-6" styles={{ body: { padding: 0 } }}>
          <Table
            rowKey="id"
            dataSource={users}
            loading={usersQuery.isLoading || usersQuery.isFetching}
            columns={columns}
            pagination={{
              current: pagination.page,
              pageSize: pagination.limit,
              total: usersQuery.data?.pagination.total_items ?? users.length,
              onChange: (page, pageSize) => setPagination({ page, limit: pageSize }),
              showSizeChanger: true,
              pageSizeOptions: [10, 20, 50, 100],
            }}
          />
        </Card>
      </div>

      <Modal
        open={isModalOpen}
        onCancel={() => setIsModalOpen(false)}
        onOk={handleSubmitUser}
        confirmLoading={
          createUserMutation.isPending || updateUserMutation.isPending
        }
        okText={editingUser ? "Cập nhật" : "Tạo user"}
        cancelText="Hủy"
        title={editingUser ? "Cập nhật user" : "Thêm user mới"}
      >
        <Form layout="vertical" form={form} name="create-user-form">
          <Form.Item
            label="Họ và tên"
            name="name"
            rules={[{ required: true, message: "Nhập họ tên" }]}
          >
            <Input placeholder="Ví dụ: Nguyễn Văn A" />
          </Form.Item>

          <Form.Item
            label="Username"
            name="username"
            rules={[{ required: true, message: "Nhập username" }]}
          >
            <Input placeholder="username" disabled={Boolean(editingUser)} />
          </Form.Item>

          <Form.Item
            label="Email"
            name="email"
            rules={[
              { required: true, message: "Nhập email" },
              { type: "email", message: "Email không hợp lệ" },
            ]}
          >
            <Input placeholder="you@example.com" />
          </Form.Item>

          <Form.Item label="Số điện thoại" name="phone">
            <Input placeholder="Nhập số điện thoại" />
          </Form.Item>

          {!editingUser && (
            <>
              <Form.Item
                label="Mật khẩu"
                name="password"
                rules={[{ required: true, message: "Nhập mật khẩu" }]}
              >
                <Input.Password placeholder="Tối thiểu 6 ký tự" />
              </Form.Item>

              <Form.Item
                label="Nhập lại mật khẩu"
                name="confirmPassword"
                dependencies={["password"]}
                rules={[
                  { required: true, message: "Nhập lại mật khẩu" },
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
                <Input.Password placeholder="Nhập lại mật khẩu" />
              </Form.Item>
            </>
          )}

          <Form.Item
            label="Tenant"
            name="tenant"
            rules={[{ required: true, message: "Chọn tenant" }]}
          >
            <Select
              placeholder="Chọn tenant"
              loading={tenantsQuery.isLoading}
              options={tenants.map((tenant: TenantItem) => ({
                value: tenant.id,
                label: tenant.name,
              }))}
            />
          </Form.Item>

          <Form.Item
            label="Role"
            name="role"
            rules={[{ required: true, message: "Chọn role" }]}
          >
            <Select
              size="large"
              placeholder="Chọn role"
              loading={rolesQuery.isLoading}
              className="role-select-control"
              classNames={{ popup: { root: "role-select-dropdown" } }}
              optionLabelProp="label"
              options={roleOptions.map((role: IRoleItem) => ({
                value: role.id,
                label: (
                  <Space direction="vertical" size={0} className="leading-tight">
                    <span className="font-semibold text-slate-800">
                      {roleMeta[role.name]?.label || role.name}
                    </span>
                    <span className="text-xs text-slate-500">
                      {roleMeta[role.name]?.permissions || role.description}
                    </span>
                  </Space>
                ),
              }))}
            />
          </Form.Item>
        </Form>
      </Modal>
      <style
        dangerouslySetInnerHTML={{
          __html: `
            .role-select-control .ant-select-selector {
              min-height: 55px;
              display: flex;
              align-items: center;
            }
            .role-select-control .ant-select-selection-item {
              white-space: normal;
              line-height: 1.35;
            }
            .role-select-dropdown .ant-select-item-option-content {
              white-space: normal !important;
              line-height: 1.35;
            }
          `,
        }}
      />
    </div>
  );
};

export default Account;
