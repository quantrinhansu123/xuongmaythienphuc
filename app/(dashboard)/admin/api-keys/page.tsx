"use client";

import { usePermissions } from "@/hooks/usePermissions";
import { useSiteTitleStore } from "@/stores/setSiteTitle";
import {
    CheckCircleOutlined,
    CloseCircleOutlined,
    CopyOutlined,
    DeleteOutlined,
    EditOutlined,
    EyeInvisibleOutlined,
    EyeOutlined,
    PlusOutlined,
} from "@ant-design/icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
    Alert,
    Button,
    Card,
    DatePicker,
    Form,
    Input,
    InputNumber,
    Modal,
    Popconfirm,
    Select,
    Space,
    Switch,
    Table,
    Tag,
    Tooltip,
    Typography,
    message,
} from "antd";
import dayjs from "dayjs";
import { useEffect, useState } from "react";

const { Text, Title, Paragraph } = Typography;

interface ApiKey {
  id: number;
  keyName: string;
  apiKey: string;
  description: string;
  isActive: boolean;
  permissions: string[];
  rateLimit: number;
  lastUsedAt: string;
  expiresAt: string;
  createdAt: string;
  createdByName: string;
}

const PERMISSION_OPTIONS = [
  { label: "Login", value: "login" },
  { label: "Users", value: "users" },
];

export default function ApiKeysPage() {
  const setSiteTitle = useSiteTitleStore((state) => state.setSiteTitle);
  const { can } = usePermissions();
  const queryClient = useQueryClient();
  const [modalVisible, setModalVisible] = useState(false);
  const [editingKey, setEditingKey] = useState<ApiKey | null>(null);
  const [visibleKeys, setVisibleKeys] = useState<Set<number>>(new Set());
  const [form] = Form.useForm();

  useEffect(() => {
    setSiteTitle("Quản lý API Keys");
    return () => setSiteTitle(null);
  }, [setSiteTitle]);

  // Fetch API keys
  const { data, isLoading } = useQuery({
    queryKey: ["api-keys"],
    queryFn: async () => {
      const res = await fetch("/api/admin/api-keys");
      return res.json();
    },
    staleTime: 5 * 60 * 1000, // Cache
  });

  // Create mutation
  const createMutation = useMutation({
    mutationFn: async (values: any) => {
      const res = await fetch("/api/admin/api-keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      return res.json();
    },
    onSuccess: (data) => {
      if (data.success) {
        message.success("Tạo API key thành công");
        queryClient.invalidateQueries({ queryKey: ["api-keys"] });
        setModalVisible(false);
        form.resetFields();
        // Hiển thị key mới tạo
        Modal.success({
          title: "API Key đã được tạo",
          content: (
            <div>
              <Paragraph>Hãy lưu lại API key này, bạn sẽ không thể xem lại sau:</Paragraph>
              <Paragraph copyable strong style={{ background: "#f5f5f5", padding: 8, borderRadius: 4 }}>
                {data.data.apiKey}
              </Paragraph>
            </div>
          ),
          width: 500,
        });
      } else {
        message.error(data.error);
      }
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, values }: { id: number; values: any }) => {
      const res = await fetch(`/api/admin/api-keys/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      return res.json();
    },
    onSuccess: (data) => {
      if (data.success) {
        message.success("Cập nhật thành công");
        queryClient.invalidateQueries({ queryKey: ["api-keys"] });
        setModalVisible(false);
        setEditingKey(null);
        form.resetFields();
      } else {
        message.error(data.error);
      }
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/admin/api-keys/${id}`, { method: "DELETE" });
      return res.json();
    },
    onSuccess: (data) => {
      if (data.success) {
        message.success("Xóa thành công");
        queryClient.invalidateQueries({ queryKey: ["api-keys"] });
      } else {
        message.error(data.error);
      }
    },
  });

  const apiKeys: ApiKey[] = data?.data?.apiKeys || [];
  const needMigration = data?.data?.needMigration;

  const toggleKeyVisibility = (id: number) => {
    setVisibleKeys((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    message.success("Đã copy vào clipboard");
  };

  const columns = [
    {
      title: "Tên",
      dataIndex: "keyName",
      key: "keyName",
      width: 150,
    },
    {
      title: "API Key",
      dataIndex: "apiKey",
      key: "apiKey",
      width: 300,
      render: (key: string, record: ApiKey) => (
        <Space>
          <Text code style={{ fontSize: 12 }}>
            {visibleKeys.has(record.id) ? key : `${key.substring(0, 8)}${"*".repeat(24)}...`}
          </Text>
          <Tooltip title={visibleKeys.has(record.id) ? "Ẩn" : "Hiện"}>
            <Button
              type="text"
              size="small"
              icon={visibleKeys.has(record.id) ? <EyeInvisibleOutlined /> : <EyeOutlined />}
              onClick={() => toggleKeyVisibility(record.id)}
            />
          </Tooltip>
          <Tooltip title="Copy">
            <Button
              type="text"
              size="small"
              icon={<CopyOutlined />}
              onClick={() => copyToClipboard(key)}
            />
          </Tooltip>
        </Space>
      ),
    },
    {
      title: "Trạng thái",
      dataIndex: "isActive",
      key: "isActive",
      width: 100,
      render: (isActive: boolean) => (
        <Tag color={isActive ? "success" : "error"} icon={isActive ? <CheckCircleOutlined /> : <CloseCircleOutlined />}>
          {isActive ? "Hoạt động" : "Tắt"}
        </Tag>
      ),
    },
    {
      title: "Quyền",
      dataIndex: "permissions",
      key: "permissions",
      width: 150,
      render: (permissions: string[]) => (
        <Space wrap>
          {permissions?.map((p) => (
            <Tag key={p}>{p}</Tag>
          ))}
        </Space>
      ),
    },
    {
      title: "Hết hạn",
      dataIndex: "expiresAt",
      key: "expiresAt",
      width: 120,
      render: (date: string) => {
        if (!date) return <Text type="secondary">Không</Text>;
        const isExpired = dayjs(date).isBefore(dayjs());
        return (
          <Text type={isExpired ? "danger" : undefined}>
            {dayjs(date).format("DD/MM/YYYY")}
          </Text>
        );
      },
    },
    {
      title: "Tạo bởi",
      dataIndex: "createdByName",
      key: "createdByName",
      width: 120,
    },
    {
      title: "Thao tác",
      key: "action",
      width: 120,
      render: (_: unknown, record: ApiKey) => (
        <Space>
          {can("admin.api-keys", "edit") && (
            <Button
              type="text"
              size="small"
              icon={<EditOutlined />}
              onClick={() => {
                setEditingKey(record);
                form.setFieldsValue({
                  keyName: record.keyName,
                  description: record.description,
                  isActive: record.isActive,
                  permissions: record.permissions,
                  rateLimit: record.rateLimit,
                  expiresAt: record.expiresAt ? dayjs(record.expiresAt) : null,
                });
                setModalVisible(true);
              }}
            />
          )}
          {can("admin.api-keys", "delete") && (
            <Popconfirm
              title="Xóa API key này?"
              onConfirm={() => deleteMutation.mutate(record.id)}
              okText="Xóa"
              cancelText="Hủy"
            >
              <Button type="text" size="small" danger icon={<DeleteOutlined />} />
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ];

  const handleSubmit = (values: any) => {
    const payload = {
      ...values,
      expiresAt: values.expiresAt ? values.expiresAt.toISOString() : null,
    };

    if (editingKey) {
      updateMutation.mutate({ id: editingKey.id, values: payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  if (!can("admin.api-keys", "view")) {
    return <Alert message="Bạn không có quyền truy cập trang này" type="error" />;
  }

  return (
    <div>
      <Card>
        {needMigration && (
          <Alert
            message="Cần chạy migration"
            description="Bảng api_keys chưa tồn tại. Vui lòng chạy file database/migrations/api_keys.sql"
            type="warning"
            showIcon
            style={{ marginBottom: 16 }}
          />
        )}

        <div style={{ marginBottom: 16, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <Title level={5} style={{ margin: 0 }}>
            Danh sách API Keys
          </Title>
          {can("admin.api-keys", "create") && (
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => {
                setEditingKey(null);
                form.resetFields();
                setModalVisible(true);
              }}
            >
              Tạo API Key
            </Button>
          )}
        </div>

        <Table
          columns={columns}
          dataSource={apiKeys}
          rowKey="id"
          loading={isLoading}
          pagination={false}
          scroll={{ x: 1000 }}
        />
      </Card>

      <Modal
        title={editingKey ? "Sửa API Key" : "Tạo API Key mới"}
        open={modalVisible}
        onCancel={() => {
          setModalVisible(false);
          setEditingKey(null);
          form.resetFields();
        }}
        footer={null}
        width={500}
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item
            name="keyName"
            label="Tên API Key"
            rules={[{ required: true, message: "Vui lòng nhập tên" }]}
          >
            <Input placeholder="VD: Mobile App, Partner Integration..." />
          </Form.Item>

          <Form.Item name="description" label="Mô tả">
            <Input.TextArea rows={2} placeholder="Mô tả mục đích sử dụng" />
          </Form.Item>

          <Form.Item name="permissions" label="Quyền truy cập" initialValue={["login", "users"]}>
            <Select mode="multiple" options={PERMISSION_OPTIONS} placeholder="Chọn quyền" />
          </Form.Item>

          <Form.Item name="rateLimit" label="Rate limit (request/giờ)" initialValue={1000}>
            <InputNumber min={100} max={100000} style={{ width: "100%" }} />
          </Form.Item>

          <Form.Item name="expiresAt" label="Ngày hết hạn">
            <DatePicker style={{ width: "100%" }} placeholder="Để trống = không hết hạn" />
          </Form.Item>

          {editingKey && (
            <Form.Item name="isActive" label="Trạng thái" valuePropName="checked" initialValue={true}>
              <Switch checkedChildren="Bật" unCheckedChildren="Tắt" />
            </Form.Item>
          )}

          <Form.Item style={{ marginBottom: 0, textAlign: "right" }}>
            <Space>
              <Button onClick={() => setModalVisible(false)}>Hủy</Button>
              <Button
                type="primary"
                htmlType="submit"
                loading={createMutation.isPending || updateMutation.isPending}
              >
                {editingKey ? "Cập nhật" : "Tạo"}
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
