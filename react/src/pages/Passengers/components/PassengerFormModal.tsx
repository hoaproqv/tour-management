import React from "react";

import { UploadOutlined } from "@ant-design/icons";
import { Form, Input, Modal, Button, Typography } from "antd";

import { type Passenger, type PassengerPayload } from "../../../api/trips";

import type { FormInstance } from "antd/es/form";

export type PassengerFormValues = Pick<
  PassengerPayload,
  "name" | "phone" | "note"
>;

type PassengerFormModalProps = {
  open: boolean;
  onCancel: () => void;
  onSubmit: () => void;
  confirmLoading: boolean;
  form: FormInstance<PassengerFormValues>;
  editingPassenger?: Passenger | null;
  onOpenImport?: () => void;
};

export default function PassengerFormModal({
  open,
  onCancel,
  onSubmit,
  confirmLoading,
  form,
  editingPassenger,
  onOpenImport,
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
      <Form
        layout="vertical"
        form={form}
        data-ms-editor="false"
        autoComplete="off"
      >
        {!editingPassenger && onOpenImport && (
          <div className="mb-5 p-4 bg-blue-50/50 rounded-xl border border-blue-100 flex flex-col items-center justify-center gap-3">
            <Typography.Text className="text-slate-600 text-sm">
              Bạn có thể thêm nhiều hành khách cùng lúc bằng cách import file
              Excel.
            </Typography.Text>
            <div className="flex items-center gap-2">
              <Button
                icon={<UploadOutlined />}
                size="small"
                className="border-blue-300 text-blue-600 hover:bg-blue-100"
                onClick={onOpenImport}
              >
                Import từ Excel
              </Button>
            </div>
          </div>
        )}
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
