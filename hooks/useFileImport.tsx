"use client";

import { App } from "antd";
import * as XLSX from "xlsx";

export function useFileImport() {
  const { message } = App.useApp();

  const importFromExcel = (
    file: File,
    onSuccess: (data: any[]) => void,
    onError?: (error: string) => void
  ) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: "binary" });
        
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);
        
        if (jsonData.length === 0) {
          message.warning("File Excel không có dữ liệu");
          onError?.("File Excel không có dữ liệu");
          return;
        }

        message.success(`Đọc thành công ${jsonData.length} dòng dữ liệu`);
        onSuccess(jsonData);
      } catch (error) {
        console.error("Error reading Excel file:", error);
        message.error("Lỗi đọc file Excel");
        onError?.("Lỗi đọc file Excel");
      }
    };

    reader.onerror = () => {
      message.error("Lỗi đọc file");
      onError?.("Lỗi đọc file");
    };

    reader.readAsBinaryString(file);
  };

  const openFileDialog = (
    onSuccess: (data: any[]) => void,
    onError?: (error: string) => void
  ) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".xlsx,.xls";
    
    input.onchange = (e: Event) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      
      importFromExcel(file, onSuccess, onError);
    };
    
    input.click();
  };

  return { importFromExcel, openFileDialog };
}
