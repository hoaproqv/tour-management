import React, { useState } from "react";

import { InboxOutlined } from "@ant-design/icons";
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

  const { data: tripsResponse } = useQuery({
    queryKey: ["trips"],
    queryFn: () => getTrips({ page: 1, limit: 1000 }),
    enabled: open,
  });
  const trips = React.useMemo(() => {
    const all = Array.isArray(tripsResponse?.data) ? tripsResponse.data : [];
    // Only show trips not yet finished (planned or doing = chưa xuất phát / đang đi)
    return all.filter(
      (t: Trip) => t.status === "planned" || t.status === "doing",
    );
  }, [tripsResponse]);

  const importMutation = useMutation({
    mutationFn: (formData: FormData) => importPassengers(formData),
    onSuccess: async (result) => {
      message.success(
        `Import thành công ${result.imported_buses.length} xe, trip: ${result.trip_name}`,
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
    onCancel();
  };

  // Client-side preview by parsing sheet names from xlsx
  const parsePreview = async (f: File): Promise<PreviewSheet[]> => {
    try {
      const buf = await f.arrayBuffer();
      const wb = XLSX.read(buf, { type: "array" });
      return wb.SheetNames.map((name: string) => {
        const ws = wb.Sheets[name];
        const rows = XLSX.utils.sheet_to_json(ws, { header: 1 }) as unknown[][];
        // Count only rows where the name column (index 1) is non-empty
        const dataRows = rows
          .slice(1)
          .filter(
            (r) =>
              Array.isArray(r) &&
              r.length > 1 &&
              r[1] !== null &&
              r[1] !== undefined &&
              String(r[1]).trim() !== "",
          );
        return { name, rowCount: dataRows.length };
      });
    } catch (e) {
      console.error("Lỗi khi đọc file Preview:", e);
      return [];
    }
  };

  const handleFileSelect = async (f: File) => {
    setFile(f);
    const sheets = await parsePreview(f);
    setPreview(sheets);
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
      setCurrent(2);
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
    importMutation.mutate(fd);
  };

  const stepItems = [
    { title: "Tải file" },
    { title: "Chọn Trip" },
    { title: "Xác nhận" },
  ];

  return (
    <Modal
      open={open}
      title="Import danh sách hành khách (.xlsx)"
      onCancel={handleClose}
      width={640}
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
              <span>
                Mỗi <strong>sheet</strong> là một xe. Mỗi hàng là một hành khách
                với các cột: <Tag>STT</Tag>
                <Tag>Họ và tên</Tag>
                <Tag>Số điện thoại</Tag>
                <Tag>Ghi chú</Tag>
              </span>
            }
          />
          <Dragger
            accept=".xlsx,.xls"
            beforeUpload={(f) => {
              handleFileSelect(f);
              return false; // prevent auto-upload
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
              <Table
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
              placeholder="Chọn trip..."
              className="w-full"
              value={selectedTripId}
              onChange={(v) => setSelectedTripId(v)}
              options={trips.map((t: Trip) => ({
                value: t.id,
                label: `${t.name} [${t.status === "planned" ? "Chưa xuất phát" : "Đang đi"}]`,
              }))}
            />
          )}

          {tripMode === "new" && (
            <Form form={newTripForm} layout="vertical">
              <Form.Item
                name="name"
                label="Tên trip"
                rules={[{ required: true, message: "Nhập tên trip" }]}
              >
                <Input placeholder="VD: Tour Đà Lạt 05/2026" />
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
            <Button type="primary" onClick={handleNext}>
              Tiếp theo
            </Button>
          </Space>
        </div>
      )}

      {/* Step 2: Confirm */}
      {current === 2 && (
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

          <Table
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
            <Button onClick={() => setCurrent(1)}>Quay lại</Button>
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
