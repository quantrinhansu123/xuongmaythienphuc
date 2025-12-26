"use client";

import CommonTable from "@/components/CommonTable";
import WrapperContent from "@/components/WrapperContent";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { TableColumnsType } from "antd";
import { Alert, App, Card, Checkbox } from "antd";
import { useParams } from "next/navigation";
import { useState } from "react";

interface Permission {
  id: number;
  permissionCode: string;
  permissionName: string;
  module: string;
  description?: string;
  canView: boolean;
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
}

interface PermissionResponse {
  roleName: string;
  permissions: Permission[];
  isAdmin: boolean;
}

interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

const fetchPermissions = async (
  roleId: string
): Promise<PermissionResponse> => {
  const res = await fetch(`/api/admin/roles/${roleId}/permissions`);
  const data: ApiResponse<PermissionResponse> = await res.json();
  if (!data.success) {
    throw new Error(data.error || "Failed to fetch permissions");
  }
  return data.data!;
};

const savePermissions = async ({
  roleId,
  permissions,
}: {
  roleId: string;
  permissions: Permission[];
}): Promise<void> => {
  const res = await fetch(`/api/admin/roles/${roleId}/permissions`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ permissions }),
  });
  const data: ApiResponse = await res.json();
  if (!data.success) {
    throw new Error(data.error || "Failed to save permissions");
  }
};

export default function RolePermissionsPage() {
  const params = useParams();
  const roleId = params.id as string;
  const { message } = App.useApp();
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: ["role-permissions", roleId],
    queryFn: () => fetchPermissions(roleId),
    staleTime: 30 * 60 * 1000, // Cache
  });

  const mutation = useMutation({
    mutationFn: savePermissions,
    onSuccess: () => {
      message.success("Lưu phân quyền thành công");
      queryClient.invalidateQueries({ queryKey: ["role-permissions", roleId] });
      setModifiedPermissions({}); // Reset modifications after save
    },
    onError: (error: Error) => {
      message.error("Lỗi khi lưu phân quyền: " + error.message);
    },
  });

  const [modifiedPermissions, setModifiedPermissions] = useState<
    Record<
      number,
      Partial<
        Pick<Permission, "canView" | "canCreate" | "canEdit" | "canDelete">
      >
    >
  >({});

  const isAdminRole = data?.isAdmin || false;

  const handleToggle = (
    permissionId: number,
    field: keyof Pick<
      Permission,
      "canView" | "canCreate" | "canEdit" | "canDelete"
    >
  ) => {
    const currentPerm = data?.permissions.find((p) => p.id === permissionId);
    if (!currentPerm) return;
    const currentValue =
      modifiedPermissions[permissionId]?.[field] ?? currentPerm[field];
    setModifiedPermissions((prev) => ({
      ...prev,
      [permissionId]: {
        ...prev[permissionId],
        [field]: !currentValue,
      },
    }));
  };

  const handleSave = () => {
    if (isAdminRole) {
      message.warning(
        "ADMIN có toàn quyền tự động - không cần lưu vào database"
      );
      return;
    }
    const permissionsToSave =
      data?.permissions.map((p) => ({
        ...p,
        ...modifiedPermissions[p.id],
      })) || [];
    mutation.mutate({ roleId, permissions: permissionsToSave });
  };

  const mergedPermissions =
    data?.permissions.map((p) => ({
      ...p,
      ...modifiedPermissions[p.id],
    })) || [];

  const groupedPermissions = mergedPermissions.reduce((acc, perm) => {
    if (!acc[perm.module]) {
      acc[perm.module] = [];
    }
    acc[perm.module].push(perm);
    return acc;
  }, {} as Record<string, Permission[]>);

  const moduleNames: Record<string, string> = {
    admin: "Quản trị",
    products: "Sản phẩm",
    inventory: "Kho",
    sales: "Bán hàng",
    purchasing: "Mua hàng",
    finance: "Tài chính",
  };

  const columns: TableColumnsType<Permission> = [
    {
      title: "Chức năng",
      dataIndex: "permissionName",
      width: 200,
      fixed: "left",
      key: "permissionName",
      render: (text, record) => (
        <div>
          <div className="font-medium">{text}</div>
          <div className="text-xs text-gray-500">{record.description}</div>
        </div>
      ),
    },
    {
      title: "Xem",
      dataIndex: "canView",
      key: "canView",
      align: "center",
      render: (checked, record) => (
        <Checkbox
          checked={checked}
          onChange={() => handleToggle(record.id, "canView")}
          disabled={isAdminRole}
        />
      ),
    },
    {
      title: "Tạo",
      dataIndex: "canCreate",
      key: "canCreate",
      align: "center",
      render: (checked, record) => (
        <Checkbox
          checked={checked}
          onChange={() => handleToggle(record.id, "canCreate")}
          disabled={isAdminRole}
        />
      ),
    },
    {
      title: "Sửa",
      dataIndex: "canEdit",
      key: "canEdit",
      align: "center",
      render: (checked, record) => (
        <Checkbox
          checked={checked}
          onChange={() => handleToggle(record.id, "canEdit")}
          disabled={isAdminRole}
        />
      ),
    },
    {
      title: "Xóa",
      dataIndex: "canDelete",
      key: "canDelete",
      align: "center",
      render: (checked, record) => (
        <Checkbox
          checked={checked}
          onChange={() => handleToggle(record.id, "canDelete")}
          disabled={isAdminRole}
        />
      ),
    },
    {
      title: "ALL",
      key: "all",
      align: "center",
      render: (_, record) => {
        const allChecked =
          record.canView &&
          record.canCreate &&
          record.canEdit &&
          record.canDelete;
        return (
          <Checkbox
            checked={allChecked}
            onChange={(e) => {
              const checked = e.target.checked;
              setModifiedPermissions((prev) => ({
                ...prev,
                [record.id]: {
                  canView: checked,
                  canCreate: checked,
                  canEdit: checked,
                  canDelete: checked,
                },
              }));
            }}
            disabled={isAdminRole}
          />
        );
      },
    },
  ];

  const header = {
    buttonBackTo: "/admin/roles",
    refetchDataWithKeys: ["role-permissions", roleId],
    buttonEnds: [
      {
        can: !isAdminRole,
        isLoading: mutation.isPending,
        type: "primary" as const,
        onClick: handleSave,
        name: "Lưu phân quyền",
        icon: null,
      },
    ],
  };

  return (
    <WrapperContent
      title={`Phân quyền: ${data?.roleName || ""}`}
      header={header}
      isLoading={isLoading}
      isEmpty={mergedPermissions.length === 0 || !!error}
    >
      {isAdminRole && (
        <Alert
          title="Lưu ý: ADMIN có toàn quyền tự động - không cần lưu vào database"
          type="warning"
          showIcon
          className="mb-4"
        />
      )}

      {Object.entries(groupedPermissions).map(([module, perms]) => (
        <Card
          key={module}
          style={{
            marginBottom: 20,
          }}
          hoverable
          title={moduleNames[module] || module}
        >
          <CommonTable

            sortable={false}
            dataSource={perms}
            columns={columns}
            loading={false}
            paging={false}
            pagination={{
              current: 1,
              limit: 10,
              onChange: () => {},
            }}
          />
        </Card>
      ))}
    </WrapperContent>
  );
}
