"use client";

import CompanyConfigModal from "@/components/CompanyConfigModal";
import { allMenuItems } from "@/configs/menu";
import { usePermissions } from "@/hooks/usePermissions";
import { AppstoreOutlined, SettingOutlined } from "@ant-design/icons";
import { Button, Card, Col, Flex, Menu, Row, Tooltip, Typography } from "antd";
import Link from "next/link";
import { useMemo, useState } from "react";

const { Title, Text } = Typography;

export default function DashboardPage() {
  const { can, isAdmin } = usePermissions();
  const [companyModalOpen, setCompanyModalOpen] = useState(false);
  const [selectedGroupKey, setSelectedGroupKey] = useState("all");

  // Lọc các menu items có children (các nhóm chức năng)
  const menuGroups = useMemo(() => {
    return allMenuItems
      .filter((item) => {
        if (!item.children || item.children.length === 0) return false;
        
        if (item.permission && !isAdmin && !can(item.permission, "view")) {
          return false;
        }

        const hasVisibleChild = item.children.some((child) => {
          if (!child.permission) return true;
          return isAdmin || can(child.permission, "view");
        });

        return hasVisibleChild;
      })
      .map((group, index) => ({
        ...group,
        key: String(index),
        children: group.children?.filter((child) => {
          if (!child.permission) return true;
          return isAdmin || can(child.permission, "view");
        }),
      }));
  }, [can, isAdmin]);

  // Tất cả các chức năng con
  const allChildren = useMemo(() => {
    return menuGroups.flatMap((group) => 
      (group.children || []).map((child) => ({
        ...child,
        groupTitle: group.title,
        groupIcon: group.icon,
      }))
    );
  }, [menuGroups]);

  // Lấy các chức năng hiển thị dựa trên nhóm được chọn
  const displayedChildren = useMemo(() => {
    if (selectedGroupKey === "all") {
      return allChildren;
    }
    const selectedGroup = menuGroups.find((g) => g.key === selectedGroupKey);
    return selectedGroup?.children || [];
  }, [selectedGroupKey, menuGroups, allChildren]);

  // Menu items cho sidebar - thêm mục "Tất cả" ở đầu
  const sidebarMenuItems = [
    {
      key: "all",
      icon: <AppstoreOutlined />,
      label: "Tất cả",
    },
    ...menuGroups.map((group) => ({
      key: group.key,
      icon: group.icon,
      label: group.title,
    })),
  ];

  // Tên nhóm đang chọn
  const selectedGroupTitle = selectedGroupKey === "all" 
    ? "Tất cả chức năng" 
    : menuGroups.find((g) => g.key === selectedGroupKey)?.title || "";

  const selectedGroupIcon = selectedGroupKey === "all"
    ? <AppstoreOutlined />
    : menuGroups.find((g) => g.key === selectedGroupKey)?.icon;

  return (
    <div className="h-full">
      {/* Header với nút cài đặt */}
      {isAdmin && (
        <Flex justify="flex-end" style={{ marginBottom: 16 }}>
          <Tooltip title="Cài đặt thông tin công ty">
            <Button
              type="primary"
              icon={<SettingOutlined />}
              onClick={() => setCompanyModalOpen(true)}
            >
              Thông tin công ty
            </Button>
          </Tooltip>
        </Flex>
      )}

      <Row gutter={16} style={{ minHeight: "calc(100vh - 220px)" }}>
        {/* Menu dọc bên trái - Các nhóm chức năng */}
        <Col xs={24} sm={24} md={6} lg={5} xl={4}>
          <Card
            title={
              <Text strong style={{ fontSize: 14 }}>
                Nhóm chức năng
              </Text>
            }
            styles={{
              body: { padding: 0 },
              header: { minHeight: 40, padding: "8px 16px" },
            }}
            style={{ 
              borderRadius: 12,
              position: "sticky",
              top: 80,
            }}
          >
            <Menu
              mode="inline"
              selectedKeys={[selectedGroupKey]}
              onClick={({ key }) => setSelectedGroupKey(key)}
              items={sidebarMenuItems}
              style={{ border: "none", borderRadius: "0 0 12px 12px" }}
            />
          </Card>
        </Col>

        {/* Các ô ứng dụng bên phải - chỉ hiển thị các mục con */}
        <Col xs={24} sm={24} md={18} lg={19} xl={20}>
          <Card
            title={
              <Flex align="center" gap={12}>
                <div
                  style={{
                    fontSize: 24,
                    color: "var(--ant-color-primary)",
                  }}
                >
                  {selectedGroupIcon}
                </div>
                <Title level={4} style={{ margin: 0 }}>
                  {selectedGroupTitle}
                </Title>
                <Text type="secondary" style={{ fontSize: 14 }}>
                  ({displayedChildren.length} chức năng)
                </Text>
              </Flex>
            }
            style={{ borderRadius: 12 }}
          >
            <Row gutter={[16, 16]}>
              {displayedChildren.map((child) => (
                <Col xs={12} sm={8} md={6} lg={4} xl={4} key={child.href}>
                  <Link href={child.href} style={{ textDecoration: "none" }}>
                    <Card
                      hoverable
                      styles={{
                        body: {
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "center",
                          justifyContent: "center",
                          padding: "24px 12px",
                          minHeight: 120,
                        },
                      }}
                      style={{
                        borderRadius: 12,
                        transition: "all 0.3s ease",
                      }}
                      className="dashboard-app-card"
                    >
                      <div
                        style={{
                          fontSize: 36,
                          marginBottom: 12,
                          color: "var(--ant-color-primary)",
                        }}
                      >
                        {child.icon}
                      </div>
                      <Text
                        strong
                        style={{
                          fontSize: 13,
                          textAlign: "center",
                          lineHeight: 1.3,
                        }}
                      >
                        {child.title}
                      </Text>
                    </Card>
                  </Link>
                </Col>
              ))}
            </Row>
          </Card>
        </Col>
      </Row>

      {/* Modal cài đặt công ty */}
      <CompanyConfigModal
        open={companyModalOpen}
        onClose={() => setCompanyModalOpen(false)}
      />

      <style jsx global>{`
        .dashboard-app-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
        }
      `}</style>
    </div>
  );
}
