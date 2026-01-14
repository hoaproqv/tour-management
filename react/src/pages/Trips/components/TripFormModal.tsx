import React from "react";

import { DatePicker, Form, Input, Modal, Select, Space } from "antd";
import dayjs from "dayjs";

import type { TenantItem } from "../../../api/tenants";
import type { BusItem, Trip } from "../../../api/trips";
import type { FormInstance } from "antd";

export interface TripFormValues {
  name: string;
  tenant_id: string | number;
  description?: string;
  status: Trip["status"];
  start_date: dayjs.Dayjs;
  end_date: dayjs.Dayjs;
  bus_ids?: Array<string | number>;
}

interface TripFormModalProps {
  open: boolean;
  onCancel: () => void;
  onSubmit: () => void;
  confirmLoading: boolean;
  form: FormInstance<TripFormValues>;
  tenants: TenantItem[];
  loadingTenants: boolean;
  buses: BusItem[];
  loadingBuses: boolean;
  accountTenant?: string | number;
  editingTrip?: Trip | null;
  statusMeta: Record<Trip["status"], { label: string; color: string }>;
}

export default function TripFormModal({
  open,
  onCancel,
  onSubmit,
  confirmLoading,
  form,
  tenants,
  loadingTenants,
  buses,
  loadingBuses,
  accountTenant,
  editingTrip,
  statusMeta,
}: TripFormModalProps) {
  return (
    <Modal
      open={open}
      onCancel={onCancel}
      onOk={onSubmit}
      confirmLoading={confirmLoading}
      title={editingTrip ? "Sửa trip" : "Tạo trip mới"}
      okText={editingTrip ? "Cập nhật" : "Tạo"}
      cancelText="Hủy"
      destroyOnClose
    >
      <Form
        layout="vertical"
        form={form}
        initialValues={{ status: "planned" }}
      >
        <Form.Item
          label="Tên trip"
          name="name"
          rules={[{ required: true, message: "Nhập tên trip" }]}
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
          <Input.TextArea rows={3} placeholder="Mô tả ngắn" />
        </Form.Item>
        <Form.Item label="Chọn xe bus" name="bus_ids">
          <Select
            mode="multiple"
            loading={loadingBuses}
            placeholder="Chọn một hoặc nhiều xe"
            optionFilterProp="label"
            options={buses.map((bus) => ({
              value: bus.id,
              label:
                bus.registration_number ||
                bus.bus_code ||
                `Bus ${bus.id}`,
            }))}
          />
        </Form.Item>
        <Form.Item
          label="Trạng thái"
          name="status"
          rules={[{ required: true }]}
        >
          <Select
            options={Object.entries(statusMeta).map(([value, meta]) => ({
              value,
              label: meta.label,
            }))}
          />
        </Form.Item>
        <Space size="middle" style={{ width: "100%" }}>
          <Form.Item
            label="Ngày bắt đầu"
            name="start_date"
            rules={[{ required: true, message: "Chọn ngày bắt đầu" }]}
            style={{ flex: 1 }}
          >
            <DatePicker className="w-full" format="YYYY-MM-DD" />
          </Form.Item>
          <Form.Item
            label="Ngày kết thúc"
            name="end_date"
            rules={[{ required: true, message: "Chọn ngày kết thúc" }]}
            style={{ flex: 1 }}
          >
            <DatePicker className="w-full" format="YYYY-MM-DD" />
          </Form.Item>
        </Space>
      </Form>
    </Modal>
  );
}
