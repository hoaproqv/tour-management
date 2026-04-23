import React from "react";

import {
  DatePicker,
  Form,
  Input,
  Modal,
  Select,
  Space,
  Button,
  Divider,
} from "antd";
import dayjs from "dayjs";

import type { TenantItem } from "../../../api/tenants";
import type { BusItem, Trip } from "../../../api/trips";
import type { IUser } from "../../../utils/types";
import type { FormInstance } from "antd";

export interface TripFormValues {
  name: string;
  tenant_id: string | number;
  description?: string;
  status?: Trip["status"];
  start_date: dayjs.Dayjs;
  end_date: dayjs.Dayjs;
  bus_assignments?: Array<{
    bus: string | number;
    manager: string | number;
    driver: string | number;
  }>;
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
  drivers: IUser[];
  fleetLeads: IUser[];
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
  drivers,
  fleetLeads,
}: TripFormModalProps) {
  const isEditing = Boolean(editingTrip);

  const getSelectedIds = (
    fieldName: "manager" | "driver",
    currentIndex: number,
  ) => {
    const list = form.getFieldValue("bus_assignments") || [];
    return new Set(
      list
        .map((item: any, idx: number) =>
          idx === currentIndex ? null : item?.[fieldName],
        )
        .filter(Boolean),
    );
  };

  return (
    <Modal
      open={open}
      onCancel={onCancel}
      onOk={onSubmit}
      confirmLoading={confirmLoading}
      title={editingTrip ? "Sửa tour" : "Tạo tour mới"}
      okText={editingTrip ? "Cập nhật" : "Tạo"}
      cancelText="Hủy"
      destroyOnClose
      width="min(720px, 95vw)"
    >
      <Form layout="vertical" form={form} initialValues={{ status: "planned" }}>
        <Form.Item
          label="Tên tour"
          name="name"
          rules={[{ required: true, message: "Nhập tên tour" }]}
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
        <Divider
          orientation="left"
          plain
          style={{ fontSize: 13, whiteSpace: "normal" }}
        >
          Gán xe, trưởng xe, lái xe —{" "}
          <span className="text-slate-400 font-normal">tùy chọn</span>
        </Divider>
        <Form.List name="bus_assignments">
          {(fields, { add, remove }) => (
            <div className="space-y-3">
              {fields.map((field) => {
                const currentAssignments =
                  form.getFieldValue("bus_assignments") || [];
                const occupied = new Set(
                  currentAssignments
                    .map((item: any, idx: number) =>
                      idx === field.name ? null : item?.bus,
                    )
                    .filter(Boolean),
                );

                return (
                  <div
                    key={field.key}
                    className="relative p-3 pt-4 border border-slate-200 rounded-lg bg-slate-50"
                  >
                    {/* Delete button – top-right corner */}
                    <Button
                      type="text"
                      danger
                      size="small"
                      onClick={() => remove(field.name)}
                      className="absolute top-1 right-1 text-red-400 hover:text-red-600"
                    >
                      ✕
                    </Button>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <Form.Item
                        {...field}
                        label="Xe"
                        name={[field.name, "bus"]}
                        rules={[]}
                        style={{ marginBottom: 0 }}
                      >
                        <Select
                          placeholder="Chọn xe"
                          loading={loadingBuses}
                          size="small"
                          options={buses.map((bus) => {
                            const inActiveTrip =
                              bus.is_available === false &&
                              !occupied.has(bus.id);
                            return {
                              value: bus.id,
                              label:
                                bus.registration_number ||
                                bus.bus_code ||
                                `Xe ${bus.id}`,
                              disabled: occupied.has(bus.id) || inActiveTrip,
                              title: inActiveTrip
                                ? `Đang trong tour: ${bus.active_trip?.name}`
                                : undefined,
                            };
                          })}
                        />
                      </Form.Item>

                      <Form.Item
                        {...field}
                        label="Trưởng xe"
                        name={[field.name, "manager"]}
                        rules={[]}
                        style={{ marginBottom: 0 }}
                      >
                        <Select
                          showSearch
                          placeholder="Trưởng xe"
                          optionFilterProp="label"
                          size="small"
                          options={fleetLeads
                            .filter(
                              (u) =>
                                u.is_available !== false ||
                                getSelectedIds("manager", field.name).has(u.id),
                            )
                            .map((user) => ({
                              value: user.id,
                              label: `${user.name} (${user.username})`,
                              disabled: getSelectedIds(
                                "manager",
                                field.name,
                              ).has(user.id),
                            }))}
                        />
                      </Form.Item>

                      <Form.Item
                        {...field}
                        label="Lái xe"
                        name={[field.name, "driver"]}
                        rules={[]}
                        style={{ marginBottom: 0 }}
                      >
                        <Select
                          showSearch
                          placeholder="Lái xe"
                          optionFilterProp="label"
                          size="small"
                          options={drivers
                            .filter(
                              (u) =>
                                u.is_available !== false ||
                                getSelectedIds("driver", field.name).has(u.id),
                            )
                            .map((user) => ({
                              value: user.id,
                              label: `${user.name} (${user.username})`,
                              disabled: getSelectedIds(
                                "driver",
                                field.name,
                              ).has(user.id),
                            }))}
                        />
                      </Form.Item>
                    </div>
                  </div>
                );
              })}

              <Button type="dashed" block onClick={() => add()}>
                + Thêm xe
              </Button>
            </div>
          )}
        </Form.List>
        <Form.Item
          label="Trạng thái"
          name="status"
          rules={isEditing ? [{ required: true }] : []}
          hidden={!isEditing}
        >
          <Select
            options={Object.entries(statusMeta)
              .filter(([value]) => value === "planned" || value === "doing")
              .map(([value, meta]) => ({
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
