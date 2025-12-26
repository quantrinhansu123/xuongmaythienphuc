"use client";
import type { TableColumnsType } from "antd";
import { App } from "antd";
import * as XLSX from "xlsx";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const useFileExport = <T extends Record<string, any> = Record<string, any>>(columns?: TableColumnsType<T>) => {
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

  const buildHeadersFromColumns = (cols?: TableColumnsType<T>): Record<string, string> => {
    const headers: Record<string, string> = {};
    if (!cols || !Array.isArray(cols)) return headers;

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

    // defaults
    if (!Object.prototype.hasOwnProperty.call(headers, "createdAt")) {
      headers.createdAt = "Ngày tạo";
    }
    if (!Object.prototype.hasOwnProperty.call(headers, "updatedAt")) {
      headers.updatedAt = "Ngày cập nhật";
    }
    if (!Object.prototype.hasOwnProperty.call(headers, "id")) {
      headers.id = "ID";
    }

    return headers;
  };

  const mapDataWithHeaders = (data: T[]): T[] => {
    if (!columns || !Array.isArray(columns) || columns.length === 0) return data;

    const headersFinal = buildHeadersFromColumns(columns);
    if (Object.keys(headersFinal).length === 0) return data;
     if (!Object.prototype.hasOwnProperty.call(headersFinal, "createdAt")) {
      headersFinal.createdAt = "Ngày tạo";
    }
    if (!Object.prototype.hasOwnProperty.call(headersFinal, "updatedAt")) {
      headersFinal.updatedAt = "Ngày cập nhật";
    }
    if (Object.prototype.hasOwnProperty.call(headersFinal, "actions")) {
       delete headersFinal.actions;
    }
    if (Object.prototype.hasOwnProperty.call(headersFinal, "#")) {
       delete headersFinal["#"];
    }
    if (Object.prototype.hasOwnProperty.call(headersFinal, "actions")) {
       delete headersFinal.actions;
    }

    return data.map((item) => {
      const mappedItem: Record<string, unknown> = {};
      Object.keys(item).forEach((key) => {
        if (!Object.prototype.hasOwnProperty.call(item, key)) return;
        const label = headersFinal[key] ?? key;
        mappedItem[label] = (item as Record<string, unknown>)[key];
      });
      return mappedItem as T;
    });
  };

  const exportToJson = (data: T[], fileName: string = "data.json") => {
    try {
      const jsonData = JSON.stringify(mapDataWithHeaders(data), null, 2);
      const blob = new Blob([jsonData], { type: "application/json;charset=utf-8" });
      downloadFile(blob, fileName);
    } catch (err) {
        console.error(err)
      message.error("Lỗi xuất file JSON");
    }
  };

  const exportToCsv = (data: T[], fileName: string = "data.csv") => {
    try {

      const ws = XLSX.utils.json_to_sheet(mapDataWithHeaders(data) || []);
      const csvOutput = "\uFEFF" + XLSX.utils.sheet_to_csv(ws);
      const blob = new Blob([csvOutput], { type: "text/csv;charset=utf-8;" });
      downloadFile(blob, fileName);
    } catch (err) {
        console.error(err)

      message.error("Lỗi xuất file JSON");
    }
  };

  const exportToXlsx = (data: T[], prefix: string) => {
    try {
      const today = new Date();
      const dd = String(today.getDate()).padStart(2, '0');
      const mm = String(today.getMonth() + 1).padStart(2, '0');
      const yyyy = today.getFullYear();
      const fileName = prefix ? `data_${prefix}_${dd}_${mm}_${yyyy}.xlsx` : `data_${dd}_${mm}_${yyyy}.xlsx`;

      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(mapDataWithHeaders(data) || []);
      XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
      const wbout = XLSX.write(wb, { bookType: "xlsx", type: "array" });
      const blob = new Blob([wbout], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
      downloadFile(blob, fileName);
    } catch (err) {
        console.error(err)

      message.error("Lỗi xuất file JSON");
    }
  };

  return { exportToJson, exportToCsv, exportToXlsx };
};
