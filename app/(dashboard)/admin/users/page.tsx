"use client";

import CommonTable from "@/components/CommonTable";
import UserDetailDrawer from "@/components/users/UserDetailDrawer";
import UserFormModal, {
    type UserFormValues,
} from "@/components/users/UserFormModal";
import WrapperContent from "@/components/WrapperContent";
import useColumn from "@/hooks/useColumn";
import { useFileExport } from "@/hooks/useFileExport";
import { useFileImport } from "@/hooks/useFileImport";
import useFilter from "@/hooks/useFilter";
import { usePermissions } from "@/hooks/usePermissions";
import {
    useCreateUser,
    useDeleteUser,
    useResetPassword,
    useUpdateUser,
    useUsers
} from "@/hooks/useUserQuery";
import { branchService, departmentService, roleService } from "@/services/commonService";
import type { User } from "@/services/userService";
import {
    DeleteOutlined,
    DownloadOutlined,
    EditOutlined,
    LockOutlined,
    MoreOutlined,
    PlusOutlined,
    UnlockOutlined,
    UploadOutlined,
} from "@ant-design/icons";
import { useQuery } from "@tanstack/react-query";
import type { TableColumnsType } from "antd";
import { App, Button, Dropdown, Tag } from "antd";
import { useState } from "react";

export default function UsersPage() {
  const { can } = usePermissions();
  const { reset, applyFilter, updateQueries, query, pagination, handlePageChange } = useFilter();

  // React Query hooks
  const { data: users = [], isLoading, isFetching } = useUsers();
  const { data: roles = [] } = useQuery({
    queryKey: ["roles"],
    queryFn: roleService.getAll,
    staleTime: 10 * 60 * 1000, // Cache
  });
  const { data: branches = [] } = useQuery({
    queryKey: ["branches"],
    queryFn: branchService.getAll,
    staleTime: 10 * 60 * 1000, // Cache
  });
  const { data: departments = [] } = useQuery({
    queryKey: ["departments"],
    queryFn: departmentService.getAll,
    staleTime: 10 * 60 * 1000, // Cache
  });
  const deleteMutation = useDeleteUser();
  const createMutation = useCreateUser();
  const updateMutation = useUpdateUser();
  const resetPasswordMutation = useResetPassword();

  // Apply filter to get filtered users
  const filteredUsers = applyFilter(users);

  // State for drawer and modal
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [modalMode, setModalMode] = useState<"create" | "edit">("create");
  const { modal } = App.useApp();

  const handleView = (user: User) => {
    setSelectedUser(user);
    setDrawerVisible(true);
  };

  const handleCreate = () => {
    setModalMode("create");
    setSelectedUser(null);
    setModalVisible(true);
  };

  const handleEdit = (user: User) => {
    setModalMode("edit");
    setSelectedUser(user);
    setModalVisible(true);
  };

  const handleDelete = async (id: number) => {
    modal.confirm({
      title: "Xác nhận xóa",
      content: "Bạn có chắc muốn xóa người dùng này?",
      okText: "Xóa",
      cancelText: "Hủy",
      okButtonProps: { danger: true },
      onOk: () => deleteMutation.mutate(id),
    });
  };

  const handleResetPassword = async (id: number) => {
    modal.confirm({
      title: "Xác nhận reset mật khẩu",
      content: "Mật khẩu sẽ được reset về mặc định (1). Bạn có chắc chắn?",
      okText: "Reset",
      cancelText: "Hủy",
      onOk: () => resetPasswordMutation.mutate(id),
    });
  };

  const handleModalSubmit = (values: UserFormValues) => {
    if (modalMode === "create") {
      createMutation.mutate(
        values as unknown as Parameters<typeof createMutation.mutate>[0],
        { onSuccess: () => setModalVisible(false) }
      );
    } else if (selectedUser) {
      const updatePayload = {
        fullName: values.fullName,
        email: values.email,
        phone: values.phone,
        branchId: values.branchId,
        branchIds: values.branchIds,
        departmentId: values.departmentId,
        roleId: values.roleId,
        isActive: !!values.isActive,
      };

      updateMutation.mutate(
        { id: selectedUser.id, data: updatePayload },
        { onSuccess: () => setModalVisible(false) }
      );
    }
  };



  // Export logic
  const exportColumns = [
    { title: "Mã nhân viên", dataIndex: "userCode", key: "userCode" },
    { title: "Họ tên", dataIndex: "fullName", key: "fullName" },
    { title: "Tên đăng nhập", dataIndex: "username", key: "username" },
    { title: "Mật khẩu", dataIndex: "password", key: "password" },
    { title: "Email", dataIndex: "email", key: "email" },
    { title: "Số điện thoại", dataIndex: "phone", key: "phone" },
    { title: "Phòng ban", dataIndex: "departmentName", key: "departmentName" },
    { title: "Vai trò", dataIndex: "roleName", key: "roleName" },
    { title: "Chi nhánh", dataIndex: "branchNames", key: "branchNames" },
    { title: "Trạng thái", dataIndex: "statusLabel", key: "statusLabel" },
  ];

  const { exportToXlsx } = useFileExport(exportColumns);
  const { openFileDialog } = useFileImport();

  const handleExportExcel = () => {
    const dataToExport = filteredUsers.map(item => ({
      ...item,
      password: "", // Empty for security
      statusLabel: item.isActive ? "Hoạt động" : "Khóa",
      branchNames: item.branches?.map((b: any) => b.branchName).join(", ") || item.branchName || "-",
    }));
    exportToXlsx(dataToExport, "danh-sach-nhan-vien");
  };

  const handleImportExcel = () => {
    if (branches.length === 0 || roles.length === 0) {
      modal.warning({ title: "Thông báo", content: "Dữ liệu chi nhánh hoặc vai trò đang được tải, vui lòng thử lại sau giây lát." });
      return;
    }
    openFileDialog(
      async (data) => {
        try {
          let count = 0;
          for (const row of data) {
            // Find departmentId
            const dept = departments.find(d => d.departmentName === row["Phòng ban"]);
            // Find roleId
            const role = roles.find(r => r.roleName === row["Vai trò"]);
            // Map branches
            const branchNamesStr = row["Chi nhánh"] || "";
            const branchNames = branchNamesStr.split(",").map((s: string) => s.trim());
            const bIds = branches
              .filter(b => branchNames.includes(b.branchName))
              .map(b => b.id);

            const payload = {
              userCode: row["Mã nhân viên"],
              username: row["Tên đăng nhập"],
              password: row["Mật khẩu"] || "123456",
              fullName: row["Họ tên"],
              email: row["Email"],
              phone: row["Số điện thoại"],
              branchIds: bIds.length > 0 ? bIds : (branches.length > 0 ? [branches[0].id] : []),
              departmentId: dept?.id,
              roleId: role?.id || (roles.length > 0 ? roles[0].id : 0),
              isActive: row["Trạng thái"] !== "Khóa",
            };

            await createMutation.mutateAsync(payload as any);
            count++;
          }
          modal.success({ title: "Thành công", content: `Đã nhập thành công ${count} người dùng` });
        } catch (err: any) {
          modal.error({ title: "Lỗi", content: "Có lỗi khi nhập dữ liệu: " + (err.message || "Lỗi không xác định") });
        }
      },
      (err) => console.error(err)
    );
  };

  const columnsAll: TableColumnsType<User> = [
    {
      title: "Mã",
      dataIndex: "userCode",
      key: "userCode",
      width: 120,
      fixed: "left",
    },
    {
      title: "Họ tên",
      dataIndex: "fullName",
      key: "fullName",
      width: 200,
    },
    {
      title: "Tên đăng nhập",
      dataIndex: "username",
      key: "username",
      width: 150,
    },
    {
      title: "Chi nhánh",
      dataIndex: "branches",
      key: "branches",
      width: 200,
      render: (branches: any[], record: User) => {
        if (branches && branches.length > 0) {
          return branches.map(b => (
            <Tag key={b.id} style={{ marginRight: 4, marginBottom: 4 }}>
              {b.branchName}
            </Tag>
          ));
        }
        return record.branchName ? <Tag>{record.branchName}</Tag> : null;
      }
    },
    {
      title: "Phòng ban",
      dataIndex: "departmentName",
      key: "departmentName",
      width: 150,
    },
    { title: "Vai trò", dataIndex: "roleName", key: "roleName", width: 150 },
    {
      title: "Trạng thái",
      dataIndex: "isActive",
      key: "isActive",
      width: 120,
      render: (isActive: boolean) => (
        <Tag
          color={isActive ? "success" : "error"}
          icon={isActive ? <UnlockOutlined /> : <LockOutlined />}
        >
          {isActive ? "Hoạt động" : "Khóa"}
        </Tag>
      ),
    },
    {
      title: "Thao tác",
      key: "action",
      width: 100,
      fixed: "right",
      render: (_: unknown, record: User) => {
        const menuItems = [];

        if (can("admin.users", "edit")) {
          menuItems.push({
            key: "edit",
            label: "Sửa",
            icon: <EditOutlined />,
            onClick: () => handleEdit(record),
          });
          menuItems.push({
            key: "reset-password",
            label: "Reset MK",
            icon: <LockOutlined />,
            onClick: () => handleResetPassword(record.id),
          });
        }

        if (can("admin.users", "delete")) {
          menuItems.push({
            key: "delete",
            label: "Xóa",
            icon: <DeleteOutlined />,
            onClick: () => handleDelete(record.id),
          });
        }

        if (menuItems.length === 0) return null;

        return (
          <Dropdown
            menu={{ items: menuItems }}
            trigger={["click"]}
            placement="bottomLeft"
          >
            <Button type="text" icon={<MoreOutlined />} size="small" />
          </Dropdown>
        );
      },
    },
  ];

  const { columnsCheck, updateColumns, resetColumns, getVisibleColumns } =
    useColumn({ defaultColumns: columnsAll });

  return (
    <>
      <WrapperContent<User>
        isNotAccessible={!can("admin.users", "view")}
        isLoading={isLoading}
        header={{
          buttonEnds: can("admin.users", "create")
            ? [
              {
                type: "primary",
                name: "Thêm",
                onClick: handleCreate,
                icon: <PlusOutlined />,
              },
              {
                type: "default",
                name: "Xuất Excel",
                onClick: handleExportExcel,
                icon: <DownloadOutlined />,
              },
              {
                type: "default",
                name: "Nhập Excel",
                onClick: handleImportExcel,
                icon: <UploadOutlined />,
              },
            ]
            : undefined,
          searchInput: {
            placeholder: "Tìm kiếm người dùng",
            filterKeys: ["fullName", "username", "branchName", "roleName"],
            suggestions: {
              apiEndpoint: "/api/admin/users",
              labelKey: "fullName",
              valueKey: "username",
              descriptionKey: "roleName",
            },
          },
          filters: {
            fields: [
              {
                name: "branchId",
                label: "Chi nhánh",
                type: "select",
                options: branches.map((b: any) => ({
                  label: b.branchName,
                  value: b.id.toString(),
                })),
              },
              {
                name: "roleId",
                label: "Vai trò",
                type: "select",
                options: roles.map((r: any) => ({
                  label: r.roleName,
                  value: r.id.toString(),
                })),
              },
              {
                name: "departmentId",
                label: "Phòng ban",
                type: "select",
                options: departments.map((d) => ({
                  label: d.departmentName,
                  value: d.id.toString(),
                })),
              },
              {
                name: "isActive",
                label: "Trạng thái",
                type: "select",
                options: [
                  { label: "Hoạt động", value: "true" },
                  { label: "Khóa", value: "false" },
                ],
              },
            ],
            onApplyFilter: (arr) => updateQueries(arr),
            onReset: () => reset(),
            query,
          },
          columnSettings: {
            columns: columnsCheck,
            onChange: (cols) => updateColumns(cols),
            onReset: () => resetColumns(),
          },
        }}
      >
        <CommonTable
          pagination={{ ...pagination, onChange: handlePageChange }}
          columns={getVisibleColumns()}
          dataSource={filteredUsers}
          loading={isLoading || deleteMutation.isPending || isFetching}
          paging
          rank
          onRowClick={handleView}
        />
      </WrapperContent>

      <UserDetailDrawer
        open={drawerVisible}
        user={selectedUser}
        onClose={() => setDrawerVisible(false)}
        onEdit={(u) => {
          setDrawerVisible(false);
          handleEdit(u);
        }}
        onDelete={(id) => {
          setDrawerVisible(false);
          handleDelete(id);
        }}
        canEdit={can("admin.users", "edit")}
        canDelete={can("admin.users", "delete")}
      />

      <UserFormModal
        open={modalVisible}
        mode={modalMode}
        user={selectedUser}
        roles={roles}
        branches={branches}
        departments={departments}
        confirmLoading={createMutation.isPending || updateMutation.isPending}
        onCancel={() => setModalVisible(false)}
        onSubmit={handleModalSubmit}
      />
    </>
  );
}
