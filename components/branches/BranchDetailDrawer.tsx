"use client";

import React from "react";
import { Drawer, Descriptions, Space, Button } from "antd";
import { EditOutlined, DeleteOutlined } from "@ant-design/icons";
import type { Branch } from "@/services/commonService";

type Props = {
  open: boolean;
  branch: Branch | null;
  onClose: () => void;
  onEdit: (b: Branch) => void;
  onDelete: (id: number) => void;
  canEdit?: boolean;
  canDelete?: boolean;
};

export default function BranchDetailDrawer({
  open,
  branch,
  onClose,
  onEdit,
  onDelete,
  canEdit,
  canDelete,
}: Props) {
  return (
    <Drawer
      title="Chi tiết chi nhánh"
      placement="right"
      size={600}
      onClose={onClose}
      open={open}
    >
      {branch ? (
        <>
          <Descriptions column={1} bordered>
            <Descriptions.Item label="Mã chi nhánh">
              {branch.branchCode}
            </Descriptions.Item>
            <Descriptions.Item label="Tên chi nhánh">
              {branch.branchName}
            </Descriptions.Item>
            <Descriptions.Item label="Địa chỉ">
              {branch.address || "-"}
            </Descriptions.Item>
            <Descriptions.Item label="Điện thoại">
              {branch.phone || "-"}
            </Descriptions.Item>
            <Descriptions.Item label="Email">
              {branch.email || "-"}
            </Descriptions.Item>
          </Descriptions>

          <Space style={{ marginTop: 16 }}>
            {canEdit && (
              <Button
                type="primary"
                icon={<EditOutlined />}
                onClick={() => onEdit(branch)}
              >
                Sửa
              </Button>
            )}
            {canDelete && (
              <Button
                danger
                icon={<DeleteOutlined />}
                onClick={() => onDelete(branch.id)}
              >
                Xóa
              </Button>
            )}
          </Space>
        </>
      ) : null}
    </Drawer>
  );
}
