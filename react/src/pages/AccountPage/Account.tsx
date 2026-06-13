import React, { useMemo, useState } from "react";

import {
  UserAddOutlined,
  EditOutlined,
  DeleteOutlined,
} from "@ant-design/icons";
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
  Tooltip,
  Typography,
  message,
} from "antd";

import { getTenants, type TenantItem } from "../../api/tenants";
import { createUser, getRoles, getUsers } from "../../api/users";
import { deleteUser, updateUser, bulkDeleteUsers } from "../../api/users";
import { useGetAccountInfo } from "../../hooks/useAuth";

import type { IRoleItem, IUser, IUserPayload } from "../../utils/types";
import type { TableColumnsType } from "antd";

const { Title, Text } = Typography;

const roleMeta: Record<
  string,
  { label: string; color: string; permissions: string }
> = {
  tour_manager: {
    label: "Quản lý chuyến đi",
    color: "geekblue",
    permissions: "Thêm/sửa/xoá Xe, Chuyến, Chặng, Hành khách.",
  },
  fleet_lead: {
    label: "Trưởng xe",
    color: "cyan",
    permissions:
      "Điểm danh hành khách của xe mình, điểm danh lên/xuống xe và chốt điểm danh.",
  },
  driver: {
    label: "Lái xe",
    color: "green",
    permissions:
      "Chỉ xem điểm danh hành khách và lịch trình chặng trong chuyến đi.",
  },
};

type UserFormValues = IUserPayload & { confirmPassword: string };

const renderRoleTag = (roleName?: string | null) => {
  const meta = roleMeta[roleName ?? ""];
  if (!roleName) return <Tag>Không có</Tag>;
  if (!meta) return <Tag color="default">{roleName}</Tag>;
  return <Tag color={meta.color}>{meta.label}</Tag>;
};

export const Account = () => {
  const queryClient = useQueryClient();
  const [form] = Form.useForm<UserFormValues>();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<IUser | null>(null);
  const [pagination, setPagination] = useState({ page: 1, limit: 10 });
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [tenantFilter, setTenantFilter] = useState<string>("all");
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [isSelectionMode, setIsSelectionMode] = useState(false);

  React.useEffect(() => {
    const handler = setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => clearTimeout(handler);
  }, [search]);

  const { data: accountData } = useGetAccountInfo();
  const currentUser = accountData as IUser | undefined;

  const isAdmin = useMemo(() => {
    const roleSlug = (currentUser?.role_name || "").toString().toLowerCase();
    return Boolean(
      currentUser?.is_superuser ||
        currentUser?.is_staff ||
        roleSlug === "admin",
    );
  }, [currentUser]);

  const usersQuery = useQuery({
    queryKey: [
      "users",
      pagination.page,
      pagination.limit,
      debouncedSearch,
      roleFilter,
      tenantFilter,
    ],
    queryFn: () =>
      getUsers({
        page: pagination.page,
        limit: pagination.limit,
        search: debouncedSearch,
        role: roleFilter !== "all" ? roleFilter : undefined,
        tenant: tenantFilter !== "all" ? tenantFilter : undefined,
      }),
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
    () =>
      Array.isArray(tenantsQuery.data?.data) ? tenantsQuery.data?.data : [],
    [tenantsQuery.data],
  );
  const allRoleOptions = useMemo(() => {
    return rolesQuery.data ?? [];
  }, [rolesQuery.data]);

  const formRoleOptions = useMemo(() => {
    const allowed = new Set(["tour_manager", "fleet_lead", "driver"]);
    return allRoleOptions.filter((role) => allowed.has(String(role.name)));
  }, [allRoleOptions]);

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
    mutationFn: (data: {
      id: number | string;
      payload: Partial<IUserPayload>;
    }) => updateUser(data.id, data.payload),
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
    onError: (error: any) =>
      message.error(error?.message || "Không thể xóa user"),
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
      render: (_: string, record: IUser) =>
        record.tenant_name || record.tenant || "—",
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
        <Tag color={value ? "green" : "red"}>
          {value ? "Active" : "Inactive"}
        </Tag>
      ),
    },
    {
      title: "Thao tác",
      dataIndex: "actions",
      render: (_: unknown, record: IUser) => (
        <Space>
          <Tooltip title="Sửa">
            <Button
              type="text"
              icon={<EditOutlined />}
              onClick={() => openEditModal(record)}
              style={{ color: "#2563eb" }}
            />
          </Tooltip>
          <Tooltip title="Xóa">
            <Button
              type="text"
              danger
              icon={<DeleteOutlined />}
              onClick={() =>
                Modal.confirm({
                  title: "Xóa user?",
                  content: `Bạn chắc chắn muốn xóa ${record.name || record.username}?`,
                  okText: "Xóa",
                  cancelText: "Hủy",
                  onOk: () => deleteUserMutation.mutate(record.id),
                })
              }
            />
          </Tooltip>
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
    <div className="w-full bg-[#f4f7fb] h-full py-6">
      <div className="bg-white shadow-sm rounded-2xl p-6 border border-slate-100">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex-1 min-w-[250px] pr-4">
            <p className="text-sm uppercase tracking-[0.25em] text-sky-700 font-semibold">
              User Management
            </p>
            <Title level={2} style={{ margin: 0 }}>
              Quản lý Người dùng
            </Title>
            <Text type="secondary">Quản lý tài khoản và vai trò.</Text>
          </div>
          <div className="flex flex-wrap items-center gap-3 w-full xl:w-auto">
            <Input
              allowClear
              placeholder="Tìm theo tên, email, sđt..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPagination((prev) => ({ ...prev, page: 1 }));
              }}
              className="w-full sm:w-52"
            />
            {isAdmin && (
              <>
                <Select
                  value={roleFilter}
                  onChange={(val) => {
                    setRoleFilter(val);
                    setPagination((prev) => ({ ...prev, page: 1 }));
                  }}
                  className="w-full sm:w-32"
                  options={[
                    { value: "all", label: "Tất cả Role" },
                    ...allRoleOptions.map((r: any) => ({
                      value: r.id,
                      label: roleMeta[r.name]?.label || r.name,
                    })),
                  ]}
                />
                <Select
                  value={tenantFilter}
                  onChange={(val) => {
                    setTenantFilter(val);
                    setPagination((prev) => ({ ...prev, page: 1 }));
                  }}
                  className="w-full sm:w-48"
                  options={[
                    { value: "all", label: "Tất cả Tenant" },
                    ...tenants.map((t: any) => ({
                      value: t.id,
                      label: t.name,
                    })),
                  ]}
                />
                <Button
                  type="primary"
                  icon={<UserAddOutlined />}
                  onClick={openCreateModal}
                >
                  + Thêm User
                </Button>
              </>
            )}
          </div>
        </div>

        <Alert
          className="mt-5"
          message="Quyền theo role"
          description={
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mt-2">
              {Object.entries(roleMeta).map(([key, meta]) => (
                <div key={key} className="flex items-start gap-2">
                  {renderRoleTag(key)}
                  <div>
                    <p className="font-semibold text-slate-800 text-sm">
                      {meta.label}
                    </p>
                    <p className="text-xs text-slate-600 leading-snug">
                      {meta.permissions}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          }
          type="info"
          showIcon
        />

        {isAdmin && (
          <div className="flex justify-end mt-4 mb-2">
            {isSelectionMode ? (
              <div className="flex gap-2">
                <Button
                  onClick={() => {
                    setIsSelectionMode(false);
                    setSelectedRowKeys([]);
                  }}
                >
                  Hủy
                </Button>
                {selectedRowKeys.length > 0 && (
                  <Button
                    danger
                    icon={<DeleteOutlined />}
                    onClick={() => {
                      Modal.confirm({
                        title: "Xóa nhiều user?",
                        content: `Bạn chắc chắn muốn xóa ${selectedRowKeys.length} user đã chọn?`,
                        okText: "Xóa",
                        cancelText: "Hủy",
                        onOk: async () => {
                          const hide = message.loading("Đang xóa...", 0);
                          try {
                            await bulkDeleteUsers(selectedRowKeys as (string | number)[]);
                            message.success(
                              `Đã xóa ${selectedRowKeys.length} user`,
                            );
                            setSelectedRowKeys([]);
                            setIsSelectionMode(false);
                            await queryClient.invalidateQueries({
                              queryKey: ["users"],
                            });
                          } catch {
                            message.error("Lỗi khi xóa user");
                          } finally {
                            hide();
                          }
                        },
                      });
                    }}
                  >
                    Xóa đã chọn ({selectedRowKeys.length})
                  </Button>
                )}
              </div>
            ) : (
              <Button danger onClick={() => setIsSelectionMode(true)}>
                Xóa nhiều
              </Button>
            )}
          </div>
        )}

        <Card className="mt-4" styles={{ body: { padding: 0 } }}>
          <Table
            size="small"
            scroll={{ x: "max-content" }}
            rowKey="id"
            rowSelection={
              isSelectionMode
                ? {
                    selectedRowKeys,
                    onChange: (newSelectedRowKeys) =>
                      setSelectedRowKeys(newSelectedRowKeys),
                  }
                : undefined
            }
            dataSource={users}
            loading={usersQuery.isLoading || usersQuery.isFetching}
            columns={columns}
            pagination={{
              current: pagination.page,
              pageSize: pagination.limit,
              total: usersQuery.data?.pagination.total_items ?? users.length,
              onChange: (page, pageSize) =>
                setPagination({ page, limit: pageSize }),
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
          <div className="grid grid-cols-1 md:grid-cols-2 md:gap-x-4">
            <Form.Item
              label="Chọn công ty"
              name="tenant"
              rules={[{ required: true, message: "Chọn công ty" }]}
            >
              <Select
                placeholder="Chọn công ty"
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
              rules={[{ required: true, message: "Chọn vai trò" }]}
            >
              <Select
                placeholder="Chọn role"
                loading={rolesQuery.isLoading}
                options={formRoleOptions.map((role: IRoleItem) => ({
                  value: role.id,
                  label: roleMeta[role.name]?.label || role.name,
                }))}
              />
            </Form.Item>

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

            <Form.Item
              label="Số điện thoại"
              name="phone"
              rules={[{ required: true, message: "Nhập số điện thoại" }]}
            >
              <Input placeholder="Nhập số điện thoại" />
            </Form.Item>

            {!editingUser && (
              <>
                <Form.Item
                  label="Mật khẩu"
                  name="password"
                  rules={[
                    { required: true, message: "Nhập mật khẩu" },
                    { min: 8, message: "Mật khẩu phải có ít nhất 8 ký tự" },
                  ]}
                >
                  <Input.Password
                    placeholder="Tối thiểu 8 ký tự"
                    onCopy={(e) => e.preventDefault()}
                  />
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
                  <Input.Password
                    placeholder="Nhập lại mật khẩu"
                    onCopy={(e) => e.preventDefault()}
                  />
                </Form.Item>
              </>
            )}
          </div>
        </Form>
      </Modal>
    </div>
  );
};

export default Account;
