import { WarehouseType } from "@/types/enum";

export type WarehouseFormValues = {
  warehouseCode: string;
  warehouseName: string;
  branchId: number | string;
  address?: string;
  warehouseType: "NVL" | "THANH_PHAM" | "HON_HOP";
  isActive?: boolean;
};

export interface Warehouse {
  id: number;
  warehouseCode: string;
  warehouseName: string;
  branchId: number;
  branchName: string;
  address?: string;
  warehouseType: WarehouseType;
  isActive: boolean;
}

export const WarehouseOptions = [
  { label: "Kho nguyên vật liệu", value: WarehouseType.NVL },
  { label: "Kho thành phẩm", value: WarehouseType.THANH_PHAM },
  { label: "Kho hỗn hợp", value: WarehouseType.HON_HOP }
];
