import React, { useEffect, useMemo, useState } from "react";

import { UploadOutlined } from "@ant-design/icons";
import { useQueryClient } from "@tanstack/react-query";
import { Button, DatePicker, Form, Input, Modal, Select, Typography, Upload, message } from "antd";
import dayjs from "dayjs";

import { downloadRoundTemplate, importRounds } from "../../../api/trips";

import type { Passenger, RoundItem, Trip } from "../../../api/trips";
import type { FormInstance } from "antd";

export interface RoundFormValues {
  trip: string;
  name: string;
  location: string;
  sequence: number;
  estimate_time: dayjs.Dayjs;
  actual_time?: dayjs.Dayjs | null;
  status: RoundItem["status"];
  bus_ids?: Array<string | number>;
}

interface RoundFormModalProps {
  open: boolean;
  onCancel: () => void;
  onSubmit: () => void;
  confirmLoading: boolean;
  form: FormInstance<RoundFormValues>;
  trips: Trip[];
  busOptions: { value: string | number; label: string }[];
  tripDefaultBusMap: Map<string, Array<string | number>>;
  tripPassengersMap: Map<string, Passenger[]>;
  editingRound?: RoundItem | null;
  statusMeta: Record<
    RoundItem["status"],
    { label: string; color: string }
  >;
  tripFilter?: string;
}

export default function RoundFormModal({
  open,
  onCancel,
  onSubmit,
  confirmLoading,
  form,
  trips,
  busOptions,
  tripDefaultBusMap,
  tripPassengersMap,
  editingRound,
  statusMeta,
  tripFilter,
}: RoundFormModalProps) {
  const queryClient = useQueryClient();
  const tripValue = Form.useWatch("trip", form);
  const [showPassengersModal, setShowPassengersModal] = useState(false);

  // Auto set trip if tripFilter is provided and not "all"
  useEffect(() => {
    if (open && tripFilter && tripFilter !== "all" && !editingRound && !form.getFieldValue("trip")) {
      form.setFieldsValue({ trip: tripFilter });
    }
  }, [open, tripFilter, form, editingRound]);

  const handleDownloadTemplate = async () => {
    try {
      const blob = await downloadRoundTemplate();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "round_import_template.xlsx";
      a.click();
      window.URL.revokeObjectURL(url);
    } catch {
      message.error("Lỗi khi tải template");
    }
  };

  const customRequest = async ({ file, onSuccess, onError }: any) => {
    if (!tripValue) {
      message.warning("Vui lòng chọn một trip ở form bên dưới trước khi import file");
      onError?.(new Error("No trip selected"));
      return;
    }
    try {
      const fd = new FormData();
      fd.append("file", file as File);
      const res = await importRounds(tripValue, fd);
      message.success(res.detail || "Import thành công");
      await queryClient.invalidateQueries({ queryKey: ["rounds"] });
      onSuccess?.(res);
      onCancel();
    } catch (err: any) {
      message.error(err?.response?.data?.detail || "Import thất bại");
      onError?.(err);
    }
  };

  useEffect(() => {
    if (!open) return;
    const currentBusIds = form.getFieldValue("bus_ids");
    if (tripValue && (!currentBusIds || currentBusIds.length === 0)) {
      const defaults = tripDefaultBusMap.get(tripValue) || [];
      if (defaults.length) {
        form.setFieldsValue({ bus_ids: defaults });
      }
    }
  }, [open, tripValue, form, tripDefaultBusMap]);

  const passengersForTrip = useMemo(
    () => tripPassengersMap.get(tripValue || "") || [],
    [tripPassengersMap, tripValue],
  );

  const tripLabel = useMemo(
    () => {
      const trip = trips.find((t) => t.id === tripValue);
      return trip?.name || "Trip";
    },
    [trips, tripValue],
  );

  return (
    <Modal
      open={open}
      onCancel={onCancel}
      onOk={onSubmit}
      confirmLoading={confirmLoading}
      title={editingRound ? "Sửa round" : "Tạo round mới"}
      okText={editingRound ? "Cập nhật" : "Tạo"}
      cancelText="Hủy"
      destroyOnClose
    >
      <Form
        layout="vertical"
        form={form}
        initialValues={{ status: "planned" }}
      >
        {!editingRound && (
          <div className="mb-5 p-4 bg-blue-50/50 rounded-xl border border-blue-100 flex flex-col items-center justify-center gap-3">
            <Typography.Text className="text-slate-600 text-sm">
              Bạn có thể thêm nhiều chặng cùng lúc bằng cách import file Excel.
            </Typography.Text>
            <div className="flex items-center gap-2">
              <Upload accept=".xlsx,.xls" showUploadList={false} customRequest={customRequest}>
                <Button
                  icon={<UploadOutlined />}
                  size="small"
                  className="border-blue-300 text-blue-600 hover:bg-blue-100"
                  onClick={(e) => {
                    if (!tripValue) {
                      e.preventDefault();
                      message.warning("Vui lòng chọn một trip ở dưới trước khi import");
                    }
                  }}
                >
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
        <Form.Item
          label="Thuộc Trip"
          name="trip"
          rules={[{ required: true, message: "Chọn trip" }]}
        >
          <Select
            placeholder="Chọn trip"
            options={(Array.isArray(trips) ? trips : []).map((t: Trip) => ({
              value: t.id,
              label: t.name,
            }))}
          />
        </Form.Item>
        <Form.Item
          label="Tên round"
          name="name"
          rules={[{ required: true, message: "Nhập tên round" }]}
        >
          <Input placeholder="Ví dụ: Tập huấn tại Cam Ranh" />
        </Form.Item>
        <Form.Item
          label="Địa điểm"
          name="location"
          rules={[{ required: true, message: "Nhập địa điểm" }]}
        >
          <Input placeholder="Địa điểm" />
        </Form.Item>
        <Form.Item
          label="Thứ tự"
          name="sequence"
          rules={[{ required: true, message: "Nhập thứ tự" }]}
        >
          <Input type="number" min={1} />
        </Form.Item>
        <Form.Item label="Xe cho round" name="bus_ids">
          <Select
            mode="multiple"
            allowClear
            placeholder="Chọn xe cho round"
            options={busOptions}
          />
        </Form.Item>
        <Form.Item
          label="Thời gian dự kiến"
          name="estimate_time"
          rules={[{ required: true, message: "Chọn thời gian dự kiến" }]}
        >
          <DatePicker showTime className="w-full" format="YYYY-MM-DD HH:mm" />
        </Form.Item>
        <Form.Item label="Thời gian thực tế" name="actual_time">
          <DatePicker showTime className="w-full" format="YYYY-MM-DD HH:mm" />
        </Form.Item>
        {tripValue ? (
          <div
            className="text-sm font-semibold text-emerald-600 cursor-pointer"
            onClick={() => setShowPassengersModal(true)}
          >
            Xem danh sách hành khách của trip
          </div>
        ) : null}
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
      </Form>
      <Modal
        open={showPassengersModal}
        onCancel={() => setShowPassengersModal(false)}
        footer={null}
        title={`Hành khách của ${tripLabel}`}
      >
        {passengersForTrip.length === 0 ? (
          <div>Chưa có hành khách nào.</div>
        ) : (
          <div className="max-h-72 overflow-auto space-y-2">
            {passengersForTrip.map((p) => (
              <div key={p.id} className="flex justify-between text-sm">
                <span className="font-medium">{p.name}</span>
                <span className="text-slate-500">{p.phone || "—"}</span>
              </div>
            ))}
          </div>
        )}
      </Modal>
    </Modal>
  );
}
