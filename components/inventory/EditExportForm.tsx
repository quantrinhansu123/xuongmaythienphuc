"use client";

import { formatQuantity } from "@/utils/format";
import { DeleteOutlined, PlusOutlined } from "@ant-design/icons";
import { useQuery } from "@tanstack/react-query";
import { Button, Form, Input, InputNumber, Select, Space, Table, message } from "antd";
import { useEffect, useState } from "react";

type EditExportFormProps = {
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
      materialId?: number;
      productId?: number;
      stockQuantity?: number;
    }>;
  };
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

export default function EditExportForm({ transactionId, warehouseId, initialData, onSuccess, onCancel }: EditExportFormProps) {
  const [form] = Form.useForm();
  const [items, setItems] = useState<ExportItem[]>([]);
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

  // Lấy thông tin kho đã chọn
  const warehouse = warehousesData.find((w: any) => w.id === selectedWarehouseId);

  // Lấy danh sách hàng hóa có tồn kho
  const { data: availableItems = [] } = useQuery({
    queryKey: ["inventory-balance-export", selectedWarehouseId],
    enabled: !!warehouse,
    queryFn: async () => {
      const res = await fetch(`/api/inventory/balance?warehouseId=${selectedWarehouseId}&showAll=false`);
      const body = await res.json();
      if (body.success && body.data) {
        const details = body.data.details || body.data || [];
        return details.filter((item: any) => parseFloat(item.quantity) > 0);
      }
      return [];
    },
    staleTime: 5 * 60 * 1000,
  });

  // Khi đổi kho, xóa items
  const handleWarehouseChange = (newWarehouseId: number) => {
    setSelectedWarehouseId(newWarehouseId);
    if (items.length > 0) {
      message.info('Đã xóa danh sách hàng hóa do đổi kho. Vui lòng thêm lại.');
      setItems([]);
    }
  };

  // Khởi tạo dữ liệu từ initialData
  useEffect(() => {
    if (initialData && availableItems.length > 0) {
      form.setFieldsValue({ notes: initialData.notes });
      const mappedItems = initialData.details.map((d, idx) => {
        const balanceItem = availableItems.find((i: any) => i.itemCode === d.itemCode);
        return {
          key: `existing-${d.id || idx}`,
          materialId: d.materialId || balanceItem?.materialId,
          productId: d.productId || balanceItem?.productId,
          itemCode: d.itemCode,
          itemName: d.itemName,
          quantity: d.quantity,
          unit: d.unit,
          availableQuantity: (d.stockQuantity || 0) + d.quantity, // Tồn kho + số lượng đang xuất
          itemType: balanceItem?.itemType || 'NVL',
        };
      });
      setItems(mappedItems);
    }
  }, [initialData, availableItems, form]);

  const handleAddItem = () => {
    const selectedItemCode = form.getFieldValue("selectedItem");
    const quantity = form.getFieldValue("quantity");

    if (!selectedItemCode || !quantity) {
      message.warning("Vui lòng chọn hàng hóa và nhập số lượng");
      return;
    }

    const selectedItem = availableItems.find((item: any) => item.itemCode === selectedItemCode);
    if (!selectedItem) return;

    const availableQty = parseFloat(selectedItem.quantity);
    const existingItemIndex = items.findIndex(item => item.itemCode === selectedItemCode);

    if (existingItemIndex !== -1) {
      const existingItem = items[existingItemIndex];
      const totalQuantity = existingItem.quantity + quantity;

      if (totalQuantity > availableQty) {
        message.error(`Tổng số lượng xuất (${totalQuantity}) không được vượt quá tồn kho (${availableQty})`);
        return;
      }

      const updatedItems = [...items];
      updatedItems[existingItemIndex].quantity = totalQuantity;
      setItems(updatedItems);
      message.success(`Đã cộng thêm ${quantity} vào ${selectedItem.itemName}`);
    } else {
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
      const res = await fetch(`/api/inventory/export/${transactionId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          notes,
          fromWarehouseId: selectedWarehouseId,
          items: items.map((item) => ({
            materialId: item.materialId,
            productId: item.productId,
            quantity: item.quantity,
          })),
        }),
      });

      const body = await res.json();

      if (body.success) {
        message.success("Cập nhật phiếu xuất kho thành công");
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
    { title: "Số lượng xuất", dataIndex: "quantity", key: "quantity", width: 120, align: "right" as const, render: (val: number) => formatQuantity(val) },
    { title: "Tồn kho", dataIndex: "availableQuantity", key: "availableQuantity", width: 100, align: "right" as const, render: (val: number) => formatQuantity(val) },
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
        <Form.Item label="Kho xuất" className="mb-4">
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
              options={availableItems.map((item: any) => ({
                label: `${item.itemCode} - ${item.itemName} (${item.itemType === 'NVL' ? 'NVL' : 'SP'}) - Tồn: ${formatQuantity(parseFloat(item.quantity))} ${item.unit}`,
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
          Cập nhật phiếu xuất
        </Button>
      </Space>
    </div>
  );
}
