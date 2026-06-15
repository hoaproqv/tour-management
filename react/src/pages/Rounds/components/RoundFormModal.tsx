import React, { useEffect, useState } from "react";

import {
  InboxOutlined,
  ExclamationCircleOutlined,
  DownloadOutlined,
} from "@ant-design/icons";
import { useQueryClient } from "@tanstack/react-query";
import {
  Form,
  Input,
  Modal,
  Select,
  Row,
  Col,
  Tabs,
  Upload,
  Typography,
  message,
  Table,
  Button,
  DatePicker,
} from "antd";
import * as XLSX from "xlsx";

import { downloadRoundTemplate, importRounds } from "../../../api/trips";

import type { RoundItem, Trip } from "../../../api/trips";
import type { FormInstance } from "antd";

const { Dragger } = Upload;
const { Text } = Typography;

export interface RoundFormValues {
  trip: string;
  name: string;
  location: string;
  estimate_time?: any;
}

interface RoundFormModalProps {
  open: boolean;
  onCancel: () => void;
  onSubmit: () => void;
  confirmLoading: boolean;
  form: FormInstance<RoundFormValues>;
  trips: Trip[];
  editingRound?: RoundItem | null;
  tripFilter?: string;
}

interface PreviewRecord {
  key: number;
  stt: string;
  name: string;
  location: string;
  estimateTime: string;
  sequence: string;
}

export default function RoundFormModal({
  open,
  onCancel,
  onSubmit,
  confirmLoading,
  form,
  trips,
  editingRound,
  tripFilter,
}: RoundFormModalProps) {
  const queryClient = useQueryClient();
  const tripValue = Form.useWatch("trip", form);

  const [activeTab, setActiveTab] = useState("manual");
  const [file, setFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [previewData, setPreviewData] = useState<PreviewRecord[]>([]);

  useEffect(() => {
    if (open) {
      setActiveTab("manual");
      setFile(null);
      setPreviewData([]);
    }
  }, [open]);

  // Auto set trip if tripFilter is provided and not "all"
  useEffect(() => {
    if (
      open &&
      tripFilter &&
      tripFilter !== "all" &&
      !editingRound &&
      !form.getFieldValue("trip")
    ) {
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

  const handleUpload = async (action: "" | "overwrite" | "skip" = "") => {
    if (!tripValue) {
      message.warning("Vui lòng chọn chuyến đi ở trên");
      return;
    }
    if (!file) {
      message.warning("Vui lòng chọn file Excel");
      return;
    }

    setImporting(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      if (action) {
        fd.append("action", action);
      }

      const res = await importRounds(tripValue, fd);
      message.success(res.detail || "Import thành công");
      await queryClient.invalidateQueries({ queryKey: ["rounds"] });
      onCancel();
    } catch (err: any) {
      if (err?.response?.status === 409 && err.response.data?.duplicates) {
        Modal.confirm({
          title: "Phát hiện trùng lặp địa điểm",
          content: (
            <div>
              <p>Các địa điểm sau đã tồn tại trong chuyến đi:</p>
              <ul className="text-orange-600 max-h-40 overflow-y-auto pl-4">
                {err.response.data.duplicates.map((d: string) => (
                  <li key={d}>{d}</li>
                ))}
              </ul>
              <p className="mt-2">Bạn muốn xử lý thế nào?</p>
            </div>
          ),
          okText: "Ghi đè dữ liệu mới",
          okType: "danger",
          cancelText: "Giữ lại dữ liệu cũ",
          onOk: () => handleUpload("overwrite"),
          onCancel: () => handleUpload("skip"),
          icon: <ExclamationCircleOutlined className="text-orange-600" />,
        });
      } else {
        message.error(err?.response?.data?.detail || "Import thất bại");
      }
    } finally {
      setImporting(false);
    }
  };

  const handleOk = () => {
    if (!editingRound && activeTab === "import") {
      handleUpload("");
    } else {
      onSubmit();
    }
  };

  const handleFilePreview = (f: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: "binary" });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const json = XLSX.utils.sheet_to_json(worksheet, {
          header: 1,
          raw: false,
        });

        // Skip header row
        const rows = json.slice(1).filter((r: any) => r && r.length >= 4);
        const parsed = rows.map((r: any, idx: number) => ({
          key: idx,
          stt: r[0] || "",
          name: r[1] || "",
          location: r[2] || "",
          estimateTime: r[3] || "",
          sequence: r[4] || "",
        }));
        setPreviewData(parsed);
      } catch {
        message.error("Không thể đọc file Excel");
      }
    };
    reader.readAsBinaryString(f);
  };

  const manualFormContent = (
    <Row gutter={16}>
      <Col span={12}>
        <Form.Item
          label="Tên chặng"
          name="name"
          rules={[
            { required: activeTab === "manual", message: "Nhập tên chặng" },
          ]}
        >
          <Input placeholder="Ví dụ: Tập huấn tại Cam Ranh" />
        </Form.Item>
      </Col>
      <Col span={12}>
        <Form.Item
          label="Địa điểm"
          name="location"
          rules={[
            { required: activeTab === "manual", message: "Nhập địa điểm" },
          ]}
        >
          <Input placeholder="Địa điểm" />
        </Form.Item>
      </Col>
      <Col span={24}>
        <Form.Item label="Thời gian đến dự kiến" name="estimate_time">
          <DatePicker
            showTime
            format="YYYY-MM-DD HH:mm"
            style={{ width: "100%" }}
            placeholder="Chọn thời gian"
          />
        </Form.Item>
      </Col>
    </Row>
  );

  return (
    <Modal
      open={open}
      onCancel={onCancel}
      onOk={handleOk}
      confirmLoading={confirmLoading || importing}
      title={editingRound ? "Sửa chặng" : "Tạo chặng mới"}
      okText={editingRound ? "Cập nhật" : "Tạo"}
      cancelText="Hủy"
      destroyOnClose
      okButtonProps={{
        disabled:
          !editingRound && activeTab === "import" && (!file || !tripValue),
      }}
      width={700}
    >
      <Form layout="vertical" form={form}>
        <Col span={24}>
          <Form.Item
            label="Thuộc chuyến"
            name="trip"
            rules={[{ required: true, message: "Chọn trip" }]}
          >
            <Select
              placeholder="Chọn chuyến"
              options={(Array.isArray(trips) ? trips : []).map((t: Trip) => ({
                value: String(t.id),
                label: t.name,
              }))}
            />
          </Form.Item>
        </Col>

        {!editingRound ? (
          <Tabs
            activeKey={activeTab}
            onChange={setActiveTab}
            items={[
              {
                key: "manual",
                label: "Tạo thủ công",
                children: manualFormContent,
              },
              {
                key: "import",
                label: "Import từ Excel",
                children: (
                  <div className="mt-2 mb-4">
                    <div className="flex items-center justify-between mb-2">
                      <Text strong>File Excel</Text>
                      <a
                        onClick={handleDownloadTemplate}
                        className="text-blue-600 hover:text-blue-800 text-sm flex items-center gap-1"
                      >
                        <DownloadOutlined /> Tải template mẫu
                      </a>
                    </div>
                    {!file ? (
                      <Dragger
                        accept=".xlsx, .xls, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
                        beforeUpload={(f) => {
                          setFile(f);
                          handleFilePreview(f);
                          return false;
                        }}
                        fileList={[]}
                      >
                        <p className="ant-upload-drag-icon">
                          <InboxOutlined />
                        </p>
                        <p className="ant-upload-text">
                          Nhấn hoặc kéo thả file Excel vào đây
                        </p>
                        <p className="ant-upload-hint">
                          Chỉ hỗ trợ file định dạng .xlsx, .xls
                        </p>
                      </Dragger>
                    ) : (
                      <div className="border border-blue-100 rounded-lg p-4 bg-slate-50">
                        <div className="flex justify-between items-center mb-3">
                          <Text strong className="text-blue-600">
                            Đã chọn: {file.name}
                          </Text>
                          <Button
                            size="small"
                            onClick={() => {
                              setFile(null);
                              setPreviewData([]);
                            }}
                          >
                            Chọn file khác
                          </Button>
                        </div>
                        <Table
                          size="small"
                          dataSource={previewData}
                          pagination={{ pageSize: 5 }}
                          columns={[
                            { title: "STT", dataIndex: "stt", width: 60 },
                            {
                              title: "Tên chặng",
                              dataIndex: "name",
                              ellipsis: true,
                            },
                            { title: "Địa điểm", dataIndex: "location" },
                            {
                              title: "TG Dự kiến (DD/MM/YYYY HH:MM)",
                              dataIndex: "estimateTime",
                              ellipsis: true,
                            },
                            {
                              title: "Thứ tự",
                              dataIndex: "sequence",
                              width: 80,
                            },
                          ]}
                        />
                      </div>
                    )}
                  </div>
                ),
              },
            ]}
          />
        ) : (
          manualFormContent
        )}
      </Form>
    </Modal>
  );
}
