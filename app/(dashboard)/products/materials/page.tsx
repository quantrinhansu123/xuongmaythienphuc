"use client";

import CommonTable from "@/components/CommonTable";
import TableActions from "@/components/TableActions";
import WrapperContent from "@/components/WrapperContent";
import useColumn from "@/hooks/useColumn";
import { useBranches } from "@/hooks/useCommonQuery";
import useFilter from "@/hooks/useFilter";
import { usePermissions } from "@/hooks/usePermissions";
import { PropRowDetails } from "@/types/table";
import {
    DownloadOutlined,
    PlusOutlined,
    UploadOutlined,
} from "@ant-design/icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
    App,
    Descriptions,
    Form,
    Input,
    Modal,
    Select,
    Tag,
    type TableColumnsType as AntdTableColumnsType,
} from "antd";
import { useState } from "react";

interface Material {
  id: number;
  materialCode: string;
  materialName: string;
  unit: string;
  description?: string;
  branchName: string;
}

const UNIT_OPTIONS = [
  {
    label: "Độ dài",
    options: [
      { label: "mét (m)", value: "mét" },
      { label: "centimet (cm)", value: "cm" },
      { label: "milimét (mm)", value: "mm" },
    ],
  },
  {
    label: "Khối lượng",
    options: [
      { label: "kilogram (kg)", value: "kg" },
      { label: "gram (g)", value: "gram" },
      { label: "tấn", value: "tấn" },
    ],
  },
  {
    label: "Thể tích",
    options: [
      { label: "lít (l)", value: "lít" },
      { label: "mililít (ml)", value: "ml" },
    ],
  },
  {
    label: "Số lượng",
    options: [
      { label: "cái", value: "cái" },
      { label: "chiếc", value: "chiếc" },
      { label: "bộ", value: "bộ" },
      { label: "hộp", value: "hộp" },
      { label: "thùng", value: "thùng" },
      { label: "cuộn", value: "cuộn" },
      { label: "tấm", value: "tấm" },
      { label: "viên", value: "viên" },
    ],
  },
];

export default function MaterialsPage() {
  // Permission hook
  const { can } = usePermissions();
  const queryClient = useQueryClient();
  const { message, modal } = App.useApp();

  // Modal and form state
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState<Material | null>(null);
  const [form] = Form.useForm();

  // Filter hook
  const {
    query,
    pagination,
    updateQueries,
    reset,
    applyFilter,
    handlePageChange,
  } = useFilter();

  // Column visibility hook
  const defaultColumns: AntdTableColumnsType<Material> = [
    {
      title: "Mã NVL",
      dataIndex: "materialCode",
      key: "materialCode",
      width: 120,
    },
    {
      title: "Tên nguyên vật liệu",
      dataIndex: "materialName",
      key: "materialName",
      width: 180,
      fixed: "left" as const,
    },
    {
      title: "Đơn vị",
      dataIndex: "unit",
      key: "unit",
      width: 100,
      render: (unit: string) => <Tag color="blue">{unit}</Tag>,
    },
    {
      title: "Mô tả",
      dataIndex: "description",
      key: "description",
      render: (val: string | undefined) => val || "-",
    },
    {
      title: "Chi nhánh",
      dataIndex: "branchName",
      key: "branchName",
      width: 180,
    },
    {
      title: "Thao tác",
      key: "actions",
      width: 150,
      fixed: "right" as const,
      render: (_: unknown, record: Material) => (
        <TableActions
          canView={true}
          canEdit={can("products.materials", "edit")}
          canDelete={can("products.materials", "delete")}
          onView={() => handleView(record)}
          onEdit={() => handleEdit(record)}
          onDelete={() => onConfirmDelete(record.id)}
        />
      ),
    },
  ];

  const { columnsCheck, updateColumns, resetColumns, getVisibleColumns } =
    useColumn({ defaultColumns });

  // Data hooks
  const { data: branches = [] } = useBranches();
  const {
    data: materials = [],
    isLoading,
    isFetching,
  } = useQuery<Material[]>({
    queryKey: ["materials"],
    queryFn: async () => {
      const res = await fetch("/api/products/materials");
      const body = await res.json();
      return body.success ? body.data : [];
    },
  });

  // Mutations
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/products/materials/${id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || "Có lỗi xảy ra");
      return data;
    },
    onSuccess: () => {
      message.success("Xóa thành công");
      queryClient.invalidateQueries({ queryKey: ["materials"] });
    },
    onError: (error: Error) => {
      message.error(error.message);
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (values: Record<string, unknown>) => {
      const url = editingItem
        ? `/api/products/materials/${editingItem.id}`
        : "/api/products/materials";
      const method = editingItem ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || "Có lỗi xảy ra");
      return data;
    },
    onSuccess: () => {
      message.success(editingItem ? "Cập nhật thành công" : "Tạo thành công");
      setShowModal(false);
      queryClient.invalidateQueries({ queryKey: ["materials"] });
    },
    onError: (error: Error) => {
      message.error(error.message);
    },
  });

  // Event handlers
  const handleCreate = () => {
    setEditingItem(null);
    form.resetFields();
    setShowModal(true);
  };

  const handleEdit = (item: Material) => {
    setEditingItem(item);
    form.setFieldsValue(item);
    setShowModal(true);
  };

  const handleView = (item: Material) => {
    setEditingItem(item);
  };

  const onConfirmDelete = (id: number) => {
    modal.confirm({
      title: "Xác nhận xóa",
      content: "Bạn có chắc chắn muốn xóa nguyên vật liệu này?",
      okText: "Xóa",
      okType: "danger",
      cancelText: "Hủy",
      onOk: () => {
        deleteMutation.mutate(id);
      },
    });
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      saveMutation.mutate(values);
    } catch {
      // validation error
    }
  };

  // Apply client-side filtering
  const filteredMaterials = applyFilter(materials);

  // Export handler (placeholder)
  const handleExportExcel = () => {
    // TODO: Implement export functionality
  };

  const columns: AntdTableColumnsType<Material> = getVisibleColumns();

  return (
    <>
      <WrapperContent<Material>
        title="Nguyên vật liệu"
        isNotAccessible={!can("products.materials", "view")}
        isLoading={isLoading || isFetching}
        isEmpty={!materials?.length}
        header={{
          buttonBackTo: "/products/items",
          refetchDataWithKeys: ["materials"],
          buttonEnds: can("products.materials", "create")
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
                  onClick: () => {},
                  icon: <UploadOutlined />,
                },
              ]
            : undefined,
          searchInput: {
            placeholder: "Tìm kiếm nguyên vật liệu",
            filterKeys: ["materialName", "materialCode", "description", "unit"],
            suggestions: {
              apiEndpoint: "/api/products/materials",
              labelKey: "materialName",
              valueKey: "materialCode",
              descriptionKey: "unit",
            },
          },
          filters: {
            fields: [
              {
                type: "select",
                label: "Đơn vị",
                name: "unit",
                options: UNIT_OPTIONS.flatMap((group) => group.options),
              },
              {
                type: "select" as const,
                name: "branchId",
                label: "Chi nhánh",
                options: branches.map((branch) => ({
                  label: branch.branchName,
                  value: branch.id.toString(),
                })),
              },
            ],
            query,
            onApplyFilter: updateQueries,
            onReset: reset,
          },
          columnSettings: {
            columns: columnsCheck,
            onChange: updateColumns,
            onReset: resetColumns,
          },
        }}
      >
        <CommonTable
          DrawerDetails={({ data }: PropRowDetails<Material>) => (
            <div>
              <Descriptions
                title="Thông tin nguyên vật liệu"
                bordered
                column={2}
              >
                <Descriptions.Item label="Mã NVL">
                  {data?.materialCode}
                </Descriptions.Item>
                <Descriptions.Item label="Tên nguyên vật liệu">
                  {data?.materialName}
                </Descriptions.Item>
                <Descriptions.Item label="Đơn vị">
                  <Tag color="blue">{data?.unit}</Tag>
                </Descriptions.Item>
                <Descriptions.Item label="Mô tả">
                  {data?.description || "-"}
                </Descriptions.Item>
                <Descriptions.Item label="Chi nhánh">
                  {data?.branchName}
                </Descriptions.Item>
              </Descriptions>
            </div>
          )}
          columns={columns}
          dataSource={filteredMaterials as Material[]}
          loading={isLoading || deleteMutation.isPending || isFetching}
          pagination={{ ...pagination, onChange: handlePageChange }}
        />
      </WrapperContent>

      <Modal
        title={editingItem ? "Sửa nguyên vật liệu" : "Thêm nguyên vật liệu"}
        open={showModal}
        onCancel={() => setShowModal(false)}
        onOk={handleSubmit}
        okText="Lưu"
        cancelText="Hủy"
        confirmLoading={saveMutation.isPending}
        width={600}
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="materialCode"
            label="Mã NVL"
            rules={[{ required: true, message: "Vui lòng nhập mã NVL" }]}
          >
            <Input disabled={!!editingItem} />
          </Form.Item>
          <Form.Item
            name="materialName"
            label="Tên nguyên vật liệu"
            rules={[{ required: true, message: "Vui lòng nhập tên NVL" }]}
          >
            <Input />
          </Form.Item>
          <Form.Item
            name="unit"
            label="Đơn vị"
            rules={[{ required: true, message: "Vui lòng chọn đơn vị" }]}
            extra="Chọn đơn vị phù hợp với loại nguyên vật liệu"
          >
            <Select
              placeholder="-- Chọn đơn vị --"
              options={UNIT_OPTIONS}
              showSearch
            />
          </Form.Item>
          <Form.Item name="description" label="Mô tả">
            <Input.TextArea rows={3} />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
}
