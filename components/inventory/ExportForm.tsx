"use client";

import { formatCurrency, formatQuantity } from "@/utils/format";
import { DeleteOutlined, PlusOutlined } from "@ant-design/icons";
import { useQuery } from "@tanstack/react-query";
import { Button, Form, Input, InputNumber, Select, Space, Table, message } from "antd";
import { useState } from "react";

type ExportFormProps = {
  warehouseId: number;
  onSuccess: () => void;
  onCancel: () => void;
};

type ExportItem = {
  key: string;
  materialId?: number;
  productId?: number;
  itemCode: string;
  itemName: string;
  quantity: number;
  unit: string;
  availableQuantity: number;
  itemType: string;
};

export default function ExportForm({ warehouseId, onSuccess, onCancel }: ExportFormProps) {
  const [form] = Form.useForm();
  const [items, setItems] = useState<ExportItem[]>([]);
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

  // Lấy danh sách hàng hóa có tồn kho từ API balance (hỗ trợ tất cả loại kho)
  const { data: availableItems = [] } = useQuery({
    queryKey: ["inventory-balance-export", warehouseId],
    enabled: !!warehouse,
    queryFn: async () => {
      console.log(`🔍 [ExportForm] Fetching balance for warehouse ${warehouseId}, type: ${warehouse.warehouseType}`);
      
      // Dùng API balance với showAll=false để chỉ lấy items có tồn kho > 0
      const res = await fetch(`/api/inventory/balance?warehouseId=${warehouseId}&showAll=false`);
      const body = await res.json();
      console.log(`📦 [ExportForm] Balance response:`, body);
      
      if (body.success && body.data) {
        // API trả về { details, summary } - lấy details
        const details = body.data.details || body.data || [];
        return details.filter((item: any) => parseFloat(item.quantity) > 0);
      }
      return [];
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

    // Tìm item theo itemCode (hỗ trợ kho hỗn hợp)
    const selectedItem = availableItems.find((item: any) => item.itemCode === selectedItemCode);

    if (!selectedItem) return;

    const availableQty = parseFloat(selectedItem.quantity);
    
    // Kiểm tra đã thêm item này chưa
    const existingItemIndex = items.findIndex(item => item.itemCode === selectedItemCode);
    
    if (existingItemIndex !== -1) {
      // Đã có -> kiểm tra tổng số lượng
      const existingItem = items[existingItemIndex];
      const totalQuantity = existingItem.quantity + quantity;
      
      if (totalQuantity > availableQty) {
        message.error(`Tổng số lượng xuất (${totalQuantity}) không được vượt quá tồn kho (${availableQty})`);
        return;
      }
      
      // Cộng dồn số lượng
      const updatedItems = [...items];
      updatedItems[existingItemIndex].quantity = totalQuantity;
      setItems(updatedItems);
      message.success(`Đã cộng thêm ${quantity} vào ${selectedItem.itemName}`);
    } else {
      // Chưa có -> kiểm tra số lượng và thêm mới
      if (quantity > availableQty) {
        message.error(`Số lượng xuất không được vượt quá tồn kho (${availableQty})`);
        return;
      }

      const newItem: ExportItem = {
        key: Date.now().toString(),
        materialId: selectedItem.materialId || undefined,
        productId: selectedItem.productId || undefined,
        itemCode: selectedItem.itemCode,
        itemName: selectedItem.itemName,
        quantity,
        unit: selectedItem.unit,
        availableQuantity: availableQty,
        itemType: selectedItem.itemType,
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
      const res = await fetch("/api/inventory/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fromWarehouseId: warehouseId,
          notes,
          items: items.map((item) => ({
            materialId: item.materialId,
            productId: item.productId,
            quantity: item.quantity,
          })),
        }),
      });

      const body = await res.json();

      if (body.success) {
        message.success("Tạo phiếu xuất kho thành công");
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
    { 
      title: "Loại", 
      dataIndex: "itemType", 
      key: "itemType", 
      width: 80,
      render: (val: string) => val === 'NVL' ? 'NVL' : 'SP'
    },
    { title: "Số lượng xuất", dataIndex: "quantity", key: "quantity", width: 120, align: "right" as const },
    { title: "Tồn kho", dataIndex: "availableQuantity", key: "availableQuantity", width: 100, align: "right" as const },
    { title: "ĐVT", dataIndex: "unit", key: "unit", width: 80 },
    {
      title: "Thao tác",
      key: "action",
      width: 80,
      render: (_: any, record: ExportItem) => (
        <Button type="link" danger size="small" icon={<DeleteOutlined />} onClick={() => handleRemoveItem(record.key)} />
      ),
    },
  ];

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
              options={availableItems.map((item: any) => ({
                label: `${item.itemCode} - ${item.itemName} (${item.itemType === 'NVL' ? 'NVL' : 'SP'}) - Tồn: ${formatQuantity(parseFloat(item.quantity))} ${item.unit} - Giá: ${formatCurrency(item.unitPrice || 0)}`,
                value: item.itemCode,
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
      />

      <Form form={form} layout="vertical">
        <Form.Item label="Ghi chú" name="notes">
          <Input.TextArea rows={3} placeholder="Ghi chú (tùy chọn)" />
        </Form.Item>
      </Form>

      <Space className="flex justify-end">
        <Button onClick={onCancel}>Hủy</Button>
        <Button type="primary" onClick={handleSubmit} loading={loading}>
          Tạo phiếu xuất
        </Button>
      </Space>
    </div>
  );
}
