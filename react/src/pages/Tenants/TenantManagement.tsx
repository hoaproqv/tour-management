import React, { useMemo, useState } from "react";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Button,
  Card,
  Form,
  Input,
  Modal,
  Popconfirm,
  Space,
  Table,
  Typography,
  message,
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
    <div className="w-full bg-[#f4f7fb] min-h-screen py-6">
      <div className="bg-white shadow-sm rounded-2xl p-6 border border-slate-100">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <p className="text-sm uppercase tracking-[0.25em] text-sky-700 font-semibold">
              Tenant Management
            </p>
            <Title level={2} style={{ margin: 0 }}>
              Quản lý Tenant
            </Title>
            <Text type="secondary">
              Tạo, cập nhật hoặc xóa tenant để gán cho chuyến đi.
            </Text>
          </div>
          <Button type="primary" onClick={openCreate}>
            + New Tenant
          </Button>
        </div>

        <Card className="mt-6" styles={{ body: { padding: 0 } }}>
          <Table
            rowKey="id"
            dataSource={tenants}
            loading={isLoading}
            pagination={{ pageSize: 8, showSizeChanger: false }}
            columns={[
              {
                title: "Tên",
                dataIndex: "name",
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
                    <Button type="link" onClick={() => openEdit(record)}>
                      Sửa
                    </Button>
                    <Popconfirm
                      title="Xóa tenant?"
                      okText="Xóa"
                      cancelText="Hủy"
                      onConfirm={() => deleteMutation.mutate(record.id)}
                    >
                      <Button type="link" danger>
                        Xóa
                      </Button>
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
        title={editingTenant ? "Cập nhật tenant" : "Tạo tenant mới"}
        okText={editingTenant ? "Cập nhật" : "Tạo"}
        cancelText="Hủy"
        destroyOnHidden
      >
        <Form layout="vertical" form={form}>
          <Form.Item
            label="Tên"
            name="name"
            rules={[{ required: true, message: "Nhập tên tenant" }]}
          >
            <Input placeholder="Ví dụ: Công ty ABC" />
          </Form.Item>
          <Form.Item label="Mô tả" name="description">
            <Input.TextArea rows={3} placeholder="Ghi chú" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
