"use client";

import { formatCurrency, formatQuantity } from "@/utils/format";
import { DeleteOutlined, PlusOutlined } from "@ant-design/icons";
import { useQuery } from "@tanstack/react-query";
import { Button, Form, Input, InputNumber, Select, Space, Table, message } from "antd";
import { useState } from "react";

type TransferFormProps = {
  fromWarehouseId: number;
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

export default function TransferForm({ fromWarehouseId, onSuccess, onCancel }: TransferFormProps) {
  const [form] = Form.useForm();
  const [items, setItems] = useState<TransferItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedToWarehouse, setSelectedToWarehouse] = useState<number | undefined>();

  // Khi thay đổi kho đích, xóa các items không phù hợp
  const handleToWarehouseChange = (warehouseId: number) => {
    setSelectedToWarehouse(warehouseId);
    
    // Tìm thông tin kho đích mới
    const newToWarehouse = toWarehouses.find((w: any) => w.id === warehouseId);
    if (!newToWarehouse) return;
    
    const toType = newToWarehouse.warehouseType;
    
    // Nếu kho đích là hỗn hợp, giữ nguyên tất cả items
    if (toType === 'HON_HOP') return;
    
    // Lọc bỏ items không phù hợp với kho đích
    const filteredItems = items.filter(item => {
      if (toType === 'NVL') return item.itemType === 'NVL';
      if (toType === 'THANH_PHAM') return item.itemType === 'THANH_PHAM';
      return true;
    });
    
    if (filteredItems.length !== items.length) {
      setItems(filteredItems);
      message.info(`Đã xóa ${items.length - filteredItems.length} hàng hóa không phù hợp với kho đích`);
    }
  };

  // Lấy thông tin kho xuất
  const { data: fromWarehouse } = useQuery({
    queryKey: ["warehouse", fromWarehouseId],
    queryFn: async () => {
      const res = await fetch(`/api/inventory/warehouses`);
      const body = await res.json();
      const warehouses = body.success ? body.data : [];
      return warehouses.find((w: any) => w.id === fromWarehouseId);
    },
    staleTime: 5 * 60 * 1000, // Cache
  });

  // Lấy danh sách kho đích phù hợp với kho xuất (bao gồm kho khác chi nhánh)
  // - Kho NVL (B) → Kho NVL hoặc Kho Hỗn hợp
  // - Kho SP (A) → Kho SP hoặc Kho Hỗn hợp  
  // - Kho Hỗn hợp (O) → Tất cả kho
  const { data: toWarehouses = [] } = useQuery({
    queryKey: ["warehouses-transfer-all", fromWarehouseId, fromWarehouse?.warehouseType],
    enabled: !!fromWarehouse,
    queryFn: async () => {
      // Dùng showAll=true để lấy tất cả kho (bao gồm khác chi nhánh)
      const res = await fetch(`/api/inventory/warehouses?showAll=true`);
      const body = await res.json();
      if (!body.success) return [];
      
      const fromType = fromWarehouse.warehouseType;
      
      return body.data.filter((w: any) => {
        if (w.id === fromWarehouseId) return false; // Loại bỏ kho xuất
        
        // Kho hỗn hợp (O) có thể chuyển đến tất cả kho
        if (fromType === 'HON_HOP') return true;
        
        // Kho NVL (B) chỉ chuyển đến kho NVL hoặc kho hỗn hợp
        if (fromType === 'NVL') {
          return w.warehouseType === 'NVL' || w.warehouseType === 'HON_HOP';
        }
        
        // Kho SP (A) chỉ chuyển đến kho SP hoặc kho hỗn hợp
        if (fromType === 'THANH_PHAM') {
          return w.warehouseType === 'THANH_PHAM' || w.warehouseType === 'HON_HOP';
        }
        
        return false;
      });
    staleTime: 10 * 60 * 1000, // Cache
    },
  });

  // Lấy thông tin kho nhập đã chọn
  const selectedToWarehouseInfo = toWarehouses.find((w: any) => w.id === selectedToWarehouse);

  // Lấy danh sách hàng hóa có tồn kho trong kho xuất
  const { data: allAvailableItems = [] } = useQuery({
    queryKey: ["warehouse-balance", fromWarehouseId, fromWarehouse?.warehouseType],
    enabled: !!fromWarehouse,
    queryFn: async () => {
      // Dùng showAll=false để chỉ lấy items có tồn kho > 0
      const res = await fetch(`/api/inventory/balance?warehouseId=${fromWarehouseId}&showAll=false`);
      const body = await res.json();
      if (!body.success || !body.data) return [];
      // API trả về { details, summary } - lấy details
      const details = body.data.details || body.data || [];
      return details.filter((item: any) => parseFloat(item.quantity) > 0);
    },
    staleTime: 5 * 60 * 1000, // Cache
  });

  // Filter hàng hóa dựa trên kho đích đã chọn
  // - Nếu kho đích là NVL: chỉ hiển thị NVL
  // - Nếu kho đích là THANH_PHAM: chỉ hiển thị sản phẩm
  // - Nếu kho đích là HON_HOP hoặc chưa chọn: hiển thị tất cả
  const availableItems = allAvailableItems.filter((item: any) => {
    if (!selectedToWarehouseInfo) return true; // Chưa chọn kho đích -> hiển thị tất cả
    
    const toType = selectedToWarehouseInfo.warehouseType;
    if (toType === 'HON_HOP') return true; // Kho hỗn hợp nhận tất cả
    if (toType === 'NVL') return item.itemType === 'NVL'; // Kho NVL chỉ nhận NVL
    if (toType === 'THANH_PHAM') return item.itemType === 'THANH_PHAM'; // Kho TP chỉ nhận SP
    return true;
  });

  const handleAddItem = () => {
    const selectedItemId = form.getFieldValue("selectedItem");
    const quantity = form.getFieldValue("quantity");

    if (!selectedItemId || !quantity) {
      message.warning("Vui lòng chọn hàng hóa và nhập số lượng");
      return;
    }

    // Tìm item dựa trên itemCode (hỗ trợ cả NVL, thành phẩm và kho hỗn hợp)
    const selectedItem = availableItems.find((item: any) => item.itemCode === selectedItemId);

    if (!selectedItem) return;

    const availableQty = parseFloat(selectedItem.quantity);
    
    // Kiểm tra đã thêm item này chưa
    const existingItemIndex = items.findIndex(item => item.itemCode === selectedItemId);
    
    if (existingItemIndex !== -1) {
      // Đã có -> kiểm tra tổng số lượng
      const existingItem = items[existingItemIndex];
      const totalQuantity = existingItem.quantity + quantity;
      
      if (totalQuantity > availableQty) {
        message.error(`Tổng số lượng chuyển (${totalQuantity}) không được vượt quá tồn kho (${availableQty})`);
        return;
      }
      
      // Cộng dồn số lượng
      const updatedItems = [...items];
      updatedItems[existingItemIndex].quantity = totalQuantity;
      updatedItems[existingItemIndex].totalAmount = totalQuantity * updatedItems[existingItemIndex].unitPrice;
      setItems(updatedItems);
      message.success(`Đã cộng thêm ${quantity} vào ${selectedItem.itemName}`);
    } else {
      // Chưa có -> kiểm tra số lượng và thêm mới
      if (quantity > availableQty) {
        message.warning(`Số lượng tồn kho chỉ còn ${availableQty} ${selectedItem.unit}`);
        return;
      }

      // Xác định materialId hoặc productId dựa trên itemType
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
      const res = await fetch("/api/inventory/transfer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fromWarehouseId,
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
        message.success("Tạo phiếu luân chuyển kho thành công");
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
              onChange={handleToWarehouseChange}
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
                value: item.itemCode, // Dùng itemCode làm key để hỗ trợ kho hỗn hợp
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
          Tạo phiếu luân chuyển
        </Button>
      </Space>
    </div>
  );
}
