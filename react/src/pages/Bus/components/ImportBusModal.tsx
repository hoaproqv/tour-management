import React, { useState } from "react";

import { DownloadOutlined, InboxOutlined } from "@ant-design/icons";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import {
  Alert,
  Button,
  Select,
  Space,
  Steps,
  Table,
  Typography,
  Upload,
  message,
} from "antd";
import * as XLSX from "xlsx";

import {
  downloadTripBusTemplate,
  importTripBuses,
  getTrips,
  type Trip,
} from "../../../api/trips";

const { Dragger } = Upload;
const { Text } = Typography;

interface PreviewSheet {
  name: string;
  rowCount: number;
}

interface ImportBusTabProps {
  onCancel: () => void;
  activeTripId: string | null;
  onSuccess?: () => void;
}

export default function ImportBusTab({
  onCancel,
  activeTripId,
  onSuccess,
}: ImportBusTabProps) {
  const [current, setCurrent] = useState(0);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<PreviewSheet[]>([]);
  const [selectedTripId, setSelectedTripId] = useState<string | null>(
    activeTripId
  );
  const queryClient = useQueryClient();

  const { data: tripsResponse } = useQuery({
    queryKey: ["trips"],
    queryFn: () => getTrips({ page: 1, limit: 1000 }),
  });
  const trips = React.useMemo(() => {
    const all = Array.isArray(tripsResponse?.data) ? tripsResponse.data : [];
    return all.filter(
      (t: Trip) => t.status === "planned" || t.status === "doing"
    );
  }, [tripsResponse]);

  const importMutation = useMutation({
    mutationFn: (f: File) => {
      const formData = new FormData();
      formData.append("file", f);
      return importTripBuses(selectedTripId as string, formData);
    },
    onSuccess: async () => {
      message.success("Import danh sách xe khách thành công");
      await queryClient.invalidateQueries({ queryKey: ["trip-buses"] });
      if (onSuccess) onSuccess();
      handleClose();
    },
    onError: (err: any) => {
      message.error(err?.response?.data?.detail || "Lỗi khi import xe khách");
    },
  });

  const handleClose = () => {
    setCurrent(0);
    setFile(null);
    setPreview([]);
    setSelectedTripId(activeTripId);
    onCancel();
  };

  const parsePreview = async (f: File): Promise<PreviewSheet[]> => {
    try {
      const buf = await f.arrayBuffer();
      const wb = XLSX.read(buf, { type: "array" });
      const sheets = wb.SheetNames;

      return sheets.map((name: string) => {
        const ws = wb.Sheets[name];
        const rows = XLSX.utils.sheet_to_json(ws, { header: 1 }) as unknown[][];
        const dataRows = rows.slice(1).filter((r) => Array.isArray(r) && (r as any[]).length > 0);
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
      if (!selectedTripId) {
        message.warning("Vui lòng chọn chuyến đi");
        return;
      }
      setCurrent(2);
    }
  };

  const handleImport = () => {
    if (!selectedTripId) {
      message.warning("Vui lòng chọn chuyến đi trước");
      return;
    }
    if (!file) return;
    importMutation.mutate(file);
  };

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

  const stepItems = [
    { title: "Tải file" },
    { title: "Chọn Trip" },
    { title: "Xác nhận" },
  ];

  return (
    <div className="pt-2">
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
                  Tải file Excel mẫu để xem đúng định dạng. Cột yêu cầu: Biển số, Mã
                  xe, Sức chứa, Mô tả...
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
            beforeUpload={(f: File) => {
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
            <p className="ant-upload-text">Kéo thả hoặc nhấp để chọn file .xlsx</p>
            <p className="ant-upload-hint">Chỉ hỗ trợ .xlsx / .xls</p>
          </Dragger>

          {preview.length > 0 && (
            <div className="mt-4">
              <Text type="secondary" className="text-sm">
                Xem trước ({preview.length} sheet):
              </Text>
              <Table
                scroll={{ x: "max-content" }}
                className="mt-2"
                size="small"
                pagination={false}
                dataSource={preview.map((s: PreviewSheet, i: number) => ({ key: i, ...s }))}
                columns={[
                  { title: "Sheet", dataIndex: "name" },
                  {
                    title: "Số hàng",
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
          <Select
            showSearch
            optionFilterProp="label"
            placeholder="Chọn chuyến đi"
            className="w-full"
            notFoundContent="Không có chuyến đi"
            value={selectedTripId}
            onChange={(v: string) => setSelectedTripId(v)}
            options={trips.map((t: Trip) => {
              return {
                value: String(t.id),
                label: `${t.name} [${
                  t.status === "done"
                    ? "Đã hoàn thành"
                    : t.status === "doing"
                    ? "Đang đi"
                    : "Chưa xuất phát"
                }]`,
              };
            })}
          />

          <Space className="flex justify-between mt-4 w-full">
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
          <div className="mb-4">
            <Text strong>File: </Text>
            <Text>{file?.name}</Text>
            <br />
            <Text strong>Trip: </Text>
            <Text>
              {trips.find((t: Trip) => String(t.id) === selectedTripId)?.name ||
                selectedTripId}
            </Text>
          </div>

          <Space className="flex justify-between mt-4 w-full">
            <Button onClick={() => setCurrent(1)}>Quay lại</Button>
            <Button
              type="primary"
              onClick={handleImport}
              loading={importMutation.isPending}
            >
              Import
            </Button>
          </Space>
        </div>
      )}
    </div>
  );
}
