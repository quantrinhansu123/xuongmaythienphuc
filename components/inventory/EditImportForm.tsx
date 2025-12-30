"use client";

import { DeleteOutlined, PlusOutlined } from "@ant-design/icons";
import { useQuery } from "@tanstack/react-query";
import { Button, Form, Input, InputNumber, Select, Space, Table, message } from "antd";
import { useEffect, useState } from "react";

type EditImportFormProps = {
  transactionId: number;
  warehouseId: number;
  initialData: {
    notes?: string;
    details: Array<{
      id: number;
      itemCode: string;
      itemName: string;
      quantity: number;
      unit: string;
      unitPrice?: number;
      totalAmount?: number;
      materialId?: number;
      productId?: number;
    }>;
  };
  onSuccess: () => void;
  onCancel: () => void;
};

type ImportItem = {
  key: string;
  materialId?: number;
  productId?: number;
  itemCode: string;
  itemName: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  totalAmount: number;
};

export default function EditImportForm({ transactionId, warehouseId, initialData, onSuccess, onCancel }: EditImportFormProps) {
  const [form] = Form.useForm();
  const [items, setItems] = useState<ImportItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedWarehouseId, setSelectedWarehouseId] = useState<number>(warehouseId);

  // Lấy danh sách kho
  const { data: warehousesData = [] } = useQuery({
    queryKey: ["warehouses"],
    queryFn: async () => {
      const res = await fetch(`/api/inventory/warehouses`);
      const body = await res.json();
      return body.success ? body.data : [];
    },
    staleTime: 5 * 60 * 1000,
  });

  // Khởi tạo dữ liệu từ initialData
  useEffect(() => {
    if (initialData) {
      form.setFieldsValue({ notes: initialData.notes });
      const mappedItems = initialData.details.map((d, idx) => ({
        key: `existing-${d.id || idx}`,
        materialId: d.materialId,
        productId: d.productId,
        itemCode: d.itemCode,
        itemName: d.itemName,
        quantity: d.quantity,
        unit: d.unit,
        unitPrice: d.unitPrice || 0,
        totalAmount: d.totalAmount || d.quantity * (d.unitPrice || 0),
      }));
      setItems(mappedItems);
    }
  }, [initialData, form]);

  // Lấy thông tin kho đã chọn
  const warehouse = warehousesData.find((w: any) => w.id === selectedWarehouseId);

  // Khi đổi kho, xóa items không phù hợp
  const handleWarehouseChange = (newWarehouseId: number) => {
    const newWarehouse = warehousesData.find((w: any) => w.id === newWarehouseId);
    if (!newWarehouse) return;
    
    setSelectedWarehouseId(newWarehouseId);
    
    // Nếu kho mới là hỗn hợp, giữ nguyên tất cả
    if (newWarehouse.warehouseType === 'HON_HOP') return;
    
    // Lọc items theo loại kho mới
    // Note: Với phiếu nhập, items có thể không có itemType nên cần xử lý khác
    // Tạm thời clear items khi đổi kho để user thêm lại
    if (items.length > 0) {
      message.info('Đã xóa danh sách hàng hóa do đổi kho. Vui lòng thêm lại.');
      setItems([]);
    }
  };

  // Lấy danh sách items
  const { data: availableItems = [] } = useQuery({
    queryKey: ["all-items-import", warehouse?.warehouseType, selectedWarehouseId],
    enabled: !!warehouse,
    queryFn: async () => {
      const warehouseType = warehouse.warehouseType;
      const res = await fetch(`/api/products/items`);
      const body = await res.json();
      if (!body.success || !body.data) return [];
      
      const allItems = body.data;
      return allItems.filter((item: any) => {
        if (warehouseType === "HON_HOP") return true;
        if (warehouseType === "NVL") return item.itemType === "MATERIAL";
        if (warehouseType === "THANH_PHAM") return item.itemType === "PRODUCT";
        return true;
      });
    },
    staleTime: 5 * 60 * 1000,
  });

  const handleAddItem = () => {
    const selectedItemCode = form.getFieldValue("selectedItem");
    const quantity = form.getFieldValue("quantity");

    if (!selectedItemCode || !quantity) {
      message.warning("Vui lòng chọn hàng hóa và nhập số lượng");
      return;
    }

    const selectedItem = availableItems.find((item: any) => item.itemCode === selectedItemCode);
    if (!selectedItem) return;

    const existingItemIndex = items.findIndex(item => item.itemCode === selectedItemCode);
    
    if (existingItemIndex !== -1) {
      const updatedItems = [...items];
      const existingItem = updatedItems[existingItemIndex];
      existingItem.quantity += quantity;
      existingItem.totalAmount = existingItem.quantity * existingItem.unitPrice;
      setItems(updatedItems);
      message.success(`Đã cộng thêm ${quantity} vào ${selectedItem.itemName}`);
    } else {
      const unitPrice = selectedItem.costPrice || 0;
      const newItem: ImportItem = {
        key: Date.now().toString(),
        materialId: selectedItem.materialId,
        productId: selectedItem.productId,
        itemCode: selectedItem.itemCode,
        itemName: selectedItem.itemName,
        quantity,
        unit: selectedItem.unit,
        unitPrice,
        totalAmount: quantity * unitPrice,
      };
      setItems([...items, newItem]);
    }
    
    form.setFieldsValue({ selectedItem: undefined, quantity: undefined });
  };

  const handleRemoveItem = (key: string) => {
    setItems(items.filter((item) => item.key !== key));
  };

  const handleSubmit = async () => {
    if (items.length === 0) {
      message.warning("Vui lòng thêm ít nhất một hàng hóa");
      return;
    }

    const notes = form.getFieldValue("notes");

    setLoading(true);
    try {
      const res = await fetch(`/api/inventory/import/${transactionId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          notes,
          toWarehouseId: selectedWarehouseId,
          items: items.map((item) => ({
            materialId: item.materialId,
            productId: item.productId,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
          })),
        }),
      });

      const body = await res.json();

      if (body.success) {
        message.success("Cập nhật phiếu nhập kho thành công");
        onSuccess();
      } else {
        message.error(body.error || "Có lỗi xảy ra");
      }
    } catch (error) {
      message.error("Có lỗi xảy ra");
    } finally {
      setLoading(false);
    }
  };

  const columns = [
    { title: "Mã", dataIndex: "itemCode", key: "itemCode", width: 120 },
    { title: "Tên", dataIndex: "itemName", key: "itemName" },
    { title: "Số lượng", dataIndex: "quantity", key: "quantity", width: 100, align: "right" as const },
    { title: "ĐVT", dataIndex: "unit", key: "unit", width: 80 },
    {
      title: "Đơn giá",
      dataIndex: "unitPrice",
      key: "unitPrice",
      width: 120,
      align: "right" as const,
      render: (val: number) => val.toLocaleString(),
    },
    {
      title: "Thành tiền",
      dataIndex: "totalAmount",
      key: "totalAmount",
      width: 120,
      align: "right" as const,
      render: (val: number) => val.toLocaleString(),
    },
    {
      title: "Thao tác",
      key: "action",
      width: 80,
      render: (_: any, record: ImportItem) => (
        <Button type="link" danger size="small" icon={<DeleteOutlined />} onClick={() => handleRemoveItem(record.key)} />
      ),
    },
  ];

  const totalAmount = items.reduce((sum, item) => sum + item.totalAmount, 0);

  return (
    <div className="space-y-4">
      <Form form={form} layout="vertical">
        <Form.Item label="Kho nhập" className="mb-4">
          <Select
            value={selectedWarehouseId}
            onChange={handleWarehouseChange}
            showSearch
            optionFilterProp="label"
            options={warehousesData.map((w: any) => ({
              label: `${w.warehouseName} (${w.warehouseType === 'HON_HOP' ? 'Hỗn hợp' : w.warehouseType === 'NVL' ? 'NVL' : 'TP'}) - ${w.branchName || ''}`,
              value: w.id,
            }))}
          />
        </Form.Item>
        <div className="grid grid-cols-3 gap-4">
          <Form.Item label="Hàng hóa" name="selectedItem" className="col-span-2">
            <Select
              showSearch
              placeholder="Chọn hàng hóa"
              optionFilterProp="label"
              filterOption={(input, option) =>
                String(option?.label ?? "").toLowerCase().includes(input.toLowerCase())
              }
              options={availableItems.map((item: any, index: number) => ({
                label: `${item.itemCode} - ${item.itemName} (${item.itemType === 'MATERIAL' ? 'NVL' : 'SP'})`,
                value: item.itemCode,
                key: `${item.itemCode}-${item.id || index}`,
              }))}
            />
          </Form.Item>
          <Form.Item label="Số lượng" name="quantity">
            <InputNumber min={1} style={{ width: "100%" }} placeholder="Số lượng" />
          </Form.Item>
        </div>
        <Button type="dashed" icon={<PlusOutlined />} onClick={handleAddItem} block>
          Thêm hàng hóa
        </Button>
      </Form>

      <Table
        columns={columns}
        dataSource={items}
        pagination={false}
        size="small"
        summary={() => (
          <Table.Summary.Row>
            <Table.Summary.Cell index={0} colSpan={5} align="right">
              <strong>Tổng cộng:</strong>
            </Table.Summary.Cell>
            <Table.Summary.Cell index={1} align="right">
              <strong>{totalAmount.toLocaleString()}</strong>
            </Table.Summary.Cell>
            <Table.Summary.Cell index={2} />
          </Table.Summary.Row>
        )}
      />

      <Form form={form} layout="vertical">
        <Form.Item label="Ghi chú" name="notes">
          <Input.TextArea rows={3} placeholder="Ghi chú (tùy chọn)" />
        </Form.Item>
      </Form>

      <Space className="flex justify-end">
        <Button onClick={onCancel}>Hủy</Button>
        <Button type="primary" onClick={handleSubmit} loading={loading}>
          Cập nhật phiếu nhập
        </Button>
      </Space>
    </div>
  );
}
