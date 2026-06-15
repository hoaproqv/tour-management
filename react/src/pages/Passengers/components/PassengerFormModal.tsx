import React from "react";

import { UploadOutlined } from "@ant-design/icons";
import { useQuery } from "@tanstack/react-query";
import { Form, Input, Modal, Button, Typography, Select } from "antd";

import {
  downloadPassengerTemplate,
  getTripBuses,
  type Passenger,
  type Trip,
} from "../../../api/trips";

import type { FormInstance } from "antd/es/form";

export interface PassengerFormValues {
  name: string;
  phone?: string;
  extra_info?: string;
  note?: string;
  trip_id?: string;
  trip_bus_id?: string;
}

type PassengerFormModalProps = {
  open: boolean;
  onCancel: () => void;
  onSubmit: () => void;
  confirmLoading: boolean;
  form: FormInstance<PassengerFormValues>;
  editingPassenger?: Passenger | null;
  onOpenImport?: () => void;
  trips: Trip[];
};

export default function PassengerFormModal({
  open,
  onCancel,
  onSubmit,
  confirmLoading,
  form,
  editingPassenger,
  onOpenImport,
  trips,
}: PassengerFormModalProps) {
  const selectedTripId = Form.useWatch("trip_id", form);

  const { data: tripBusesResponse } = useQuery({
    queryKey: ["trip-buses", { trip: selectedTripId }],
    queryFn: () => getTripBuses({ trip: selectedTripId, page: 1, limit: 1000 }),
    enabled: open && Boolean(selectedTripId) && !editingPassenger,
  });

  const tripBuses = Array.isArray(tripBusesResponse?.data) ? tripBusesResponse.data : [];

  const handleDownloadTemplate = async () => {
    try {
      const blob = await downloadPassengerTemplate();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "passenger_import_template.xlsx";
      a.click();
      window.URL.revokeObjectURL(url);
    } catch {
      // Ignore error
    }
  };

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
              <Typography.Text type="secondary" className="text-xs">
                hoặc
              </Typography.Text>
              <a
                onClick={handleDownloadTemplate}
                className="text-blue-600 underline hover:text-blue-800 text-sm font-medium"
              >
                Tải template
              </a>
            </div>
          </div>
        )}

        {!editingPassenger && (
          <div className="grid grid-cols-2 gap-4">
            <Form.Item
              name="trip_id"
              label="Chuyến đi"
              rules={[{ required: true, message: "Vui lòng chọn chuyến đi" }]}
            >
              <Select
                showSearch
                optionFilterProp="label"
                placeholder="Chọn chuyến đi"
                options={trips.map((t) => ({ value: String(t.id), label: t.name }))}
                onChange={() => form.setFieldValue("trip_bus_id", undefined)}
              />
            </Form.Item>

            <Form.Item
              name="trip_bus_id"
              label="Gán vào xe (Tùy chọn)"
            >
              <Select
                showSearch
                optionFilterProp="label"
                placeholder="Chọn xe"
                allowClear
                disabled={!selectedTripId}
                options={tripBuses.map((tb) => ({
                  value: String(tb.id),
                  label: `${tb.registration_number || tb.bus_code || `Bus #${tb.id}`} (${tb.capacity || 0} chỗ)`,
                }))}
              />
            </Form.Item>
          </div>
        )}

        <Form.Item
          name="name"
          label="Họ và tên"
          rules={[{ required: true, message: "Vui lòng nhập họ và tên" }]}
        >
          <Input placeholder="Nhập họ tên hành khách" autoFocus={!!editingPassenger} />
        </Form.Item>

        <Form.Item name="phone" label="Số điện thoại">
          <Input placeholder="Nhập số điện thoại (nếu có)" />
        </Form.Item>

        <Form.Item name="extra_info" label="Thông tin thêm (Tuỳ chọn)">
          <Input placeholder="Ví dụ: Phòng ban, vị trí, công ty..." />
        </Form.Item>

        <Form.Item name="note" label="Ghi chú">
          <Input.TextArea
            rows={3}
            placeholder="Ví dụ: Ăn chay, đón tại sảnh..."
          />
        </Form.Item>
      </Form>
    </Modal>
  );
}
