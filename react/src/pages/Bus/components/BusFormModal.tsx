import React from "react";

import { Form, Input, Modal } from "antd";

import type { BusItem } from "../../../api/trips";
import type { FormInstance } from "antd";


export interface BusFormValues {
  registration_number: string;
  bus_code: string;
  capacity: number;
  description?: string;
}

interface BusFormModalProps {
  open: boolean;
  onCancel: () => void;
  onSubmit: () => void;
  confirmLoading: boolean;
  form: FormInstance<BusFormValues>;
  editingBus?: BusItem | null;
}

export default function BusFormModal({
  open,
  onCancel,
  onSubmit,
  confirmLoading,
  form,
  editingBus,
}: BusFormModalProps) {
  return (
    <Modal
      open={open}
      onCancel={onCancel}
      onOk={onSubmit}
      confirmLoading={confirmLoading}
      title={editingBus ? "Sửa bus" : "Tạo bus mới"}
      okText={editingBus ? "Cập nhật" : "Tạo"}
      cancelText="Hủy"
      destroyOnClose
    >
      <Form layout="vertical" form={form} initialValues={{ capacity: 40 }}>
        <Form.Item
          label="Biển số"
          name="registration_number"
          rules={[{ required: true, message: "Nhập biển số" }]}
        >
          <Input placeholder="51B-12345" />
        </Form.Item>
        <Form.Item
          label="Mã xe"
          name="bus_code"
          rules={[{ required: true, message: "Nhập mã xe" }]}
        >
          <Input placeholder="BUS-01" />
        </Form.Item>
        <Form.Item
          label="Sức chứa"
          name="capacity"
          rules={[{ required: true, message: "Nhập sức chứa" }]}
        >
          <Input type="number" min={1} />
        </Form.Item>
        <Form.Item label="Mô tả" name="description">
          <Input.TextArea
            rows={3}
            placeholder="Ghi chú, loại xe, tài xế..."
          />
        </Form.Item>
      </Form>
    </Modal>
  );
}
