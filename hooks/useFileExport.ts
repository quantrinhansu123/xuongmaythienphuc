"use client";
import type { TableColumnsType } from "antd";
import { App } from "antd";
import * as XLSX from "xlsx";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const useFileExport = <T extends Record<string, any> = Record<string, any>>(defaultColumns?: TableColumnsType<T>) => {
  const { message } = App.useApp();

  const downloadFile = (blob: Blob, fileName: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const buildHeaders = (cols?: TableColumnsType<T>): Record<string, string> => {
    const headers: Record<string, string> = {};
    if (!cols || !Array.isArray(cols) || cols.length === 0) {
      // defaults only when NO columns specified
      return {
        id: "ID",
        createdAt: "Ngày tạo",
        updatedAt: "Ngày cập nhật"
      };
    }

    const walk = (arr: TableColumnsType<T>) => {
      arr.forEach((col) => {
        const maybe = col as unknown as { dataIndex?: string | number | Array<string | number>; title?: unknown; children?: TableColumnsType<T> };

        if ("dataIndex" in maybe && maybe.dataIndex != null) {
          const di = maybe.dataIndex as string | number | Array<string | number>;
          const key = Array.isArray(di) ? di.join(".") : String(di);
          const title = maybe.title ?? key;
          headers[key] = typeof title === "string" || typeof title === "number" ? String(title) : key;
        }

        if ("children" in maybe && Array.isArray(maybe.children)) {
          walk(maybe.children as TableColumnsType<T>);
        }
      });
    };

    walk(cols);
    return headers;
  };

  const mapData = (data: T[], cols?: TableColumnsType<T>): any[] => {
    const activeCols = cols || defaultColumns;
    const headersFinal = buildHeaders(activeCols);

    // Clean up unwanted headers
    const unwanted = ["actions", "#"];
    unwanted.forEach(key => {
      if (Object.prototype.hasOwnProperty.call(headersFinal, key)) {
        delete headersFinal[key];
      }
    });

    return data.map((item) => {
      const mappedItem: Record<string, unknown> = {};

      // We iterate over headersFinal to maintain order and selection
      Object.keys(headersFinal).forEach((key) => {
        const label = headersFinal[key];

        // Handle nested properties (e.g., "customer.name")
        let value: any;
        if (key.includes(".")) {
          value = key.split(".").reduce((obj, part) => obj?.[part], item);
        } else {
          value = (item as Record<string, any>)[key];
        }

        // Format boolean values
        if (typeof value === "boolean") {
          value = value ? "Có" : "Không";
        }

        mappedItem[label] = value;
      });
      return mappedItem;
    });
  };

  const exportToJson = (data: T[], fileName: string = "data.json", cols?: TableColumnsType<T>) => {
    try {
      const jsonData = JSON.stringify(mapData(data, cols), null, 2);
      const blob = new Blob([jsonData], { type: "application/json;charset=utf-8" });
      downloadFile(blob, fileName);
    } catch (err) {
      console.error(err);
      message.error("Lỗi xuất file JSON");
    }
  };

  const exportToCsv = (data: T[], fileName: string = "data.csv", cols?: TableColumnsType<T>) => {
    try {
      const ws = XLSX.utils.json_to_sheet(mapData(data, cols) || []);
      const csvOutput = "\uFEFF" + XLSX.utils.sheet_to_csv(ws);
      const blob = new Blob([csvOutput], { type: "text/csv;charset=utf-8;" });
      downloadFile(blob, fileName);
    } catch (err) {
      console.error(err);
      message.error("Lỗi xuất file CSV");
    }
  };

  const exportToXlsx = (data: T[], prefix: string, cols?: TableColumnsType<T>) => {
    try {
      const today = new Date();
      const dd = String(today.getDate()).padStart(2, '0');
      const mm = String(today.getMonth() + 1).padStart(2, '0');
      const yyyy = today.getFullYear();
      const fileName = prefix ? `data_${prefix}_${dd}_${mm}_${yyyy}.xlsx` : `data_${dd}_${mm}_${yyyy}.xlsx`;

      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(mapData(data, cols) || []);
      XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
      const wbout = XLSX.write(wb, { bookType: "xlsx", type: "array" });
      const blob = new Blob([wbout], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
      downloadFile(blob, fileName);
    } catch (err) {
      console.error(err);
      message.error("Lỗi xuất file XLSX");
    }
  };

  return { exportToJson, exportToCsv, exportToXlsx };
};
