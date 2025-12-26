"use client";

import { DeleteOutlined, PlusOutlined } from "@ant-design/icons";
import { useQuery } from "@tanstack/react-query";
import { Button, Form, Input, InputNumber, Select, Space, Table, message } from "antd";
import { useState } from "react";

type ImportFormProps = {
  warehouseId: number;
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

export default function ImportForm({ warehouseId, onSuccess, onCancel }: ImportFormProps) {
  const [form] = Form.useForm();
  const [items, setItems] = useState<ImportItem[]>([]);
  const [loading, setLoading] = useState(false);

  // Lấy thông tin kho
  const { data: warehouse } = useQuery({
    queryKey: ["warehouse", warehouseId],
    queryFn: async () => {
      const res = await fetch(`/api/inventory/warehouses`);
      const body = await res.json();
      const warehouses = body.success ? body.data : [];
      return warehouses.find((w: any) => w.id === warehouseId);
    },
    staleTime: 5 * 60 * 1000, // Cache
  });

  // Lấy danh sách TẤT CẢ items từ API items (có cả giá)
  const { data: availableItems = [] } = useQuery({
    queryKey: ["all-items-import", warehouse?.warehouseType, warehouse?.id],
    enabled: !!warehouse,
    queryFn: async () => {
      const warehouseType = warehouse.warehouseType;
      
      console.log(`📦 [ImportForm] Warehouse type: ${warehouseType}`);
      
      // Lấy tất cả items từ API items (có đầy đủ thông tin bao gồm giá)
      const res = await fetch(`/api/products/items`);
      const body = await res.json();
      console.log(`📦 [ImportForm] Items response:`, body);
      
      if (!body.success || !body.data) return [];
      
      const allItems = body.data;
      
      // Filter theo loại kho
      const filteredItems = allItems.filter((item: any) => {
        if (warehouseType === "HON_HOP") return true; // Kho hỗn hợp nhận tất cả
        if (warehouseType === "NVL") return item.itemType === "MATERIAL"; // NVL = MATERIAL
        if (warehouseType === "THANH_PHAM") return item.itemType === "PRODUCT"; // THANH_PHAM = PRODUCT
        return true;
      });
      
      console.log(`📦 [ImportForm] Filtered items: ${filteredItems.length}`, filteredItems);
      return filteredItems;
    },
    staleTime: 5 * 60 * 1000, // Cache
  });

  const handleAddItem = () => {
    const selectedItemCode = form.getFieldValue("selectedItem");
    const quantity = form.getFieldValue("quantity");

    if (!selectedItemCode || !quantity) {
      message.warning("Vui lòng chọn hàng hóa và nhập số lượng");
      return;
    }

    // Tìm item theo itemCode để hỗ trợ kho hỗn hợp
    const selectedItem = availableItems.find((item: any) => item.itemCode === selectedItemCode);

    if (!selectedItem) return;

    // Kiểm tra đã thêm item này chưa
    const existingItemIndex = items.findIndex(item => item.itemCode === selectedItemCode);
    
    if (existingItemIndex !== -1) {
      // Đã có -> cộng dồn số lượng
      const updatedItems = [...items];
      const existingItem = updatedItems[existingItemIndex];
      existingItem.quantity += quantity;
      existingItem.totalAmount = existingItem.quantity * existingItem.unitPrice;
      setItems(updatedItems);
      message.success(`Đã cộng thêm ${quantity} vào ${selectedItem.itemName}`);
    } else {
      // Chưa có -> thêm mới
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
      const res = await fetch("/api/inventory/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          toWarehouseId: warehouseId,
          notes,
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
        message.success("Tạo phiếu nhập kho thành công");
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
        <div className="grid grid-cols-3 gap-4">
          <Form.Item label="Hàng hóa" name="selectedItem" className="col-span-2">
            <Select
              showSearch
              placeholder="Chọn hàng hóa"
              optionFilterProp="label"
              filterOption={(input, option) =>
                String(option?.label ?? "").toLowerCase().includes(input.toLowerCase())
              }
              onChange={(itemCode) => {
                // Tự động điền đơn giá khi chọn hàng hoá
                const selectedItem = availableItems.find((item: any) => item.itemCode === itemCode);
                if (selectedItem && selectedItem.costPrice) {
                  form.setFieldsValue({ unitPrice: selectedItem.costPrice });
                }
              }}
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
          Tạo phiếu nhập
        </Button>
      </Space>
    </div>
  );
}
