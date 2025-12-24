import React from "react";

import { faArrowLeft } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { Result, Button } from "antd";
import { useNavigate } from "react-router-dom";

const NotFoundPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 px-4">
      <Result
        status="404"
        title="404"
        subTitle="Xin lỗi, trang bạn đang tìm kiếm không tồn tại hoặc đã bị di chuyển."
        extra={
          <Button
            type="primary"
            onClick={() => navigate("/")}
            icon={<FontAwesomeIcon icon={faArrowLeft} />}
          >
            Quay về trang chủ
          </Button>
        }
      />
    </div>
  );
};

export default NotFoundPage;
