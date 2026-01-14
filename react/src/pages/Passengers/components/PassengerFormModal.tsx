import React from "react";

import { Form, Input, Modal, Select } from "antd";

import { type Passenger, type PassengerPayload, type Trip } from "../../../api/trips";

import type { FormInstance } from "antd/es/form";


export type PassengerFormValues = Pick<
  PassengerPayload,
  "trip" | "original_bus_bus_id" | "name" | "phone" | "note"
>;

type PassengerFormModalProps = {
  open: boolean;
  onCancel: () => void;
  onSubmit: () => void;
  confirmLoading: boolean;
  form: FormInstance<PassengerFormValues>;
  trips: Trip[];
  busOptions: { value: string | number; label: string }[];
  editingPassenger?: Passenger | null;
};

export default function PassengerFormModal({
  open,
  onCancel,
  onSubmit,
  confirmLoading,
  form,
  trips,
  busOptions,
  editingPassenger,
}: PassengerFormModalProps) {
  return (
    <Modal
      open={open}
      onCancel={onCancel}
      onOk={onSubmit}
      confirmLoading={confirmLoading}
      title={editingPassenger ? "Sửa passenger" : "Tạo passenger mới"}
      okText={editingPassenger ? "Cập nhật" : "Tạo"}
      cancelText="Hủy"
      destroyOnClose
    >
      <Form layout="vertical" form={form} data-ms-editor="false" autoComplete="off">
        <Form.Item
          label="Thuộc Trip"
          name="trip"
          rules={[{ required: true, message: "Chọn trip" }]}
        >
          <Select
            placeholder="Chọn trip"
            options={(Array.isArray(trips) ? trips : []).map((t) => ({
              value: t.id,
              label: t.name,
            }))}
          />
        </Form.Item>
        <Form.Item label="Xe gốc" name="original_bus_bus_id">
          <Select allowClear placeholder="Chọn xe gốc" options={busOptions} />
        </Form.Item>
        <Form.Item
          label="Tên"
          name="name"
          rules={[{ required: true, message: "Nhập tên" }]}
        >
          <Input placeholder="Họ và tên" />
        </Form.Item>
        <Form.Item label="Điện thoại" name="phone">
          <Input placeholder="Số điện thoại" />
        </Form.Item>
        <Form.Item label="Ghi chú" name="note">
          <Input.TextArea rows={3} placeholder="Ghi chú" />
        </Form.Item>
      </Form>
    </Modal>
  );
}
