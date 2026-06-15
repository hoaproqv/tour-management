import React, { useState } from "react";

import { DownloadOutlined, InboxOutlined } from "@ant-design/icons";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Alert, Button, message, Modal, Upload } from "antd";

import { downloadTripBusTemplate, importTripBuses } from "../../../api/trips";

import type { UploadProps } from "antd";

const { Dragger } = Upload;

interface ImportBusModalProps {
  open: boolean;
  onCancel: () => void;
  activeTripId: string | null;
}

export default function ImportBusModal({
  open,
  onCancel,
  activeTripId,
}: ImportBusModalProps) {
  const queryClient = useQueryClient();
  const [file, setFile] = useState<File | null>(null);

  const importMutation = useMutation({
    mutationFn: (f: File) => {
      const formData = new FormData();
      formData.append("file", f);
      return importTripBuses(activeTripId as string, formData);
    },
    onSuccess: async () => {
      message.success("Import danh sách xe khách thành công");
      await queryClient.invalidateQueries({ queryKey: ["trip-buses"] });
      onCancel();
      setFile(null);
    },
    onError: (err: any) => {
      message.error(err?.response?.data?.detail || "Lỗi khi import xe khách");
    },
  });

  const handleDownloadTemplate = async () => {
    try {
      const blob = await downloadTripBusTemplate();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "trip_bus_import_template.xlsx";
      a.click();
      window.URL.revokeObjectURL(url);
    } catch {
      message.error("Lỗi khi tải template");
    }
  };

  const draggerProps: UploadProps = {
    accept: ".xlsx,.xls",
    beforeUpload: (f) => {
      setFile(f);
      return false; // Prevent auto upload
    },
    maxCount: 1,
    onRemove: () => {
      setFile(null);
    },
  };

  const handleImport = () => {
    if (!activeTripId) {
      message.warning("Vui lòng chọn chuyến đi trước");
      return;
    }
    if (!file) return;
    importMutation.mutate(file);
  };

  return (
    <Modal
      open={open}
      title="Import xe khách vào chuyến đi"
      onCancel={onCancel}
      footer={null}
      destroyOnClose
    >
      <Alert
        type="info"
        showIcon
        className="mb-4"
        message="Định dạng file"
        description={
          <div className="space-y-1">
            <p>
              Tải file Excel mẫu để xem đúng định dạng. Cột yêu cầu: Biển số, Mã
              xe, Sức chứa, Mô tả.
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

      <Dragger {...draggerProps}>
        <p className="ant-upload-drag-icon">
          <InboxOutlined />
        </p>
        <p className="ant-upload-text">Kéo thả hoặc nhấp để chọn file .xlsx</p>
        <p className="ant-upload-hint">Chỉ hỗ trợ .xlsx / .xls</p>
      </Dragger>

      <div className="flex justify-end mt-4 gap-2">
        <Button onClick={onCancel}>Hủy</Button>
        <Button
          type="primary"
          onClick={handleImport}
          disabled={!file}
          loading={importMutation.isPending}
        >
          Import
        </Button>
      </div>
    </Modal>
  );
}
