import React from "react";

import {
  Col,
  DatePicker,
  Form,
  Input,
  Modal,
  Row,
  Select,
} from "antd";
import dayjs from "dayjs";

import type { TenantItem } from "../../../api/tenants";
import type { Trip } from "../../../api/trips";
import type { FormInstance } from "antd";

export interface TripFormValues {
  name: string;
  tenant_id: string | number;
  description?: string;
  start_date: dayjs.Dayjs;
  end_date: dayjs.Dayjs;
}

interface TripFormModalProps {
  open: boolean;
  onCancel: () => void;
  onSubmit: () => void;
  confirmLoading: boolean;
  form: FormInstance<TripFormValues>;
  tenants: TenantItem[];
  loadingTenants: boolean;
  accountTenant?: string | number;
  editingTrip?: Trip | null;
}

export default function TripFormModal({
  open,
  onCancel,
  onSubmit,
  confirmLoading,
  form,
  tenants,
  loadingTenants,
  accountTenant,
  editingTrip,
}: TripFormModalProps) {

  return (
    <Modal
      open={open}
      onCancel={onCancel}
      onOk={onSubmit}
      confirmLoading={confirmLoading}
      title={editingTrip ? "Sửa chuyến đi" : "Tạo chuyến đi mới"}
      okText={editingTrip ? "Cập nhật" : "Tạo"}
      cancelText="Hủy"
      destroyOnClose
      width="min(720px, 95vw)"
    >
      <Form layout="vertical" form={form} initialValues={{ status: "planned" }} size="large">
        <Form.Item
          label="Tên chuyến đi"
          name="name"
          rules={[{ required: true, message: "Nhập tên chuyến đi" }]}
        >
          <Input placeholder="Ví dụ: Bách Khoa – Sân bay Nội Bài" />
        </Form.Item>

        <Form.Item
          label="Tenant"
          name="tenant_id"
          rules={[{ required: true, message: "Chọn tenant" }]}
        >
          <Select
            loading={loadingTenants}
            disabled={!!accountTenant}
            placeholder="Chọn tenant"
            options={tenants.map((tenant: TenantItem) => ({
              value: tenant.id,
              label: tenant.name,
            }))}
          />
        </Form.Item>

        <Form.Item label="Mô tả" name="description">
          <Input.TextArea rows={4} placeholder="Nhập mô tả chi tiết về chuyến đi..." />
        </Form.Item>

        <Row gutter={16}>
          <Col xs={24} sm={12}>
            <Form.Item
              label="Ngày bắt đầu"
              name="start_date"
              rules={[{ required: true, message: "Chọn ngày bắt đầu" }]}
            >
              <DatePicker style={{ width: "100%" }} format="YYYY-MM-DD" placeholder="Chọn ngày bắt đầu" />
            </Form.Item>
          </Col>
          <Col xs={24} sm={12}>
            <Form.Item
              label="Ngày kết thúc"
              name="end_date"
              rules={[{ required: true, message: "Chọn ngày kết thúc" }]}
            >
              <DatePicker style={{ width: "100%" }} format="YYYY-MM-DD" placeholder="Chọn ngày kết thúc" />
            </Form.Item>
          </Col>
        </Row>
      </Form>
    </Modal>
  );
}
