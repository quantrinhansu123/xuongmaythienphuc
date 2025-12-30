"use client";

import { formatCurrency, formatQuantity } from "@/utils/format";
import { DeleteOutlined, PlusOutlined } from "@ant-design/icons";
import { useQuery } from "@tanstack/react-query";
import { Button, Form, Input, InputNumber, Select, Space, Table, message } from "antd";
import { useEffect, useState } from "react";

type EditTransferFormProps = {
  transactionId: number;
  fromWarehouseId: number;
  toWarehouseId: number;
  initialData: {
    notes?: string;
    details: Array<{
      id: number;
      itemCode: string;
      itemName: string;
      quantity: number;
      unit: string;
      unitPrice?: number;
      materialId?: number;
      productId?: number;
    }>;
  };
  onSuccess: () => void;
  onCancel: () => void;
};

type TransferItem = {
  key: string;
  materialId?: number;
  productId?: number;
  itemCode: string;
  itemName: string;
  itemType: string;
  quantity: number;
  unit: string;
  availableQuantity: number;
  unitPrice: number;
  totalAmount: number;
};

export default function EditTransferForm({ transactionId, fromWarehouseId, toWarehouseId, initialData, onSuccess, onCancel }: EditTransferFormProps) {
  const [form] = Form.useForm();
  const [items, setItems] = useState<TransferItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedToWarehouse, setSelectedToWarehouse] = useState<number>(toWarehouseId);

  // Lấy thông tin kho xuất
  const { data: fromWarehouse } = useQuery({
    queryKey: ["warehouse", fromWarehouseId],
    queryFn: async () => {
      const res = await fetch(`/api/inventory/warehouses`);
      const body = await res.json();
      const warehouses = body.success ? body.data : [];
      return warehouses.find((w: any) => w.id === fromWarehouseId);
    },
    staleTime: 5 * 60 * 1000,
  });

  // Lấy danh sách kho đích
  const { data: toWarehouses = [] } = useQuery({
    queryKey: ["warehouses-transfer-all", fromWarehouseId, fromWarehouse?.warehouseType],
    enabled: !!fromWarehouse,
    queryFn: async () => {
      const res = await fetch(`/api/inventory/warehouses?showAll=true`);
      const body = await res.json();
      if (!body.success) return [];
      
      const fromType = fromWarehouse.warehouseType;
      return body.data.filter((w: any) => {
        if (w.id === fromWarehouseId) return false;
        if (fromType === 'HON_HOP') return true;
        if (fromType === 'NVL') return w.warehouseType === 'NVL' || w.warehouseType === 'HON_HOP';
        if (fromType === 'THANH_PHAM') return w.warehouseType === 'THANH_PHAM' || w.warehouseType === 'HON_HOP';
        return false;
      });
    },
    staleTime: 10 * 60 * 1000,
  });

  // Lấy danh sách hàng hóa có tồn kho
  const { data: allAvailableItems = [] } = useQuery({
    queryKey: ["warehouse-balance", fromWarehouseId, fromWarehouse?.warehouseType],
    enabled: !!fromWarehouse,
    queryFn: async () => {
      const res = await fetch(`/api/inventory/balance?warehouseId=${fromWarehouseId}&showAll=false`);
      const body = await res.json();
      if (!body.success || !body.data) return [];
      const details = body.data.details || body.data || [];
      return details.filter((item: any) => parseFloat(item.quantity) > 0);
    },
    staleTime: 5 * 60 * 1000,
  });

  // Khởi tạo dữ liệu từ initialData
  useEffect(() => {
    if (initialData && allAvailableItems.length > 0) {
      form.setFieldsValue({ notes: initialData.notes });
      const mappedItems = initialData.details.map((d, idx) => {
        const balanceItem = allAvailableItems.find((i: any) => i.itemCode === d.itemCode);
        return {
          key: `existing-${d.id || idx}`,
          materialId: d.materialId || balanceItem?.materialId,
          productId: d.productId || balanceItem?.productId,
          itemCode: d.itemCode,
          itemName: d.itemName,
          itemType: balanceItem?.itemType || 'NVL',
          quantity: d.quantity,
          unit: d.unit,
          availableQuantity: (parseFloat(balanceItem?.quantity) || 0) + d.quantity,
          unitPrice: d.unitPrice || 0,
          totalAmount: d.quantity * (d.unitPrice || 0),
        };
      });
      setItems(mappedItems);
    }
  }, [initialData, allAvailableItems, form]);

  const selectedToWarehouseInfo = toWarehouses.find((w: any) => w.id === selectedToWarehouse);
  const availableItems = allAvailableItems.filter((item: any) => {
    if (!selectedToWarehouseInfo) return true;
    const toType = selectedToWarehouseInfo.warehouseType;
    if (toType === 'HON_HOP') return true;
    if (toType === 'NVL') return item.itemType === 'NVL';
    if (toType === 'THANH_PHAM') return item.itemType === 'THANH_PHAM';
    return true;
  });

  const handleAddItem = () => {
    const selectedItemId = form.getFieldValue("selectedItem");
    const quantity = form.getFieldValue("quantity");

    if (!selectedItemId || !quantity) {
      message.warning("Vui lòng chọn hàng hóa và nhập số lượng");
      return;
    }

    const selectedItem = availableItems.find((item: any) => item.itemCode === selectedItemId);
    if (!selectedItem) return;

    const availableQty = parseFloat(selectedItem.quantity);
    const existingItemIndex = items.findIndex(item => item.itemCode === selectedItemId);
    
    if (existingItemIndex !== -1) {
      const existingItem = items[existingItemIndex];
      const totalQuantity = existingItem.quantity + quantity;
      
      if (totalQuantity > availableQty) {
        message.error(`Tổng số lượng chuyển (${totalQuantity}) không được vượt quá tồn kho (${availableQty})`);
        return;
      }
      
      const updatedItems = [...items];
      updatedItems[existingItemIndex].quantity = totalQuantity;
      updatedItems[existingItemIndex].totalAmount = totalQuantity * updatedItems[existingItemIndex].unitPrice;
      setItems(updatedItems);
      message.success(`Đã cộng thêm ${quantity} vào ${selectedItem.itemName}`);
    } else {
      if (quantity > availableQty) {
        message.warning(`Số lượng tồn kho chỉ còn ${availableQty} ${selectedItem.unit}`);
        return;
      }

      const isMaterial = selectedItem.itemType === 'NVL';
      const newItem: TransferItem = {
        key: Date.now().toString(),
        materialId: isMaterial ? selectedItem.materialId : undefined,
        productId: !isMaterial ? selectedItem.productId : undefined,
        itemCode: selectedItem.itemCode,
        itemName: selectedItem.itemName,
        itemType: selectedItem.itemType,
        quantity,
        unit: selectedItem.unit,
        availableQuantity: availableQty,
        unitPrice: selectedItem.unitPrice || 0,
        totalAmount: quantity * (selectedItem.unitPrice || 0),
      };

      setItems([...items, newItem]);
    }
    
    form.setFieldsValue({ selectedItem: undefined, quantity: undefined });
  };

  const handleRemoveItem = (key: string) => {
    setItems(items.filter((item) => item.key !== key));
  };

  const handleSubmit = async () => {
    if (!selectedToWarehouse) {
      message.warning("Vui lòng chọn kho nhập");
      return;
    }

    if (items.length === 0) {
      message.warning("Vui lòng thêm ít nhất một hàng hóa");
      return;
    }

    const notes = form.getFieldValue("notes");

    setLoading(true);
    try {
      const res = await fetch(`/api/inventory/transfer/${transactionId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          toWarehouseId: selectedToWarehouse,
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
        message.success("Cập nhật phiếu luân chuyển kho thành công");
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
    { title: "Loại", dataIndex: "itemType", key: "itemType", width: 80, render: (val: string) => val === 'NVL' ? 'NVL' : 'SP' },
    { 
      title: "Số lượng", 
      dataIndex: "quantity", 
      key: "quantity", 
      width: 120, 
      align: "right" as const,
      render: (val: number, record: TransferItem) => (
        <div>
          <div>{val.toLocaleString()}</div>
          <div className="text-xs text-gray-500">Tồn: {record.availableQuantity}</div>
        </div>
      ),
    },
    { title: "ĐVT", dataIndex: "unit", key: "unit", width: 80 },
    {
      title: "Thao tác",
      key: "action",
      width: 80,
      render: (_: any, record: TransferItem) => (
        <Button type="link" danger size="small" icon={<DeleteOutlined />} onClick={() => handleRemoveItem(record.key)} />
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <Form form={form} layout="vertical">
        <div className="grid grid-cols-2 gap-4 mb-4">
          <Form.Item label="Kho xuất">
            <Input value={fromWarehouse?.warehouseName} disabled />
          </Form.Item>
          <Form.Item label="Kho nhập" required>
            <Select
              placeholder="Chọn kho nhập"
              value={selectedToWarehouse}
              onChange={setSelectedToWarehouse}
              options={toWarehouses.map((w: any) => ({
                label: `${w.warehouseName} (${w.warehouseType === 'HON_HOP' ? 'Hỗn hợp' : w.warehouseType === 'NVL' ? 'NVL' : 'TP'}) - ${w.branchName || ""}`,
                value: w.id,
              }))}
            />
          </Form.Item>
        </div>

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

      <Table columns={columns} dataSource={items} pagination={false} size="small" />

      <Form form={form} layout="vertical">
        <Form.Item label="Ghi chú" name="notes">
          <Input.TextArea rows={3} placeholder="Ghi chú (tùy chọn)" />
        </Form.Item>
      </Form>

      <Space className="flex justify-end">
        <Button onClick={onCancel}>Hủy</Button>
        <Button type="primary" onClick={handleSubmit} loading={loading}>
          Cập nhật phiếu luân chuyển
        </Button>
      </Space>
    </div>
  );
}
