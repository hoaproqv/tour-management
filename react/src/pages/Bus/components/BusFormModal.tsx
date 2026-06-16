import React, { useMemo } from "react";

import { UploadOutlined, DownloadOutlined } from "@ant-design/icons";
import { useQuery } from "@tanstack/react-query";
import {
  Form,
  Input,
  Modal,
  Typography,
  Select,
  Button,
  Row,
  Col,
  InputNumber,
  message,
} from "antd";

import {
  getTripBuses,
  downloadTripBusTemplate,
  type TripBus,
  type Trip,
} from "../../../api/trips";

import type { IUser } from "../../../utils/types";
import type { FormInstance } from "antd";

export interface BusFormValues {
  trip: string;
  registration_number: string;
  bus_code: string;
  capacity: number;
  description?: string;
  manager: string;
  driver: string;
}

interface BusFormModalProps {
  open: boolean;
  onCancel: () => void;
  onSubmit: () => void;
  confirmLoading: boolean;
  form: FormInstance<BusFormValues>;
  editingBus?: TripBus | null;
  drivers: IUser[];
  fleetLeads: IUser[];
  activeTripId: string | null;
  trips: Trip[];
  onOpenImport?: () => void;
}

export default function BusFormModal({
  open,
  onCancel,
  onSubmit,
  confirmLoading,
  form,
  editingBus,
  drivers,
  fleetLeads,
  activeTripId,
  trips,
  onOpenImport,
}: BusFormModalProps) {
  const selectedTripId = Form.useWatch("trip", form);

  const { data: tripBusesResponse } = useQuery({
    queryKey: ["trip-buses-validation", selectedTripId],
    queryFn: () => getTripBuses({ trip: selectedTripId, page: 1, limit: 1000 }),
    enabled: open && Boolean(selectedTripId),
  });

  const usedManagers = useMemo(() => {
    const buses = Array.isArray(tripBusesResponse?.data)
      ? tripBusesResponse.data
      : [];
    return new Set(
      buses
        .filter((b) => !editingBus || b.id !== editingBus.id)
        .map((b) => String(b.manager)),
    );
  }, [tripBusesResponse, editingBus]);

  const usedDrivers = useMemo(() => {
    const buses = Array.isArray(tripBusesResponse?.data)
      ? tripBusesResponse.data
      : [];
    return new Set(
      buses
        .filter((b) => !editingBus || b.id !== editingBus.id)
        .map((b) => String(b.driver)),
    );
  }, [tripBusesResponse, editingBus]);

  const driverOptions = useMemo(() => {
    return drivers.map((u) => ({
      value: String(u.id),
      label: `${u.name} (${u.phone || "Chưa có SĐT"})`,
      disabled: usedDrivers.has(String(u.id)),
    }));
  }, [drivers, usedDrivers]);

  const managerOptions = useMemo(() => {
    return fleetLeads.map((u) => ({
      value: String(u.id),
      label: `${u.name} (${u.phone || "Chưa có SĐT"})`,
      disabled: usedManagers.has(String(u.id)),
    }));
  }, [fleetLeads, usedManagers]);

  const handleDownloadTemplate = async () => {
    try {
      const blob = await downloadTripBusTemplate();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "xe_khach_import_template.xlsx";
      a.click();
      window.URL.revokeObjectURL(url);
    } catch {
      message.error("Lỗi khi tải template");
    }
  };

  return (
    <Modal
      open={open}
      onCancel={onCancel}
      onOk={onSubmit}
      confirmLoading={confirmLoading}
      title={editingBus ? "Sửa xe trong chuyến đi" : "Thêm xe vào chuyến đi"}
      okText={editingBus ? "Cập nhật" : "Thêm"}
      cancelText="Hủy"
      width={700}
      destroyOnClose
    >
      <Form
        layout="vertical"
        form={form}
        initialValues={{ trip: activeTripId || undefined }}
      >
        {!editingBus && onOpenImport && (
          <div className="mb-5 p-4 bg-blue-50/50 rounded-xl border border-blue-100 flex flex-col items-center justify-center gap-3">
            <Typography.Text className="text-slate-600 text-sm">
              Bạn có thể thêm nhiều xe cùng lúc bằng cách import file Excel.
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
              <span className="text-slate-400 text-xs px-1">hoặc</span>
              <Button
                icon={<DownloadOutlined />}
                size="small"
                type="text"
                className="text-slate-500 hover:text-slate-700 hover:bg-slate-100"
                onClick={handleDownloadTemplate}
              >
                Tải template
              </Button>
            </div>
          </div>
        )}

        <Row gutter={16}>
          <Col xs={24} md={12}>
            <Form.Item
              label="Chuyến đi"
              name="trip"
              rules={[{ required: true, message: "Vui lòng chọn chuyến đi" }]}
            >
              <Select
                showSearch
                optionFilterProp="label"
                placeholder="Chọn chuyến đi"
                notFoundContent="Không có chuyến đi"
                options={trips.map((t) => ({
                  value: String(t.id),
                  label: t.name,
                }))}
                disabled={!!editingBus || !!activeTripId}
              />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item
              label="Biển số"
              name="registration_number"
              rules={[{ required: true, message: "Nhập biển số" }]}
            >
              <Input placeholder="51B-12345" />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col xs={24} md={12}>
            <Form.Item
              label="Mã xe"
              name="bus_code"
              rules={[{ required: true, message: "Nhập mã xe" }]}
            >
              <Input placeholder="Xe 1" />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item
              label="Sức chứa"
              name="capacity"
              rules={[
                { required: true, message: "Nhập sức chứa" },
                {
                  type: "number",
                  min: 1,
                  max: 100,
                  message: "Sức chứa từ 1 đến 100",
                },
              ]}
            >
              <InputNumber
                placeholder="45"
                min={1}
                max={100}
                precision={0}
                style={{ width: "100%" }}
              />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col xs={24} md={12}>
            <Form.Item
              label="Trưởng xe"
              name="manager"
              rules={[{ required: true, message: "Vui lòng chọn trưởng xe" }]}
            >
              <Select
                showSearch
                optionFilterProp="label"
                placeholder="Chọn trưởng xe"
                options={managerOptions}
              />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item
              label="Lái xe"
              name="driver"
              rules={[{ required: true, message: "Vui lòng chọn lái xe" }]}
            >
              <Select
                showSearch
                optionFilterProp="label"
                placeholder="Chọn lái xe"
                options={driverOptions}
              />
            </Form.Item>
          </Col>
        </Row>

        <Form.Item label="Ghi chú" name="description">
          <Input.TextArea rows={2} placeholder="Thông tin thêm..." />
        </Form.Item>
      </Form>
    </Modal>
  );
}
