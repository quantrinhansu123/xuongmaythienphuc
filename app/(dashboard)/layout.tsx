"use client";

import FastPageTransition from "@/components/FastPageTransition";
import ItemColorTheme from "@/components/ItemColorTheme";
import LoaderApp from "@/components/LoaderApp";
import { allMenuItems } from "@/configs/menu";
import { themeColors } from "@/configs/theme";
import { useIsMobile } from "@/hooks/useIsMobile";
import { usePermissions } from "@/hooks/usePermissions";
import { useTheme } from "@/providers/AppThemeProvider";
import { queryClient } from "@/providers/ReactQueryProvider";
import { useSiteTitleStore } from "@/stores/setSiteTitle";
import {
  DashboardOutlined,
  DesktopOutlined,
  LogoutOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  UserOutlined
} from "@ant-design/icons";
import { useQuery } from "@tanstack/react-query";
import type { MenuProps } from "antd";
import {
  Avatar,
  Breadcrumb,
  Button,
  Drawer,
  Dropdown,
  Layout,
  Menu,
  Typography,
  theme
} from "antd";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

const { Header, Sider, Content } = Layout;
const { Text } = Typography;

interface User {
  id: number;
  username: string;
  fullName: string;
  roleCode: string;
}

// Breadcrumb map - định nghĩa ngoài component để tránh re-create
const BREADCRUMB_MAP: Record<string, string> = {
  "/admin/users": "Quản lý người dùng",
  "/admin/roles": "Quản lý vai trò",
  "/admin/branches": "Quản lý chi nhánh",
  "/admin/warehouses": "Quản lý kho hàng",
  "/products": "Quản lý sản phẩm",
  "/products/categories": "Danh mục sản phẩm",
  "/products/materials": "Nguyên vật liệu",
  "/inventory": "Quản lý kho",
  "/inventory/import": "Nhập kho",
  "/inventory/export": "Xuất kho",
  "/inventory/transfer": "Luân chuyển kho",
  "/inventory/balance": "Báo cáo tồn kho",
  "/sales/customers": "Khách hàng",
  "/sales/orders": "Đơn hàng",
  "/sales/reports": "Báo cáo bán hàng",
  "/purchasing/suppliers": "Nhà cung cấp",
  "/purchasing/orders": "Đơn đặt hàng",
  "/finance/categories": "Danh mục tài chính",
  "/finance/bank-accounts": "Tài khoản",
  "/finance/cashbooks": "Sổ quỹ",
  "/finance/debts": "Công nợ",
  "/finance/reports": "Báo cáo tài chính",
};

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const titlePage = useSiteTitleStore((state) => state.title);
  const router = useRouter();
  const pathname = usePathname();
  const { can, loading: permLoading } = usePermissions();
  const { themeName, setThemeName } = useTheme();
  const { token } = theme.useToken();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const isMobile = useIsMobile();
  const [openKeys, setOpenKeys] = useState<string[]>([]);

  // Fetch current user
  const { data: meData, isLoading: meLoading } = useQuery({
    queryKey: ["me"],
    queryFn: async () => {
      const res = await fetch("/api/auth/me");
      return res.json();
    },
    retry: false,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

  const loading = meLoading || permLoading;
  const user: User | null = meData?.data?.user || null;

  // Validate session định kỳ (mỗi 5 phút) - chỉ chạy khi đã có user
  const { data: sessionValid } = useQuery({
    queryKey: ["validate-session"],
    queryFn: async () => {
      const res = await fetch("/api/auth/validate-session");
      return res.json();
    },
    staleTime: 5 * 60 * 1000, // Cache
    refetchInterval: 5 * 60 * 1000, // 5 phút
    retry: false,
    enabled: !!user, // Chỉ validate khi đã có user
  });

  // Redirect if not authenticated or session invalid
  useEffect(() => {
    if (meData && !meData.success) {
      router.push("/login");
    }
    // Session bị vô hiệu hóa (đăng xuất từ thiết bị khác hoặc đổi mật khẩu)
    // Chỉ redirect khi có response và không thành công (401/403), không redirect khi lỗi server (500)
    if (sessionValid && !sessionValid.success && sessionValid.error) {
      router.push("/login");
    }
  }, [meData, sessionValid, router]);

  // Memoize logout handler
  const handleLogout = useCallback(async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    queryClient.resetQueries();
    router.push("/login");
  }, [router]);

  // Memoize breadcrumb title getter
  const getBreadcrumbTitle = useCallback((path: string) => {
    if (BREADCRUMB_MAP[path]) return BREADCRUMB_MAP[path];
    for (const [key, value] of Object.entries(BREADCRUMB_MAP)) {
      if (path.startsWith(key + "/")) return value;
    }
    return path.split("/").pop() || "Trang";
  }, []);

  // Memoize menu items - chỉ tính toán lại khi can thay đổi
  const menuItems = useMemo(() => {
    return allMenuItems
      .map((item) => {
        if (item.children) {
          const filteredChildren = item.children.filter(
            (child) => !child.permission || can(child.permission, "view")
          );
          if (filteredChildren.length === 0) return null;
          return { ...item, children: filteredChildren };
        }
        if (item.permission && !can(item.permission, "view")) return null;
        return item;
      })
      .filter((item): item is NonNullable<typeof item> => item !== null);
  }, [can]);

  // Memoize antd menu items
  const antdMenuItems: MenuProps["items"] = useMemo(() => {
    const ellipsisStyle: React.CSSProperties = {
      display: "inline-block",
      maxWidth: 140,
      overflow: "hidden",
      textOverflow: "ellipsis",
      whiteSpace: "nowrap",
      verticalAlign: "middle",
    };

    return menuItems.map((item, idx) => {
      if (item.href) {
        return {
          key: item.href,
          icon: item.icon,
          label: (
            <Link href={item.href}>
              <span style={ellipsisStyle}>{item.title}</span>
            </Link>
          ),
        };
      }

      return {
        key: `group-${idx}`,
        icon: item.icon,
        label: <span style={ellipsisStyle}>{item.title}</span>,
        children: item.children?.map((child) => ({
          key: child.href,
          label: (
            <Link href={child.href}>
              <span style={ellipsisStyle}>{child.title}</span>
            </Link>
          ),
        })),
      };
    });
  }, [menuItems]);

  // Normalize key helper
  const normalizeKey = useCallback((key?: React.Key) => {
    if (!key) return "";
    const withoutQuery = String(key).split("?")[0];
    return withoutQuery === "/" ? "/" : withoutQuery.replace(/\/$/, "");
  }, []);

  // Memoize selected key
  const selectedKeys = useMemo(() => {
    const normPath = pathname === "/" ? "/" : pathname.replace(/\/$/, "");
    let bestKey: string | null = null;
    let bestLen = 0;

    for (const item of antdMenuItems || []) {
      if (item && "children" in item && item.children) {
        for (const child of item.children) {
          if (!child || !("key" in child)) continue;
          const key = normalizeKey(child.key);
          if (!key) continue;
          if (normPath === key || normPath.startsWith(key + "/")) {
            if (key.length > bestLen) {
              bestLen = key.length;
              bestKey = String(child.key);
            }
          }
        }
      }

      if (
        item &&
        "key" in item &&
        typeof item.key === "string" &&
        !item.key.startsWith("group-")
      ) {
        const key = normalizeKey(item.key);
        if (!key) continue;
        if (normPath === key || normPath.startsWith(key + "/")) {
          if (key.length > bestLen) {
            bestLen = key.length;
            bestKey = item.key as string;
          }
        }
      }
    }

    return bestKey ? [bestKey] : [];
  }, [pathname, antdMenuItems, normalizeKey]);

  // Update openKeys when pathname changes
  useEffect(() => {
    const normPath = pathname === "/" ? "/" : pathname.replace(/\/$/, "");
    const keys: string[] = [];

    for (const item of antdMenuItems || []) {
      if (!item || !("children" in item) || !item.children) continue;
      const hasActiveChild = item.children.some((child) => {
        if (!child || !("key" in child)) return false;
        const key = normalizeKey(child.key);
        return key && (normPath === key || normPath.startsWith(key + "/"));
      });
      if (hasActiveChild && item.key) keys.push(String(item.key));
    }

    setOpenKeys(keys);
  }, [pathname, antdMenuItems, normalizeKey]);

  // Memoize breadcrumb items
  const breadcrumbItems = useMemo(() => {
    const items = [
      {
        title: (
          <Link href="/dashboard">
            <span className="flex gap-2 items-center">
              <DashboardOutlined /> <span>Dashboard</span>
            </span>
          </Link>
        ),
      },
    ];

    if (pathname !== "/dashboard") {
      items.push({
        title: <span>{getBreadcrumbTitle(pathname)}</span>,
      });
    }

    if (titlePage) {
      items.push({
        title: <Text strong>{titlePage}</Text>,
      });
    }

    return items;
  }, [pathname, titlePage, getBreadcrumbTitle]);

  // Memoize user menu items
  const userMenuItems: MenuProps["items"] = useMemo(() => [
    { key: "color", label: "Màu chủ đề", type: "group" as const },
    {
      key: "default",
      label: <ItemColorTheme isChecked={themeName === "default"} themeColor={themeColors.default.primary} title="Cam" />,
      onClick: () => setThemeName("default"),
    },
    {
      key: "blue",
      label: <ItemColorTheme isChecked={themeName === "blue"} themeColor={themeColors.blue.primary} title="Xanh" />,
      onClick: () => setThemeName("blue"),
    },
    {
      key: "yellow",
      label: <ItemColorTheme isChecked={themeName === "yellow"} themeColor={themeColors.yellow.primary} title="Vàng" />,
      onClick: () => setThemeName("yellow"),
    },
    {
      key: "pink",
      label: <ItemColorTheme isChecked={themeName === "pink"} themeColor={themeColors.pink.primary} title="Hồng" />,
      onClick: () => setThemeName("pink"),
    },
    { type: "divider" as const },
    {
      key: "sessions",
      icon: <DesktopOutlined />,
      label: "Quản lý thiết bị",
      onClick: () => router.push("/account/sessions"),
    },
    {
      key: "logout",
      icon: <LogoutOutlined />,
      label: "Đăng xuất",
      onClick: handleLogout,
      danger: true,
    },
  ], [themeName, setThemeName, handleLogout, router]);

  // Handle menu open change
  const handleOpenChange = useCallback((keys: string[]) => {
    const latestKey = keys.find((key) => !openKeys.includes(key));
    setOpenKeys(latestKey ? [latestKey] : []);
  }, [openKeys]);

  // Handle sidebar toggle
  const toggleSidebar = useCallback(() => {
    setSidebarOpen((prev) => !prev);
  }, []);

  // Handle mobile menu close
  const closeMobileSidebar = useCallback(() => {
    setSidebarOpen(false);
  }, []);

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <LoaderApp />
      </div>
    );
  }

  return (
    <Layout style={{ minHeight: "100vh" }}>
      {!isMobile && (
        <Sider
          trigger={null}
          collapsible
          collapsed={!sidebarOpen}
          width={240}
          style={{
            overflow: "auto",
            height: "100vh",
            position: "fixed",
            left: 0,
            top: 0,
            bottom: 0,
          }}
        >
          <div style={{ height: 64, display: "flex", alignItems: "center", justifyContent: "center" }}>
            {sidebarOpen ? (
              <Text style={{ color: token.colorPrimary, fontSize: 18, fontWeight: "bold" }}>
                POS System
              </Text>
            ) : (
              <span style={{ fontSize: 24 }} className="text-primary font-bold">P</span>
            )}
          </div>
          <Menu
            mode="inline"
            selectedKeys={selectedKeys}
            openKeys={openKeys}
            onOpenChange={handleOpenChange}
            items={antdMenuItems}
          />
        </Sider>
      )}

      {isMobile && (
        <Drawer
          title={<Text style={{ color: token.colorPrimary, fontSize: 18, fontWeight: "bold" }}>POS System</Text>}
          placement="left"
          onClose={closeMobileSidebar}
          open={sidebarOpen}
          closable={true}
          width={240}
        >
          <div style={{ display: "flex", flexDirection: "column", height: "100%", justifyContent: "space-between" }}>
            <Menu
              mode="inline"
              selectedKeys={selectedKeys}
              openKeys={openKeys}
              onOpenChange={handleOpenChange}
              items={antdMenuItems}
              onClick={closeMobileSidebar}
            />
            <div style={{ padding: 12, display: "flex", justifyContent: "center" }}>
              <Dropdown menu={{ items: [{ key: "user-info", label: <div className="flex flex-col items-center p-2"><Text strong>{user?.fullName}</Text><Text type="secondary" style={{ fontSize: 12 }}>{user?.roleCode}</Text></div> }, ...userMenuItems] }} placement="topLeft">
                <div style={{ display: "flex", alignItems: "center", cursor: "pointer" }}>
                  <Avatar icon={<UserOutlined />} style={{ marginRight: 8, backgroundColor: token.colorPrimary }} />
                  <div className="flex flex-col">
                    <Text strong>{user?.fullName}</Text>
                    <Text type="secondary" style={{ fontSize: 12 }}>{user?.roleCode}</Text>
                  </div>
                </div>
              </Dropdown>
            </div>
          </div>
        </Drawer>
      )}

      <Layout style={{ marginLeft: !isMobile && sidebarOpen ? 240 : isMobile ? 0 : 80, transition: "margin-left 0.2s" }}>
        <Header
          style={{
            padding: "0 24px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            borderBottom: `1px solid ${token.colorBorder}`,
            borderLeft: `1px solid ${token.colorBorder}`,
            position: "sticky",
            top: 0,
            zIndex: 20,
          }}
        >
          <div className="flex gap-3 items-center">
            <Button type="text" onClick={toggleSidebar} icon={sidebarOpen ? <MenuFoldOutlined /> : <MenuUnfoldOutlined />} />
            <Breadcrumb items={breadcrumbItems} />
          </div>

          {!isMobile && (
            <Dropdown menu={{ items: userMenuItems }} placement="bottomRight">
              <div style={{ display: "flex", alignItems: "center", cursor: "pointer" }}>
                <Avatar icon={<UserOutlined />} style={{ marginRight: 8, backgroundColor: token.colorPrimary }} />
                <div className="flex flex-col">
                  <Text strong>{user?.fullName}</Text>
                  <Text type="secondary" style={{ fontSize: 12 }}>{user?.roleCode}</Text>
                </div>
              </div>
            </Dropdown>
          )}
        </Header>

        <Content
          style={{
            margin: "10px",
            padding: 20,
            background: token.colorBgContainer,
            minHeight: 280,
            borderRadius: token.borderRadius,
          }}
        >
          <FastPageTransition>{children}</FastPageTransition>
        </Content>
      </Layout>
    </Layout>
  );
}
