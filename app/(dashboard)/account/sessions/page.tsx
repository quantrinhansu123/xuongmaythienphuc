"use client";

import { useSiteTitleStore } from "@/stores/setSiteTitle";
import {
    DeleteOutlined,
    DesktopOutlined,
    ExclamationCircleOutlined,
    LockOutlined,
    MobileOutlined,
    ReloadOutlined,
    TabletOutlined,
} from "@ant-design/icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
    Alert,
    Button,
    Card,
    Form,
    Input,
    Modal,
    Popconfirm,
    Space,
    Table,
    Tag,
    Tooltip,
    Typography,
    message,
} from "antd";
import dayjs from "dayjs";
import "dayjs/locale/vi";
import relativeTime from "dayjs/plugin/relativeTime";
import { useEffect, useState } from "react";

dayjs.extend(relativeTime);
dayjs.locale("vi");

const { Text, Title } = Typography;

interface Session {
  id: number;
  device_name: string;
  device_info: string;
  ip_address: string;
  is_active: boolean;
  is_current: boolean;
  created_at: string;
  expires_at: string;
  last_activity_at: string;
}

export default function MySessionsPage() {
  const setSiteTitle = useSiteTitleStore((state) => state.setSiteTitle);
  const queryClient = useQueryClient();
  const [changePasswordModal, setChangePasswordModal] = useState(false);
  const [form] = Form.useForm();

  useEffect(() => {
    setSiteTitle("Thiết bị đăng nhập");
    return () => setSiteTitle(null);
  }, [setSiteTitle]);

  // Fetch sessions
  const { data, isLoading, refetch } = useQuery({
    queryKey: ["my-sessions"],
    queryFn: async () => {
      const res = await fetch("/api/auth/sessions");
      return res.json();
    },
    staleTime: 2 * 60 * 1000, // Cache
  });

  // Logout sessions mutation
  const logoutMutation = useMutation({
    mutationFn: async (params: { sessionIds?: number[]; logoutAll?: boolean }) => {
      const res = await fetch("/api/auth/sessions", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(params),
      });
      return res.json();
    },
    onSuccess: (data) => {
      if (data.success) {
        message.success(data.message);
        queryClient.invalidateQueries({ queryKey: ["my-sessions"] });
      } else {
        message.error(data.error);
      }
    },
    onError: () => {
      message.error("Có lỗi xảy ra");
    },
  });

  // Change password mutation
  const changePasswordMutation = useMutation({
    mutationFn: async (values: { currentPassword: string; newPassword: string; confirmPassword: string }) => {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      return res.json();
    },
    onSuccess: (data) => {
      if (data.success) {
        message.success(data.message);
        setChangePasswordModal(false);
        form.resetFields();
        setTimeout(() => {
          window.location.href = "/login";
        }, 1500);
      } else {
        message.error(data.error);
      }
    },
    onError: () => {
      message.error("Có lỗi xảy ra");
    },
  });

  const sessions: Session[] = data?.data?.sessions || [];

  const getDeviceIcon = (deviceName: string) => {
    if (deviceName.includes("iPhone") || deviceName.includes("Android")) {
      return <MobileOutlined style={{ fontSize: 24 }} />;
    }
    if (deviceName.includes("iPad") || deviceName.includes("Tablet")) {
      return <TabletOutlined style={{ fontSize: 24 }} />;
    }
    return <DesktopOutlined style={{ fontSize: 24 }} />;
  };

  const columns = [
    {
      title: "Thiết bị",
      key: "device",
      render: (_: unknown, record: Session) => (
        <Space>
          {getDeviceIcon(record.device_name)}
          <div>
            <div>
              <Text strong>{record.device_name}</Text>
              {record.is_current && (
                <Tag color="green" style={{ marginLeft: 8 }}>
                  Thiết bị này
                </Tag>
              )}
            </div>
            <Text type="secondary" style={{ fontSize: 12 }}>
              IP: {record.ip_address}
            </Text>
          </div>
        </Space>
      ),
    },
    {
      title: "Đăng nhập lúc",
      dataIndex: "created_at",
      key: "created_at",
      render: (date: string) => (
        <Tooltip title={dayjs(date).format("DD/MM/YYYY HH:mm:ss")}>
          {dayjs(date).fromNow()}
        </Tooltip>
      ),
    },
    {
      title: "Hoạt động gần nhất",
      dataIndex: "last_activity_at",
      key: "last_activity_at",
      render: (date: string) => (
        <Tooltip title={dayjs(date).format("DD/MM/YYYY HH:mm:ss")}>
          {dayjs(date).fromNow()}
        </Tooltip>
      ),
    },
    {
      title: "Hết hạn",
      dataIndex: "expires_at",
      key: "expires_at",
      render: (date: string) => {
        const isExpiringSoon = dayjs(date).diff(dayjs(), "hour") < 6;
        return (
          <Tooltip title={dayjs(date).format("DD/MM/YYYY HH:mm:ss")}>
            <Text type={isExpiringSoon ? "warning" : undefined}>
              {dayjs(date).fromNow()}
            </Text>
          </Tooltip>
        );
      },
    },
    {
      title: "Thao tác",
      key: "action",
      render: (_: unknown, record: Session) => (
        <Space>
          {!record.is_current && (
            <Popconfirm
              title="Đăng xuất thiết bị này?"
              description="Thiết bị này sẽ bị đăng xuất ngay lập tức"
              onConfirm={() => logoutMutation.mutate({ sessionIds: [record.id] })}
              okText="Đăng xuất"
              cancelText="Hủy"
            >
              <Button
                type="text"
                danger
                icon={<DeleteOutlined />}
                loading={logoutMutation.isPending}
              >
                Đăng xuất
              </Button>
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ];

  const handleLogoutAll = () => {
    Modal.confirm({
      title: "Đăng xuất tất cả thiết bị khác?",
      icon: <ExclamationCircleOutlined />,
      content: "Tất cả các thiết bị khác sẽ bị đăng xuất ngay lập tức.",
      okText: "Đăng xuất tất cả",
      okType: "danger",
      cancelText: "Hủy",
      onOk: () => logoutMutation.mutate({ logoutAll: true }),
    });
  };

  const handleChangePassword = (values: { currentPassword: string; newPassword: string; confirmPassword: string }) => {
    changePasswordMutation.mutate(values);
  };

  return (
    <div>
      <Card>
        <div style={{ marginBottom: 16 }}>
          <Alert
            message="Quản lý thiết bị đăng nhập"
            description="Bạn có thể đăng nhập tối đa 5 thiết bị cùng lúc. Khi đăng nhập thiết bị thứ 6, thiết bị đăng nhập đầu tiên sẽ tự động bị đăng xuất."
            type="info"
            showIcon
            style={{ marginBottom: 16 }}
          />
        </div>

        <div style={{ marginBottom: 16, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
          <div>
            <Title level={5} style={{ margin: 0 }}>
              Thiết bị đang đăng nhập ({sessions.length}/5)
            </Title>
          </div>
          <Space wrap>
            <Button icon={<ReloadOutlined />} onClick={() => refetch()}>
              Làm mới
            </Button>
            <Button icon={<LockOutlined />} onClick={() => setChangePasswordModal(true)}>
              Đổi mật khẩu
            </Button>
            {sessions.length > 1 && (
              <Button
                danger
                icon={<DeleteOutlined />}
                onClick={handleLogoutAll}
                loading={logoutMutation.isPending}
              >
                Đăng xuất tất cả thiết bị khác
              </Button>
            )}
          </Space>
        </div>

        <Table
          columns={columns}
          dataSource={sessions}
          rowKey="id"
          loading={isLoading}
          pagination={false}
        />
      </Card>

      {/* Modal đổi mật khẩu */}
      <Modal
        title="Đổi mật khẩu"
        open={changePasswordModal}
        onCancel={() => {
          setChangePasswordModal(false);
          form.resetFields();
        }}
        footer={null}
      >
        <Form form={form} layout="vertical" onFinish={handleChangePassword}>
          <Form.Item
            name="currentPassword"
            label="Mật khẩu hiện tại"
            rules={[{ required: true, message: "Vui lòng nhập mật khẩu hiện tại" }]}
          >
            <Input.Password placeholder="Nhập mật khẩu hiện tại" />
          </Form.Item>
          <Form.Item
            name="newPassword"
            label="Mật khẩu mới"
            rules={[
              { required: true, message: "Vui lòng nhập mật khẩu mới" },
              { min: 6, message: "Mật khẩu phải có ít nhất 6 ký tự" },
            ]}
          >
            <Input.Password placeholder="Nhập mật khẩu mới" />
          </Form.Item>
          <Form.Item
            name="confirmPassword"
            label="Xác nhận mật khẩu mới"
            dependencies={["newPassword"]}
            rules={[
              { required: true, message: "Vui lòng xác nhận mật khẩu mới" },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue("newPassword") === value) {
                    return Promise.resolve();
                  }
                  return Promise.reject(new Error("Mật khẩu xác nhận không khớp"));
                },
              }),
            ]}
          >
            <Input.Password placeholder="Nhập lại mật khẩu mới" />
          </Form.Item>
          <Form.Item style={{ marginBottom: 0, textAlign: "right" }}>
            <Space>
              <Button onClick={() => {
                setChangePasswordModal(false);
                form.resetFields();
              }}>
                Hủy
              </Button>
              <Button
                type="primary"
                htmlType="submit"
                loading={changePasswordMutation.isPending}
              >
                Đổi mật khẩu
              </Button>
            </Space>
          </Form.Item>
        </Form>
        <div style={{ marginTop: 16, padding: 12, background: "#fff7e6", borderRadius: 8 }}>
          <Text type="warning">
            <ExclamationCircleOutlined style={{ marginRight: 8 }} />
            Sau khi đổi mật khẩu, tất cả các thiết bị sẽ bị đăng xuất.
          </Text>
        </div>
      </Modal>
    </div>
  );
}
