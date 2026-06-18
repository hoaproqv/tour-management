import React, { useMemo } from "react";

import { Alert, Card, Collapse, Typography, Steps, Divider, Tag } from "antd";

import { useGetAccountInfo } from "../../hooks/useAuth";
import {
  isAdminLike,
  isCompanyManager as checkCompanyManager,
  isDriver,
  isFleetLead,
  isTourManagerLike,
} from "../../utils/helper";

import type { IUser } from "../../utils/types";
import type { CollapseProps } from "antd";

const { Title, Paragraph, Text } = Typography;

export default function GuidePage() {
  const { data: accountInfo } = useGetAccountInfo();
  const currentUser = accountInfo as IUser | undefined;

  const isAdmin = isAdminLike(currentUser);
  const isCompanyManagerRole = checkCompanyManager(currentUser);
  const isTourManager = isTourManagerLike(currentUser);
  const isDriverOrFleet = isDriver(currentUser) || isFleetLead(currentUser);

  const guideItems = useMemo(() => {
    const items: CollapseProps["items"] = [];

    // Trips
    if (isCompanyManagerRole || isTourManager) {
      items.push({
        key: "trip",
        label: "Quản lý Chuyến đi",
        children: (
          <div className="space-y-4">
            <Paragraph>
              Chuyến đi là tập hợp các chặng đường, đại diện cho một hành trình
              lớn xuyên suốt.
            </Paragraph>
            <div className="pl-4 border-l-2 border-blue-500">
              <Paragraph className="mb-2">
                <Text strong>
                  <Tag color="blue">Xem danh sách</Tag>
                </Text>
                Truy cập menu "Chuyến đi". Bảng dữ liệu sẽ hiển thị toàn bộ các
                chuyến đi đang có, kèm theo công cụ tìm kiếm và lọc.
              </Paragraph>
              <Paragraph className="mb-2">
                <Text strong>
                  <Tag color="green">Thêm mới</Tag>
                </Text>
                Bấm nút <Text mark>Thêm mới</Text> góc trên phải. Điền đầy đủ:
                Tên chuyến, điểm đi, điểm đến, thời gian dự kiến và ấn Lưu.
              </Paragraph>
              <Paragraph className="mb-2">
                <Text strong>
                  <Tag color="cyan">Xem chi tiết</Tag>
                </Text>
                Bấm vào <Text strong>Tên chuyến đi</Text> trong bảng. Màn hình
                chi tiết sẽ hiển thị các chặng đường thuộc chuyến này và danh
                sách khách tổng thể.
              </Paragraph>
              <Paragraph className="mb-2">
                <Text strong>
                  <Tag color="orange">Sửa</Tag>
                </Text>
                Bấm vào biểu tượng cây bút ✎ ở cột hành động trên dòng chuyến đi
                muốn sửa để cập nhật lại tên hoặc lộ trình.
              </Paragraph>
              <Paragraph className="mb-0">
                <Text strong>
                  <Tag color="red">Xóa</Tag>
                </Text>
                Bấm vào biểu tượng thùng rác 🗑.{" "}
                <Text type="danger">
                  Lưu ý: Chỉ xóa được các chuyến đi chưa phát sinh chặng hoặc
                  hành khách.
                </Text>
              </Paragraph>
            </div>
          </div>
        ),
      });
    }

    // Rounds
    if (isCompanyManagerRole || isTourManager || isDriverOrFleet) {
      items.push({
        key: "round",
        label: "Quản lý Chặng",
        children: (
          <div className="space-y-4">
            <Paragraph>
              Chặng là các đoạn đường cụ thể trong một chuyến đi, được gắn liền
              với một xe khách và tài xế nhất định.
            </Paragraph>

            {isCompanyManagerRole || isTourManager ? (
              <div className="pl-4 border-l-2 border-blue-500">
                <Paragraph className="mb-2">
                  <Text strong>
                    <Tag color="blue">Xem danh sách / Export Excel</Tag>
                  </Text>
                  Tại menu "Chặng", hệ thống liệt kê các chặng của mọi chuyến
                  đi. Bạn có thể xuất danh sách chặng ra file Excel (nút Export)
                  để báo cáo.
                </Paragraph>
                <Paragraph className="mb-2">
                  <Text strong>
                    <Tag color="green">Thêm mới</Tag>
                  </Text>
                  Từ trang danh sách hoặc trong Chi tiết chuyến đi, bấm{" "}
                  <Text mark>Thêm mới chặng</Text>. Bạn cần nhập: Thuộc chuyến đi, 
                  Tên chặng, Địa điểm, Ngày và Giờ đến dự kiến (dạng 24 giờ).
                </Paragraph>
                <Paragraph className="mb-2">
                  <Text strong>
                    <Tag color="orange">Sửa lộ trình</Tag>
                  </Text>
                  Sử dụng tính năng sửa để cập nhật lại thời gian hoặc địa điểm nếu có thay đổi.{" "}
                  <Text type="danger" strong>Lưu ý:</Text> Chỉ được sửa các chặng ở ngày chưa đi. Trong ngày đang đi, chỉ được sửa các chặng chưa đến. Không thể sửa chặng đã đến hoặc đang đi.
                </Paragraph>
                <Paragraph className="mb-2">
                  <Text strong>
                    <Tag color="purple">Sắp xếp thứ tự</Tag>
                  </Text>
                  Bạn có thể kéo thả trực tiếp các dòng trong bảng để thay đổi thứ tự các chặng.{" "}
                  <Text type="danger" strong>Lưu ý:</Text> Không được kéo và sắp xếp các chặng chưa đến lên trước các chặng đang thực hiện (đang đi).
                </Paragraph>
                <Paragraph className="mb-0">
                  <Text strong>
                    <Tag color="red">Xóa</Tag>
                  </Text>
                  Hệ thống sẽ yêu cầu xác nhận khi xóa. Chỉ xóa được chặng chưa có
                  dữ liệu điểm danh.
                </Paragraph>
              </div>
            ) : (
              <div className="pl-4 border-l-2 border-blue-500">
                <Paragraph className="mb-0">
                  <Text strong>
                    <Tag color="blue">Xem danh sách phân công</Tag>
                  </Text>
                  Bạn sẽ chỉ thấy các chặng thuộc chuyến đi mà xe của bạn được phân công.
                </Paragraph>
              </div>
            )}
          </div>
        ),
      });
    }

    // Bus
    if (isCompanyManagerRole || isTourManager) {
      items.push({
        key: "bus",
        label: "Quản lý Xe khách",
        children: (
          <div className="space-y-4">
            <Paragraph>
              Quản lý hồ sơ các xe khách mà công ty đang sở hữu hoặc thuê ngoài.
            </Paragraph>
            <div className="pl-4 border-l-2 border-blue-500">
              <Paragraph className="mb-2">
                <Text strong>
                  <Tag color="blue">Xem danh sách</Tag>
                </Text>
                Danh sách toàn bộ xe khách, hiển thị biển số, loại xe và số ghế
                ngồi.
              </Paragraph>
              <Paragraph className="mb-2">
                <Text strong>
                  <Tag color="green">Thêm mới / Import Excel</Tag>
                </Text>
                Thêm từng xe thủ công hoặc Import từ file Excel.
                <Text type="danger" strong>
                  {" "}
                  LƯU Ý QUAN TRỌNG: Dù tạo tay hay Import, bạn phải nhớ gán Tài
                  xế và Trưởng xe quản lý cho xe đó để họ có thể điểm danh khách
                  trên xe.
                </Text>
              </Paragraph>
              <Paragraph className="mb-2">
                <Text strong>
                  <Tag color="orange">Sửa</Tag>
                </Text>
                Cập nhật thông tin xe nếu có thay đổi (bấm icon ✎).
              </Paragraph>
              <Paragraph className="mb-0">
                <Text strong>
                  <Tag color="red">Xóa</Tag>
                </Text>
                Loại bỏ xe khỏi hệ thống (bấm icon 🗑) khi ngừng sử dụng. (Lưu ý
                xe đã từng chạy chặng sẽ không thể xóa để giữ lịch sử).
              </Paragraph>
            </div>
          </div>
        ),
      });
    }

    // Passenger
    if (isCompanyManagerRole || isTourManager) {
      items.push({
        key: "passenger",
        label: "Quản lý Hành khách",
        children: (
          <div className="space-y-4">
            <Paragraph>
              Quản lý thông tin hành khách tham gia tour và điều phối hành khách
              lên các xe.
            </Paragraph>
            <div className="pl-4 border-l-2 border-blue-500">
              <Paragraph className="mb-2">
                <Text strong>
                  <Tag color="blue">Xem danh sách / Export Excel</Tag>
                </Text>
                Quản lý toàn bộ danh sách khách hàng. Bạn có thể tìm kiếm, lọc
                và <Text strong>Export ra file Excel</Text> để báo cáo hoặc in
                ấn.
              </Paragraph>
              <Paragraph className="mb-2">
                <Text strong>
                  <Tag color="green">Thêm mới / Import Excel</Tag>
                </Text>
                Thêm từng khách thủ công hoặc sử dụng chức năng{" "}
                <Text strong>Tải lên Excel</Text> để nhập hàng loạt hành khách
                cho một chuyến đi.
                <Text type="danger" strong>
                  {" "}
                  LƯU Ý QUAN TRỌNG: Sau khi import hành khách từ Excel hoặc tạo tay, bạn bắt
                  buộc phải gắn xe thực tế cho họ thì họ mới hiển thị trên app của tài xế. 
                  Khi gắn xe, hệ thống sẽ tự động gộp danh sách hành khách của xe import vào chung tab với xe thực tế.
                </Text>
              </Paragraph>
              <Paragraph className="mb-2">
                <Text strong>
                  <Tag color="purple">Phân bổ hành khách</Tag>
                </Text>
                Trong màn hình chi tiết Chuyến đi, bạn có thể chọn nhiều hành
                khách và gán họ vào một Chặng (Xe) cụ thể. Các hành khách đã được gán sẽ tự động được gộp chung danh sách với xe thực tế theo thứ tự bảng chữ cái.
              </Paragraph>
              <Paragraph className="mb-2">
                <Text strong>
                  <Tag color="orange">Sửa</Tag>
                </Text>
                Cập nhật thông tin cá nhân khách hàng.
              </Paragraph>
              <Paragraph className="mb-0">
                <Text strong>
                  <Tag color="red">Xóa</Tag>
                </Text>
                Hủy khách hàng khỏi hệ thống nếu khách hủy tour trước giờ khởi
                hành.
              </Paragraph>
            </div>
          </div>
        ),
      });
    }

    // Transactions (Điểm danh)
    if (isCompanyManagerRole || isTourManager || isDriverOrFleet) {
      items.push({
        key: "transactions",
        label: "Điểm danh hành khách (Cốt lõi)",
        children: (
          <div className="space-y-4">
            <Paragraph>
              Chức năng điểm danh là thao tác quan trọng trên xe. Nó giúp xác
              nhận khách đã có mặt trên xe hay chưa, thực hiện qua giao diện
              điểm danh và các tab xe tương ứng.
            </Paragraph>
            <Paragraph className="mb-4">
              <Text type="warning" strong>
                *Lưu ý (Dành riêng cho Quản lý chuyến đi): 
              </Text>{" "}
              Quản lý chuyến đi bắt buộc phải bấm nút <Text strong>XUẤT PHÁT</Text> ở phía trên cùng của màn hình để bắt đầu chuyến đi. Nút này sẽ kiểm tra ngày của chặng bạn đang chọn. Nếu chưa đến ngày, hệ thống sẽ hiển thị <Text type="secondary">"Xuất phát ngày..."</Text> và chặn thao tác để tránh xuất phát nhầm ngày.
              <br/>
              Đồng thời, hệ thống sẽ tự động kiểm tra số lượng hành khách. Nếu còn <Text type="danger" strong>hành khách chưa được gán xe</Text>, hệ thống sẽ cảnh báo và chặn xuất phát để đảm bảo không sót khách.
            </Paragraph>

            <Divider orientation="left" plain>
              Quy trình thực hiện điểm danh
            </Divider>

            <div className="bg-gray-50 p-4 rounded-lg">
              <Steps
                direction="vertical"
                size="small"
                current={5}
                items={[
                  {
                    title: <Text strong>Bước 1: Chọn Chuyến đi và Ngày</Text>,
                    description:
                      'Tại màn hình "Điểm danh", chọn Chuyến đi. Sau đó chọn Ngày trên các tab để lọc danh sách các chặng tương ứng trong ngày.',
                  },
                  {
                    title: <Text strong>Bước 2: Chọn Chặng (Timeline)</Text>,
                    description:
                      'Bấm vào các mốc chặng trên thanh Timeline để xem danh sách xe. Cần chốt điểm danh lần lượt theo thứ tự của các chặng.',
                  },
                  {
                    title: <Text strong>Bước 3: Chọn Xe khách</Text>,
                    description:
                      "Bên dưới sẽ hiển thị các tab xe khách. Quản lý sẽ thấy tất cả xe, còn Tài xế/Trưởng xe chỉ thấy xe mình phụ trách.",
                  },
                  {
                    title: <Text strong>Bước 4: Điểm danh lên/xuống xe</Text>,
                    description:
                      'Bấm vào nút hành động để đánh dấu "Lên xe" hoặc "Xuống xe". Có thể sử dụng tính năng "Điểm danh thành viên xe khác" nếu khách lên nhầm xe.',
                  },
                  {
                    title: <Text strong>Bước 5: Chốt danh sách</Text>,
                    description:
                      'Khi đã hoàn tất, nhấn "Chốt điểm danh" để khóa dữ liệu chặng hiện tại và tiếp tục thao tác ở chặng tiếp theo.',
                  },
                ]}
              />
            </div>
          </div>
        ),
      });
    }

    // Account (Employee)
    if (isCompanyManagerRole) {
      items.push({
        key: "account",
        label: "Quản lý Nhân viên (Phân quyền)",
        children: (
          <div className="space-y-4">
            <Paragraph>Cấp phát tài khoản cho nhân sự trong công ty.</Paragraph>
            <div className="pl-4 border-l-2 border-blue-500">
              <Paragraph className="mb-2">
                <Text strong>
                  <Tag color="blue">Xem danh sách</Tag>
                </Text>
                Liệt kê các tài khoản nhân viên đang hoạt động trong hệ thống
                công ty.
              </Paragraph>
              <Paragraph className="mb-2">
                <Text strong>
                  <Tag color="green">Thêm nhân viên</Tag>
                </Text>
                Tạo tài khoản mới. <Text mark>Lưu ý quan trọng:</Text> Bạn phải
                chọn đúng Vai trò (Quản lý chuyến đi, Trưởng xe, Lái xe) để hệ
                thống giới hạn đúng quyền hiển thị.
              </Paragraph>
              <Paragraph className="mb-2">
                <Text strong>
                  <Tag color="orange">Sửa thông tin</Tag>
                </Text>
                Cập nhật thông tin của nhân viên (không bao gồm đổi mật khẩu).
              </Paragraph>
              <Paragraph className="mb-0">
                <Text strong>
                  <Tag color="red">Khóa/Xóa tài khoản</Tag>
                </Text>
                Thu hồi quyền truy cập của nhân viên đã nghỉ việc.
              </Paragraph>
            </div>
          </div>
        ),
      });
    }

    return items;
  }, [isCompanyManagerRole, isTourManager, isDriverOrFleet]);

  if (isAdmin) {
    return (
      <div className="p-6">
        <Alert
          message="Không có quyền truy cập"
          description="Trang hướng dẫn sử dụng không áp dụng cho tài khoản Admin hệ thống."
          type="warning"
          showIcon
        />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <Title level={2} style={{ margin: 0 }}>
            Sổ tay Hướng dẫn sử dụng
          </Title>
          <Paragraph className="text-gray-500 mt-2 mb-0">
            Tài liệu chi tiết giúp bạn thao tác chuẩn xác trên hệ thống. Nội
            dung dưới đây được cá nhân hóa dựa trên chức vụ của bạn trong công
            ty.
          </Paragraph>
        </div>
      </div>

      {(isCompanyManagerRole || isTourManager) && (
        <Card className="shadow-sm border-t-4 border-t-green-500">
          <Title level={4}>Quy trình thiết lập hệ thống chuẩn</Title>
          <Paragraph className="text-gray-600 mb-4">
            Để tránh lỗi do thiếu dữ liệu liên quan (VD: tạo chặng nhưng chưa có
            xe), bạn vui lòng thực hiện tuần tự theo quy trình 5 bước sau:
          </Paragraph>
          <Steps
            size="small"
            current={5}
            items={[
              { title: "Tạo Nhân sự", description: "Tài xế, Phụ xe" },
              { title: "Tạo Chuyến đi", description: "Khung lộ trình" },
              { title: "Tạo Xe khách", description: "Phương tiện" },
              { title: "Tạo Chặng", description: "Gắn tài xế/xe vào chuyến" },
              { title: "Tạo & Gắn Khách", description: "Import và phân bổ" },
            ]}
          />
        </Card>
      )}

      <Card className="shadow-sm border-t-4 border-t-blue-500">
        <Collapse items={guideItems} bordered={false} className="bg-white" />
      </Card>
    </div>
  );
}
