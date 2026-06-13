import React, { useMemo, useState } from "react";

import { DeleteOutlined, EditOutlined } from "@ant-design/icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Button,
  Card,
  Form,
  Input,
  Modal,
  Popconfirm,
  Table,
  Tooltip,
  Typography,
  message,
  Space,
} from "antd";

import {
  createTenant,
  deleteTenant,
  getTenants,
  updateTenant,
  type TenantItem,
  type TenantPayload,
} from "../../api/tenants";

const { Title, Text } = Typography;

export default function TenantManagement() {
  const [form] = Form.useForm();
  const [showModal, setShowModal] = useState(false);
  const [editingTenant, setEditingTenant] = useState<TenantItem | null>(null);
  const queryClient = useQueryClient();

  const { data: tenantsResponse, isLoading } = useQuery({
    queryKey: ["tenants"],
    queryFn: () => getTenants({ page: 1, limit: 1000 }),
  });

  const tenants = useMemo(
    () => (Array.isArray(tenantsResponse?.data) ? tenantsResponse.data : []),
    [tenantsResponse],
  );

  const createMutation = useMutation({
    mutationFn: (payload: TenantPayload) => createTenant(payload),
    onSuccess: async () => {
      message.success("Tạo tenant thành công");
      await queryClient.invalidateQueries({ queryKey: ["tenants"] });
    },
    onError: () => message.error("Tạo tenant thất bại"),
  });

  const updateMutation = useMutation({
    mutationFn: (data: { id: number | string; payload: TenantPayload }) =>
      updateTenant(data.id, data.payload),
    onSuccess: async () => {
      message.success("Cập nhật tenant thành công");
      await queryClient.invalidateQueries({ queryKey: ["tenants"] });
    },
    onError: () => message.error("Cập nhật tenant thất bại"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number | string) => deleteTenant(id),
    onSuccess: async () => {
      message.success("Xóa tenant thành công");
      await queryClient.invalidateQueries({ queryKey: ["tenants"] });
    },
    onError: () => message.error("Xóa tenant thất bại"),
  });

  const openCreate = () => {
    setEditingTenant(null);
    form.resetFields();
    setShowModal(true);
  };

  const openEdit = (tenant: TenantItem) => {
    setEditingTenant(tenant);
    form.setFieldsValue({
      name: tenant.name,
      phone: tenant.phone,
      address: tenant.address,
      description: tenant.description,
    });
    setShowModal(true);
  };

  const handleSubmit = () => {
    form
      .validateFields()
      .then((values) => {
        const payload: TenantPayload = {
          name: values.name,
          phone: values.phone,
          address: values.address,
          description: values.description || "",
        };
        if (editingTenant) {
          updateMutation.mutate({ id: editingTenant.id, payload });
        } else {
          createMutation.mutate(payload);
        }
        setShowModal(false);
      })
      .catch(() => undefined);
  };

  return (
    <div className="w-full bg-[#f4f7fb] h-full py-6">
      <div className="bg-white shadow-sm rounded-2xl p-6 border border-slate-100">
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 mb-2">
          <div className="flex-1 min-w-[250px] pr-4">
            <p className="text-sm uppercase tracking-[0.25em] text-sky-700 font-semibold">
              Tenant Management
            </p>
            <Title level={2} style={{ margin: 0 }}>
              Quản lý Công ty
            </Title>
            <Text type="secondary">
              Tạo, cập nhật hoặc xóa Công ty để gán cho Chuyến đi.
            </Text>
          </div>
          <Button type="primary" onClick={openCreate}>
            + Tạo Công ty
          </Button>
        </div>

        <Card className="mt-6" styles={{ body: { padding: 0 } }}>
          <Table scroll={{ x: "max-content" }}
            size="small"
            rowKey="id"
            dataSource={tenants}
            loading={isLoading}
            pagination={{ defaultPageSize: 10, showSizeChanger: true, pageSizeOptions: ["5", "10", "20", "50"] }}
            columns={[
              {
                title: "Tên",
                dataIndex: "name",
              },
              {
                title: "Số điện thoại",
                dataIndex: "phone",
                render: (val: string) => val || "—",
              },
              {
                title: "Địa chỉ",
                dataIndex: "address",
                render: (val: string) => val || "—",
              },
              {
                title: "Mô tả",
                dataIndex: "description",
                render: (val: string) => val || "—",
              },
              {
                title: "Thao tác",
                dataIndex: "actions",
                render: (_: unknown, record: TenantItem) => (
                  <Space>
                    <Tooltip title="Sửa">
                      <Button
                        type="text"
                        icon={<EditOutlined />}
                        onClick={() => openEdit(record)}
                        style={{ color: "#2563eb" }}
                      />
                    </Tooltip>
                    <Popconfirm
                      title="Xóa tenant này?"
                      description="Thao tác này không thể hoàn tác."
                      onConfirm={() => deleteMutation.mutate(record.id)}
                      okText="Xóa"
                      cancelText="Hủy"
                    >
                      <Tooltip title="Xóa">
                        <Button
                          type="text"
                          danger
                          icon={<DeleteOutlined />}
                        />
                      </Tooltip>
                    </Popconfirm>
                  </Space>
                ),
              },
            ]}
          />
        </Card>
      </div>

      <Modal
        open={showModal}
        onCancel={() => setShowModal(false)}
        onOk={handleSubmit}
        confirmLoading={
          createMutation.status === "pending" ||
          updateMutation.status === "pending"
        }
        title={editingTenant ? "Cập nhật Công ty" : "Tạo Công ty mới"}
        okText={editingTenant ? "Cập nhật" : "Tạo"}
        cancelText="Hủy"
        destroyOnHidden
      >
        <Form layout="vertical" form={form}>
          <Form.Item
            label="Tên"
            name="name"
            rules={[{ required: true, message: "Nhập tên Công ty" }]}
          >
            <Input placeholder="Ví dụ: Công ty ABC" />
          </Form.Item>
          <Form.Item label="Số điện thoại" name="phone">
            <Input placeholder="Nhập số điện thoại" />
          </Form.Item>
          <Form.Item label="Địa chỉ" name="address">
            <Input placeholder="Nhập địa chỉ" />
          </Form.Item>
          <Form.Item label="Mô tả" name="description">
            <Input.TextArea rows={3} placeholder="Ghi chú" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
