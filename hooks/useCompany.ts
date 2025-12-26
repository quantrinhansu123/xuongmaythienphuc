import { queryClient } from "@/providers/ReactQueryProvider";
import { useMutation, useQuery } from "@tanstack/react-query";
import { App } from "antd";

export interface CompanyConfig {
  id?: number;
  companyName: string;
  taxCode?: string;
  address?: string;
  phone?: string;
  email?: string;
  headerText?: string;
  footerText?: string;
  logoUrl?: string;
}

export const useGetCompany = () => {
  return useQuery({
    queryKey: ["company-config"],
    queryFn: async () => {
      const res = await fetch("/api/admin/company-config");
      const body = await res.json();
      if (!body.success) throw new Error(body.error);
      return body.data as CompanyConfig | null;
    },
    staleTime: 30 * 60 * 1000, // Cache
  });
}

export const useUpdateCompany = () => {
    const {message} = App.useApp();
  return useMutation({
    mutationFn: async (values: CompanyConfig) => {
      const res = await fetch("/api/admin/company-config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const body = await res.json();
      if (!body.success) throw new Error(body.error);
      return body;
    },
    onSuccess: () => {
      message.success("Cập nhật thông tin công ty thành công");
      queryClient.invalidateQueries({ queryKey: ["company-config"] });
    },
    onError: (error: Error) => {
      message.error(error.message || "Có lỗi xảy ra");
    },
  });
}
