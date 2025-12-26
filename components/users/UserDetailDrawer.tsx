"use client";

import type { User } from "@/services/userService";
import {
    DeleteOutlined,
    DesktopOutlined,
    EditOutlined,
    ExclamationCircleOutlined,
    LockOutlined,
    MobileOutlined,
    TabletOutlined,
    UnlockOutlined,
} from "@ant-design/icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button, Descriptions, Divider, Drawer, message, Modal, Popconfirm, Space, Table, Tag, Typography } from "antd";
import dayjs from "dayjs";
import "dayjs/locale/vi";
import relativeTime from "dayjs/plugin/relativeTime";
import { useState } from "react";

dayjs.extend(relativeTime);
dayjs.locale("vi");

const { Text, Title } = Typography;

interface Session {
  id: number;
  device_name: string;
  device_info: string;
  ip_address: string;
  is_active: boolean;
  created_at: string;
  expires_at: string;
  last_activity_at: string;
}

type Props = {
  open: boolean;
  user: User | null;
  onClose: () => void;
  onEdit: (user: User) => void;
  onDelete: (id: number) => void;
  canEdit?: boolean;
  canDelete?: boolean;
};

export default function UserDetailDrawer({
  open,
  user,
  onClose,
  onEdit,
  onDelete,
  canEdit,
  canDelete,
}: Props) {
  const queryClient = useQueryClient();
  const [showSessions, setShowSessions] = useState(false);

  // Fetch sessions của user
  const { data: sessionsData, isLoading: sessionsLoading, refetch: refetchSessions } = useQuery({
    queryKey: ["user-sessions", user?.id],
    queryFn: async () => {
      const res = await fetch(`/api/admin/users/${user?.id}/sessions`);
      return res.json();
    },
    staleTime: 2 * 60 * 1000, // Cache
    enabled: !!user?.id && showSessions,
  });

  // Logout sessions mutation
  const logoutMutation = useMutation({
    mutationFn: async (params: { sessionIds?: number[]; logoutAll?: boolean }) => {
      const res = await fetch(`/api/admin/users/${user?.id}/sessions`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(params),
      });
      return res.json();
    },
    onSuccess: (data) => {
      if (data.success) {
        message.success(data.message);
        refetchSessions();
      } else {
        message.error(data.error);
      }
    },
    onError: () => {
      message.error("Có lỗi xảy ra");
    },
  });

  const sessions: Session[] = sessionsData?.data?.sessions || [];

  const getDeviceIcon = (deviceName: string) => {
    if (deviceName?.includes("iPhone") || deviceName?.includes("Android")) {
      return <MobileOutlined />;
    }
    if (deviceName?.includes("iPad") || deviceName?.includes("Tablet")) {
      return <TabletOutlined />;
    }
    return <DesktopOutlined />;
  };

  const sessionColumns = [
    {
      title: "Thiết bị",
      key: "device",
      render: (_: unknown, record: Session) => (
        <Space>
          {getDeviceIcon(record.device_name)}
          <div>
            <Text strong>{record.device_name}</Text>
            <br />
            <Text type="secondary" style={{ fontSize: 11 }}>IP: {record.ip_address}</Text>
          </div>
        </Space>
      ),
    },
    {
      title: "Đăng nhập",
      dataIndex: "created_at",
      key: "created_at",
      width: 120,
      render: (date: string) => dayjs(date).fromNow(),
    },
    {
      title: "",
      key: "action",
      width: 80,
      render: (_: unknown, record: Session) => (
        <Popconfirm
          title="Đăng xuất thiết bị này?"
          onConfirm={() => logoutMutation.mutate({ sessionIds: [record.id] })}
          okText="Đăng xuất"
          cancelText="Hủy"
        >
          <Button type="text" danger size="small" icon={<DeleteOutlined />}>
            Đăng xuất
          </Button>
        </Popconfirm>
      ),
    },
  ];

  const handleLogoutAll = () => {
    Modal.confirm({
      title: "Đăng xuất tất cả thiết bị?",
      icon: <ExclamationCircleOutlined />,
      content: `Tất cả thiết bị của ${user?.fullName} sẽ bị đăng xuất ngay lập tức.`,
      okText: "Đăng xuất tất cả",
      okType: "danger",
      cancelText: "Hủy",
      onOk: () => logoutMutation.mutate({ logoutAll: true }),
    });
  };

  return (
    <Drawer
      title="Chi tiết người dùng"
      placement="right"
      width={600}
      onClose={() => {
        onClose();
        setShowSessions(false);
      }}
      open={open}
    >
      {user ? (
        <>
          <Descriptions column={1} bordered size="small">
            <Descriptions.Item label="Mã nhân viên">
              {user.userCode}
            </Descriptions.Item>
            <Descriptions.Item label="Tên đăng nhập">
              {user.username}
            </Descriptions.Item>
            <Descriptions.Item label="Họ tên">
              {user.fullName}
            </Descriptions.Item>
            <Descriptions.Item label="Email">
              {user.email || "-"}
            </Descriptions.Item>
            <Descriptions.Item label="Số điện thoại">
              {user.phone || "-"}
            </Descriptions.Item>
            <Descriptions.Item label="Chi nhánh">
              {user.branchName}
            </Descriptions.Item>
            <Descriptions.Item label="Vai trò">
              {user.roleName}
            </Descriptions.Item>
            <Descriptions.Item label="Trạng thái">
              <Tag
                color={user.isActive ? "success" : "error"}
                icon={user.isActive ? <UnlockOutlined /> : <LockOutlined />}
              >
                {user.isActive ? "Hoạt động" : "Khóa"}
              </Tag>
            </Descriptions.Item>
          </Descriptions>

          <Space style={{ marginTop: 16 }}>
            {canEdit && (
              <Button
                type="primary"
                icon={<EditOutlined />}
                onClick={() => onEdit(user)}
              >
                Sửa
              </Button>
            )}
            {canDelete && (
              <Button
                danger
                icon={<DeleteOutlined />}
                onClick={() => onDelete(user.id)}
              >
                Xóa
              </Button>
            )}
            <Button
              icon={<DesktopOutlined />}
              onClick={() => setShowSessions(!showSessions)}
            >
              {showSessions ? "Ẩn thiết bị" : "Xem thiết bị đăng nhập"}
            </Button>
          </Space>

          {showSessions && (
            <>
              <Divider />
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <Title level={5} style={{ margin: 0 }}>
                  Thiết bị đang đăng nhập ({sessions.length}/5)
                </Title>
                {sessions.length > 0 && (
                  <Button
                    danger
                    size="small"
                    onClick={handleLogoutAll}
                    loading={logoutMutation.isPending}
                  >
                    Đăng xuất tất cả
                  </Button>
                )}
              </div>
              <Table
                columns={sessionColumns}
                dataSource={sessions}
                rowKey="id"
                loading={sessionsLoading}
                pagination={false}
                size="small"
              />
              {sessions.length === 0 && !sessionsLoading && (
                <Text type="secondary">Không có thiết bị nào đang đăng nhập</Text>
              )}
            </>
          )}
        </>
      ) : null}
    </Drawer>
  );
}
