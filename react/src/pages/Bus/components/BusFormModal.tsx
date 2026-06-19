import React, { useMemo, useState, useEffect } from "react";

import { useQuery } from "@tanstack/react-query";
import {
  Form,
  Input,
  Modal,
  Select,
  Row,
  Col,
  InputNumber,
  Tabs,
} from "antd";

import {
  getTripBuses,
  type TripBus,
  type Trip,
} from "../../../api/trips";

import type { IUser } from "../../../utils/types";
import type { FormInstance } from "antd";

import ImportBusTab from "./ImportBusModal";

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
}: BusFormModalProps) {
  const [activeTab, setActiveTab] = useState("manual");

  useEffect(() => {
    if (open) {
      setActiveTab("manual");
    }
  }, [open]);

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

  const manualForm = (
    <Form
      layout="vertical"
      form={form}
      initialValues={{ trip: activeTripId || undefined }}
    >
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
  );

  return (
    <Modal
      open={open}
      onCancel={onCancel}
      onOk={activeTab === "manual" ? onSubmit : undefined}
      confirmLoading={confirmLoading}
      title={editingBus ? "Sửa xe trong chuyến đi" : "Thêm xe vào chuyến đi"}
      okText={editingBus ? "Cập nhật" : "Thêm"}
      cancelText="Hủy"
      width={activeTab === "import" && !editingBus ? 740 : 700}
      footer={activeTab === "import" && !editingBus ? null : undefined}
      destroyOnClose
    >
      {editingBus ? (
        <div className="pt-4">{manualForm}</div>
      ) : (
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          items={[
            {
              key: "manual",
              label: "Thêm thủ công",
              children: <div className="pt-2">{manualForm}</div>,
            },
            {
              key: "import",
              label: "Import từ Excel",
              children: (
                <ImportBusTab
                  activeTripId={activeTripId}
                  onCancel={onCancel}
                  onSuccess={onCancel}
                />
              ),
            },
          ]}
        />
      )}
    </Modal>
  );
}
