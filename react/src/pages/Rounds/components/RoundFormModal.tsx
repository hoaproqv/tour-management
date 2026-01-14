import React, { useEffect, useMemo, useState } from "react";

import { DatePicker, Form, Input, Modal, Select } from "antd";
import dayjs from "dayjs";

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
}: RoundFormModalProps) {
  const tripValue = Form.useWatch("trip", form);
  const [showPassengersModal, setShowPassengersModal] = useState(false);

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
