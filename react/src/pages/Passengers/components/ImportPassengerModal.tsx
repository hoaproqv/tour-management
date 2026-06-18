import React, { useState } from "react";

import { DownloadOutlined, InboxOutlined } from "@ant-design/icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Alert,
  Button,
  DatePicker,
  Form,
  Input,
  Modal,
  Radio,
  Select,
  Space,
  Steps,
  Table,
  Tag,
  Typography,
  Upload,
  message,
} from "antd";
import * as XLSX from "xlsx";

import {
  getTrips,
  importPassengers,
  downloadPassengerTemplate,
  checkImportPassengers,
  type ImportPassengerResult,
  type Trip,
} from "../../../api/trips";

const { Dragger } = Upload;
const { Text } = Typography;

interface Props {
  open: boolean;
  onCancel: () => void;
  onImported: (_result: ImportPassengerResult) => void;
}

interface PreviewSheet {
  name: string;
  rowCount: number;
}

export default function ImportPassengerModal({
  open,
  onCancel,
  onImported,
}: Props) {
  const [current, setCurrent] = useState(0);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<PreviewSheet[]>([]);
  const [tripMode, setTripMode] = useState<"existing" | "new">("existing");
  const [selectedTripId, setSelectedTripId] = useState<string | null>(null);
  const [newTripForm] = Form.useForm();
  const queryClient = useQueryClient();

  const [validPassengers, setValidPassengers] = useState<any[]>([]);
  const [conflicts, setConflicts] = useState<any[]>([]);
  const [conflictResolutions, setConflictResolutions] = useState<Record<number, "keep" | "update">>({});

  const { data: tripsResponse } = useQuery({
    queryKey: ["trips"],
    queryFn: () => getTrips({ page: 1, limit: 1000 }),
    enabled: open,
  });
  const trips = React.useMemo(() => {
    const all = Array.isArray(tripsResponse?.data) ? tripsResponse.data : [];
    return all.filter((t: Trip) => t.status === "planned" || t.status === "doing");
  }, [tripsResponse]);

  const checkMutation = useMutation({
    mutationFn: (f: File) => {
      const fd = new FormData();
      fd.append("file", f);
      return checkImportPassengers(fd);
    },
    onSuccess: (res: any) => {
      setValidPassengers(res.valid_passengers || []);
      setConflicts(res.conflicts || []);
      const defaultResolutions: Record<number, "keep" | "update"> = {};
      (res.conflicts || []).forEach((_: any, i: number) => {
        defaultResolutions[i] = "keep";
      });
      setConflictResolutions(defaultResolutions);
      setCurrent(2);
    },
    onError: (err: any) => {
      message.error(err?.message || "Lỗi khi kiểm tra file");
    },
  });

  const importMutation = useMutation({
    mutationFn: (formData: FormData) => importPassengers(formData),
    onSuccess: async (result) => {
      message.success(
        `Import thành công ${result.imported_buses?.length || 0} xe, trip: ${result.trip_name || ""}`,
      );
      await queryClient.invalidateQueries({ queryKey: ["passengers"] });
      await queryClient.invalidateQueries({ queryKey: ["trips"] });
      onImported(result);
      handleClose();
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : "Import thất bại";
      message.error(msg);
    },
  });

  const handleClose = () => {
    setCurrent(0);
    setFile(null);
    setPreview([]);
    setTripMode("existing");
    setSelectedTripId(null);
    newTripForm.resetFields();
    setValidPassengers([]);
    setConflicts([]);
    setConflictResolutions({});
    onCancel();
  };

  const parsePreview = async (f: File): Promise<PreviewSheet[]> => {
    try {
      const buf = await f.arrayBuffer();
      const wb = XLSX.read(buf, { type: "array" });
      const sheets = wb.SheetNames.filter((name: string) => name !== "Quản lý xe");
      
      // Validate format
      for (const name of sheets) {
        const ws = wb.Sheets[name];
        const rows = XLSX.utils.sheet_to_json(ws, { header: 1 }) as unknown[][];
        if (rows.length > 0) {
          const headerStr = (rows[0] as any[]).map(h => String(h || "").toLowerCase()).join(" ");
          if (!headerStr.includes("họ và tên") && !headerStr.includes("số điện thoại")) {
            throw new Error("Sai định dạng file Excel. Vui lòng tải và sử dụng đúng file mẫu Hành khách.");
          }
        }
      }

      return sheets.map((name: string) => {
        const ws = wb.Sheets[name];
        const rows = XLSX.utils.sheet_to_json(ws, { header: 1 }) as unknown[][];
        const dataRows = rows.slice(1).filter(
          (r) =>
            Array.isArray(r) &&
            r.length > 1 &&
            r[1] !== null &&
            r[1] !== undefined &&
            String(r[1]).trim() !== "",
        );
        return { name, rowCount: dataRows.length };
      });
    } catch (e: any) {
      console.error("Lỗi khi đọc file Preview:", e);
      throw e;
    }
  };

  const handleFileSelect = async (f: File) => {
    try {
      const sheets = await parsePreview(f);
      setFile(f);
      setPreview(sheets);
    } catch (e: any) {
      message.error(e.message || "Không thể đọc file Excel");
      setFile(null);
      setPreview([]);
    }
  };

  const handleNext = async () => {
    if (current === 0) {
      if (!file) {
        message.warning("Vui lòng chọn file .xlsx");
        return;
      }
      setCurrent(1);
    } else if (current === 1) {
      if (tripMode === "existing" && !selectedTripId) {
        message.warning("Vui lòng chọn trip");
        return;
      }
      if (tripMode === "new") {
        try {
          await newTripForm.validateFields();
        } catch {
          return;
        }
      }
      // Check for conflicts
      checkMutation.mutate(file!);
    } else if (current === 2) {
      setCurrent(3);
    }
  };

  const handleImport = async () => {
    if (!file) return;
    const fd = new FormData();
    fd.append("file", file);
    if (tripMode === "existing" && selectedTripId) {
      fd.append("trip_id", selectedTripId);
    } else {
      const vals = newTripForm.getFieldsValue();
      fd.append("trip_name", vals.name);
      fd.append("trip_start_date", vals.dates[0].format("YYYY-MM-DD"));
      fd.append("trip_end_date", vals.dates[1].format("YYYY-MM-DD"));
    }
    
    // Map conflict resolutions: phone -> update | keep
    const resolutionsMap: Record<string, string> = {};
    conflicts.forEach((c, idx) => {
        resolutionsMap[c.existing.phone] = conflictResolutions[idx];
    });
    fd.append("conflict_resolutions", JSON.stringify(resolutionsMap));

    importMutation.mutate(fd);
  };

  const handleDownloadTemplate = async () => {
    try {
      const blob = await downloadPassengerTemplate();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "passenger_import_template.xlsx";
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Lỗi tải template", err);
      message.error("Tải template thất bại");
    }
  };

  const stepItems = [
    { title: "Tải file" },
    { title: "Chọn Trip" },
    { title: "Kiểm tra" },
    { title: "Xác nhận" },
  ];
  
  const conflictColumns = [
    {
      title: "Thông tin File Excel",
      key: "imported",
      render: (_: any, record: any) => (
        <div>
          <p><b>Tên:</b> {record.imported.name}</p>
          <p><b>SĐT:</b> {record.imported.phone}</p>
          <p><b>Ghi chú:</b> {record.imported.note}</p>
          <p><b>Thuộc xe:</b> {record.imported.sheet_name}</p>
        </div>
      )
    },
    {
      title: "Đã có trong hệ thống",
      key: "existing",
      render: (_: any, record: any) => (
        <div>
          <p><b>Tên:</b> <Text type="danger">{record.existing.name}</Text></p>
          <p><b>SĐT:</b> {record.existing.phone}</p>
        </div>
      )
    },
    {
      title: "Quyết định",
      key: "resolution",
      render: (_: any, __: any, index: number) => (
        <Radio.Group 
          value={conflictResolutions[index]} 
          onChange={(e) => setConflictResolutions(prev => ({...prev, [index]: e.target.value}))}
        >
          <Space direction="vertical">
            <Radio value="keep">Giữ tên hiện tại</Radio>
            <Radio value="update">Lấy tên từ file Excel</Radio>
          </Space>
        </Radio.Group>
      )
    }
  ];

  return (
    <Modal
      open={open}
      title="Import danh sách hành khách (.xlsx)"
      onCancel={handleClose}
      width={740}
      footer={null}
      destroyOnClose
    >
      <Steps
        current={current}
        items={stepItems}
        className="mb-6"
        size="small"
      />

      {/* Step 0: Upload */}
      {current === 0 && (
        <div>
          <Alert
            type="info"
            showIcon
            className="mb-4"
            message="Định dạng file"
            description={
              <div className="space-y-1">
                <p>
                  Mỗi <strong>sheet</strong> là một xe. Tên Bảng (Sheet) chứa danh sách hành khách chính là Mã xe.
                </p>
                <p>
                  Mỗi hàng là một hành khách với các cột: <Tag>STT</Tag>
                  <Tag>Họ và tên</Tag>
                  <Tag>Số điện thoại</Tag>
                  <Tag>Thông tin thêm</Tag>
                  <Tag>Ghi chú</Tag>
                </p>
              </div>
            }
          />
          <div className="flex justify-end mb-4">
            <Button
              type="link"
              icon={<DownloadOutlined />}
              onClick={handleDownloadTemplate}
            >
              Tải template Excel mẫu
            </Button>
          </div>
          <Dragger
            accept=".xlsx,.xls"
            beforeUpload={(f) => {
              handleFileSelect(f);
              return false;
            }}
            maxCount={1}
            onRemove={() => {
              setFile(null);
              setPreview([]);
            }}
          >
            <p className="ant-upload-drag-icon">
              <InboxOutlined />
            </p>
            <p className="ant-upload-text">
              Kéo thả hoặc nhấp để chọn file .xlsx
            </p>
            <p className="ant-upload-hint">Chỉ hỗ trợ .xlsx / .xls</p>
          </Dragger>

          {preview.length > 0 && (
            <div className="mt-4">
              <Text type="secondary" className="text-sm">
                Xem trước ({preview.length} sheet):
              </Text>
              <Table scroll={{ x: "max-content" }}
                className="mt-2"
                size="small"
                pagination={false}
                dataSource={preview.map((s, i) => ({ key: i, ...s }))}
                columns={[
                  { title: "Sheet (Xe)", dataIndex: "name" },
                  {
                    title: "Số hành khách",
                    dataIndex: "rowCount",
                    align: "right" as const,
                  },
                ]}
              />
            </div>
          )}

          <div className="flex justify-end mt-4">
            <Button type="primary" onClick={handleNext} disabled={!file}>
              Tiếp theo
            </Button>
          </div>
        </div>
      )}

      {/* Step 1: Choose trip */}
      {current === 1 && (
        <div>
          <Radio.Group
            value={tripMode}
            onChange={(e) => setTripMode(e.target.value as "existing" | "new")}
            className="mb-4"
          >
            <Radio.Button value="existing">Chọn trip có sẵn</Radio.Button>
            <Radio.Button value="new">Tạo trip mới</Radio.Button>
          </Radio.Group>

          {tripMode === "existing" && (
            <Select
              showSearch
              optionFilterProp="label"
              placeholder="Chọn chuyến đi"
              className="w-full"
              notFoundContent="Không có chuyến đi"
              value={selectedTripId}
              onChange={(v) => setSelectedTripId(v)}
              options={trips.map((t: Trip) => {
                return {
                  value: t.id,
                  label: `${t.name} [${t.status === "done" ? "Đã hoàn thành" : t.status === "doing" ? "Đang đi" : "Chưa xuất phát"}]`,
                };
              })}
            />
          )}

          {tripMode === "new" && (
            <Form form={newTripForm} layout="vertical">
              <Form.Item
                name="name"
                label="Tên trip"
                rules={[{ required: true, message: "Nhập tên trip" }]}
              >
                <Input placeholder="VD: Chuyến đi Đà Lạt 05/2026" />
              </Form.Item>
              <Form.Item
                name="dates"
                label="Ngày bắt đầu - kết thúc"
                rules={[{ required: true, message: "Chọn ngày" }]}
              >
                <DatePicker.RangePicker
                  className="w-full"
                  format="DD/MM/YYYY"
                />
              </Form.Item>
            </Form>
          )}

          <Space className="flex justify-between mt-4">
            <Button onClick={() => setCurrent(0)}>Quay lại</Button>
            <Button type="primary" onClick={handleNext} loading={checkMutation.isPending}>
              Tiếp theo
            </Button>
          </Space>
        </div>
      )}

      {/* Step 2: Resolve conflicts */}
      {current === 2 && (
        <div>
          <Alert
            type={conflicts.length > 0 ? "warning" : "success"}
            showIcon
            className="mb-4"
            message={`Kiểm tra dữ liệu hoàn tất: ${validPassengers.length} hợp lệ, ${conflicts.length} trùng lặp.`}
            description={
              conflicts.length > 0
                ? "Các hành khách dưới đây có Số điện thoại đã tồn tại nhưng Tên khác nhau. Vui lòng chọn Tên muốn sử dụng."
                : "Tất cả dữ liệu hợp lệ và sẵn sàng thêm mới."
            }
          />

          {conflicts.length > 0 && (
             <Table scroll={{ x: "max-content" }}
               size="small"
               dataSource={conflicts}
               columns={conflictColumns}
               rowKey={(_, index) => String(index)}
               pagination={{ pageSize: 5 }}
             />
          )}

          <Space className="flex justify-between mt-4">
            <Button onClick={() => setCurrent(1)}>Quay lại</Button>
            <Button type="primary" onClick={handleNext}>
              Tiếp theo
            </Button>
          </Space>
        </div>
      )}

      {/* Step 3: Confirm */}
      {current === 3 && (
        <div>
          <Alert
            type="warning"
            showIcon
            className="mb-4"
            message="Lưu ý sau import"
            description="Sau khi import, các xe sẽ ở trạng thái 'chờ gán'. Bạn cần vào mục Gán xe để chỉ định xe thực tế (biển số) cho từng xe từ file Excel."
          />

          <div className="mb-4">
            <Text strong>File: </Text>
            <Text>{file?.name}</Text>
            <br />
            <Text strong>Số xe (sheets): </Text>
            <Text>{preview.length}</Text>
            <br />
            <Text strong>Trip: </Text>
            <Text>
              {tripMode === "existing"
                ? trips.find((t: Trip) => t.id === selectedTripId)?.name ||
                  selectedTripId
                : newTripForm.getFieldValue("name")}
            </Text>
          </div>

          <Table scroll={{ x: "max-content" }}
            size="small"
            pagination={false}
            dataSource={preview.map((s, i) => ({ key: i, ...s }))}
            columns={[
              { title: "Sheet (Xe)", dataIndex: "name" },
              {
                title: "Hành khách",
                dataIndex: "rowCount",
                align: "right" as const,
              },
            ]}
          />

          <Space className="flex justify-between mt-4">
            <Button onClick={() => setCurrent(2)}>Quay lại</Button>
            <Button
              type="primary"
              loading={importMutation.isPending}
              onClick={handleImport}
            >
              Import ngay
            </Button>
          </Space>
        </div>
      )}
    </Modal>
  );
}
