import React, { useEffect } from "react";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Modal, Form, Button, Select } from "antd";

import { updateTrip } from "../../../api/trips";

import type { EnrichedTrip } from "./types";
import type { BusItem } from "../../../api/trips";
import type { IUser } from "../../../utils/types";

interface TripBusAssignmentModalProps {
  trip: EnrichedTrip | null;
  open: boolean;
  onClose: () => void;
  buses: BusItem[];
  loadingBuses: boolean;
  drivers: IUser[];
  fleetLeads: IUser[];
}

export default function TripBusAssignmentModal({
  trip,
  open,
  onClose,
  buses,
  loadingBuses,
  drivers,
  fleetLeads,
}: TripBusAssignmentModalProps) {
  const [form] = Form.useForm();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (open && trip) {
      form.setFieldsValue({
        bus_assignments: trip.buses.map((b) => ({
          bus: b.bus,
          manager: b.manager,
          driver: b.driver,
        })),
      });
    } else {
      form.resetFields();
    }
  }, [open, trip, form]);

  const updateMutation = useMutation({
    mutationFn: async (values: { bus_assignments: any[] }) => {
      if (!trip) throw new Error("No trip selected");
      // Gửi lại các trường bắt buộc của trip cùng với danh sách gán bus mới
      return updateTrip(trip.id, {
        name: trip.name,
        description: trip.description || "",
        tenant_id: trip.tenant || undefined,
        start_date: trip.start_date,
        end_date: trip.end_date,
        status: trip.status,
        bus_assignments: values.bus_assignments || [],
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["trips"] });
      await queryClient.invalidateQueries({ queryKey: ["trip-buses"] });
      onClose();
    },
  });

  const handleSubmit = () => {
    form.validateFields().then((values) => {
      updateMutation.mutate(values);
    });
  };

  const getSelectedIds = (fieldName: "manager" | "driver", currentIndex: number) => {
    const list = form.getFieldValue("bus_assignments") || [];
    return new Set(
      list
        .map((item: any, idx: number) => (idx === currentIndex ? null : item?.[fieldName]))
        .filter(Boolean)
    );
  };

  return (
    <Modal
      open={open}
      onCancel={onClose}
      onOk={handleSubmit}
      confirmLoading={updateMutation.isPending}
      title={trip ? `Quản lý xe - ${trip.name}` : "Quản lý xe"}
      width={720}
      okText="Lưu thay đổi"
      cancelText="Hủy"
      destroyOnClose
    >
      <Form layout="vertical" form={form}>
        <Form.List name="bus_assignments">
          {(fields, { add, remove }) => (
            <div className="overflow-y-auto pr-2 custom-scrollbar" style={{ maxHeight: 'calc(100vh - 250px)' }}>
              <div className="space-y-3 mt-4">
                {fields.map((field, index) => {
                  const currentAssignments = form.getFieldValue("bus_assignments") || [];
                  const currentBusId = currentAssignments[field.name]?.bus;
                  const currentManagerId = currentAssignments[field.name]?.manager;
                  const currentDriverId = currentAssignments[field.name]?.driver;
                  const occupied = new Set(
                    currentAssignments
                      .map((item: any, idx: number) => (idx === field.name ? null : item?.bus))
                      .filter(Boolean)
                  );

                  return (
                    <div key={field.key} className="p-3 border border-slate-200 rounded-lg bg-slate-50">
                      <div className="grid grid-cols-[auto_1fr_1fr_1fr_auto] items-end gap-2">
                        <div className="pb-1">
                          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">Xe {index + 1}</span>
                        </div>
                        <Form.Item
                          {...field}
                          label="Xe"
                          name={[field.name, "bus"]}
                          rules={[{ required: true, message: "Chọn xe" }]}
                          style={{ marginBottom: 0 }}
                        >
                          <Select
                            placeholder="Chọn xe"
                            loading={loadingBuses}
                            size="small"
                            options={buses.map((bus, busIndex) => {
                              const isCurrent = bus.id === currentBusId;
                              const inActiveTrip = !isCurrent && bus.is_available === false && !occupied.has(bus.id);
                              return {
                                value: bus.id,
                                label: bus.registration_number || bus.bus_code || `Xe ${busIndex + 1}`,
                                disabled: occupied.has(bus.id) || inActiveTrip,
                                title: inActiveTrip ? `Đang trong chuyến đi: ${bus.active_trip?.name}` : undefined,
                              };
                            })}
                          />
                        </Form.Item>

                        <Form.Item
                          {...field}
                          label="Trưởng xe"
                          name={[field.name, "manager"]}
                          rules={[{ required: true, message: "Chọn trưởng xe" }]}
                          style={{ marginBottom: 0 }}
                        >
                          <Select
                            showSearch
                            placeholder="Trưởng xe"
                            optionFilterProp="label"
                            size="small"
                            options={fleetLeads
                              .filter((u) => u.is_available !== false || u.id === currentManagerId || getSelectedIds("manager", field.name).has(u.id))
                              .map((user) => ({
                                value: user.id,
                                label: user.name,
                                disabled: getSelectedIds("manager", field.name).has(user.id),
                              }))}
                          />
                        </Form.Item>

                        <Form.Item
                          {...field}
                          label="Lái xe"
                          name={[field.name, "driver"]}
                          rules={[{ required: true, message: "Chọn lái xe" }]}
                          style={{ marginBottom: 0 }}
                        >
                          <Select
                            showSearch
                            placeholder="Lái xe"
                            optionFilterProp="label"
                            size="small"
                            options={drivers
                              .filter((u) => u.is_available !== false || u.id === currentDriverId || getSelectedIds("driver", field.name).has(u.id))
                              .map((user) => ({
                                value: user.id,
                                label: user.name,
                                disabled: getSelectedIds("driver", field.name).has(user.id),
                              }))}
                          />
                        </Form.Item>

                        <div className="pb-1">
                          <Button
                            type="text"
                            danger
                            size="small"
                            onClick={() => remove(field.name)}
                            className="!text-red-400 hover:!text-red-600"
                          >
                            ✕
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}

                <Button type="dashed" block onClick={() => add()} className="mt-2 mb-2">
                  + Thêm xe
                </Button>
              </div>
            </div>
          )}
        </Form.List>
      </Form>
    </Modal>
  );
}
