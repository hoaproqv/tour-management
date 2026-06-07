import React from "react";

import { UploadOutlined } from "@ant-design/icons";
import { useQueryClient } from "@tanstack/react-query";
import { Button, Form, Input, Modal, Typography, Upload, message } from "antd";

import { downloadBusTemplate, importBuses } from "../../../api/trips";

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
  const queryClient = useQueryClient();

  const handleDownloadTemplate = async () => {
    try {
      const blob = await downloadBusTemplate();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "bus_import_template.xlsx";
      a.click();
      window.URL.revokeObjectURL(url);
    } catch {
      message.error("Lỗi khi tải template");
    }
  };

  const customRequest = async ({ file, onSuccess, onError }: any) => {
    try {
      const fd = new FormData();
      fd.append("file", file as File);
      const res = await importBuses(fd);
      message.success(res.detail || "Import thành công");
      await queryClient.invalidateQueries({ queryKey: ["buses"] });
      onSuccess?.(res);
      onCancel();
    } catch (err: any) {
      message.error(err?.response?.data?.detail || "Import thất bại");
      onError?.(err);
    }
  };

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
      {!editingBus && (
        <div className="mb-5 p-4 bg-blue-50/50 rounded-xl border border-blue-100 flex flex-col items-center justify-center gap-3">
          <Typography.Text className="text-slate-600 text-sm">
            Bạn có thể thêm nhiều xe cùng lúc bằng cách import file Excel.
          </Typography.Text>
          <div className="flex items-center gap-2">
            <Upload accept=".xlsx,.xls" showUploadList={false} customRequest={customRequest}>
              <Button icon={<UploadOutlined />} size="small" className="border-blue-300 text-blue-600 hover:bg-blue-100">
                Import từ Excel
              </Button>
            </Upload>
            <Typography.Text type="secondary" className="text-xs">hoặc</Typography.Text>
            <a onClick={handleDownloadTemplate} className="text-blue-600 underline hover:text-blue-800 text-sm font-medium">
              tải file mẫu
            </a>
          </div>
        </div>
      )}
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
