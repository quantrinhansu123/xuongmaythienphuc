"use client";

import { queryClient } from "@/providers/ReactQueryProvider";
import { LockOutlined, LoginOutlined, UserOutlined } from "@ant-design/icons";
import { useMutation } from "@tanstack/react-query";
import { App, Button, Card, Form, Input, Space, Typography } from "antd";
import { useRouter } from "next/navigation";

const { Title } = Typography;

export default function LoginPage() {
  const router = useRouter();
  const [form] = Form.useForm();
  const { message } = App.useApp();

  const handleSubmit = async (values: {
    username: string;
    password: string;
  }) => {
    await loginMutation.mutate(values);
  };

  const loginMutation = useMutation({
    mutationFn: async (values: { username: string; password: string }) => {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error || "Đăng nhập thất bại");
      }
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["me"] });
      message.success("Đăng nhập thành công");
      router.push("/dashboard");
    },
    onError: (error) => {
      const text =
        error instanceof Error
          ? error.message
          : String(error || "Đăng nhập thất bại");
      message.error(text);
    },
  });

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        position: "relative",
      }}
    >
      <Card
        style={{
          width: "100%",
          maxWidth: 400,
        }}
      >
        <Space vertical size="large" style={{ width: "100%" }}>
          <div style={{ textAlign: "center" }}>
            <Title level={2} style={{ marginBottom: 8 }}>
              Đăng nhập hệ thống
            </Title>
            <Typography.Text type="secondary">
              Nhập thông tin để truy cập hệ thống
            </Typography.Text>
          </div>

          <Form
            form={form}
            onFinish={handleSubmit}
            layout="vertical"
            size="large"
            autoComplete="off"
          >
            <Form.Item
              name="username"
              label="Tên đăng nhập"
              rules={[
                { required: true, message: "Vui lòng nhập tên đăng nhập!" },
              ]}
            >
              <Input
                prefix={<UserOutlined />}
                placeholder="Nhập tên đăng nhập"
              />
            </Form.Item>

            <Form.Item
              name="password"
              label="Mật khẩu"
              rules={[{ required: true, message: "Vui lòng nhập mật khẩu!" }]}
            >
              <Input.Password
                prefix={<LockOutlined />}
                placeholder="Nhập mật khẩu"
              />
            </Form.Item>

            <Form.Item>
              <Button
                type="primary"
                htmlType="submit"
                loading={loginMutation.status === "pending"}
                icon={<LoginOutlined />}
                block
                size="large"
              >
                {loginMutation.status === "pending"
                  ? "Đang đăng nhập..."
                  : "Đăng nhập"}
              </Button>
            </Form.Item>
          </Form>
        </Space>
      </Card>
    </div>
  );
}
