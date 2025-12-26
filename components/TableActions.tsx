import {
  CheckOutlined,
  DeleteOutlined,
  EditOutlined,
  EyeOutlined,
  PlusOutlined,
  PrinterOutlined,
} from "@ant-design/icons";
import { Button, Space, Tooltip } from "antd";
import React from "react";

interface TableActionsProps {
  onView?: (e?: React.MouseEvent) => void;
  onPrint?: (e?: React.MouseEvent) => void;
  onAdd?: (e?: React.MouseEvent) => void;
  onEdit?: (e?: React.MouseEvent) => void;
  onDelete?: (e?: React.MouseEvent) => void;
  onApprove?: (e?: React.MouseEvent) => void;
  // Visibility flags: if true the corresponding button is shown
  canView?: boolean;
  canPrint?: boolean;
  canAdd?: boolean;
  canEdit?: boolean;
  canDelete?: boolean;
  canApprove?: boolean;
  className?: string;
  size?: "small" | "middle" | "large";
  disabled?: boolean;
  /**
   * Extra custom actions to render after the fixed buttons.
   * Each action: { title, onClick, icon, can } — `can` controls visibility.
   */
  extraActions?: Array<{
    title: string;
    onClick: (e?: React.MouseEvent) => void;
    icon?: React.ReactNode;
    can?: boolean;
  }>;
}

/**
 * TableActions — simplified fixed 5 action buttons.
 * Props: handlers only. Tooltips and icons are built-in.
 */
const TableActions: React.FC<TableActionsProps> = ({
  onView,
  onPrint,
  onAdd,
  onEdit,
  onApprove,
  onDelete,
  canView = true,
  canPrint = true,
  canAdd = true,
  canEdit = true,
  canDelete = true,
  canApprove = true,
  className = "",
  size = "small",
  disabled = false,
  extraActions = [],
}) => {
  return (
    <div className={className}>
      <Space size="middle">
        {canView && onView && (
          <Tooltip title="Xem" placement="top">
            <Button
              size={size}
              type="text"
              icon={<EyeOutlined />}
              onClick={onView}
              disabled={disabled || !onView}
            />
          </Tooltip>
        )}

        {canPrint && onPrint && (
          <Tooltip title="In" placement="top">
            <Button
              size={size}
              type="text"
              onClick={onPrint}
              disabled={disabled || !onPrint}
              style={{ color: "var(--primary)" }}
              icon={<PrinterOutlined style={{ color: "var(--primary)" }} />}
            />
          </Tooltip>
        )}

        {canAdd && onAdd && (
          <Tooltip title="Thêm" placement="top">
            <Button
              size={size}
              type="text"
              icon={<PlusOutlined />}
              onClick={onAdd}
              disabled={disabled || !onAdd}
            />
          </Tooltip>
        )}

        {canEdit && onEdit && (
          <Tooltip title="Sửa" placement="top">
            <Button
              size={size}
              type="text"
              icon={<EditOutlined />}
              onClick={onEdit}
              disabled={disabled || !onEdit}
            />
          </Tooltip>
        )}

        {canApprove && onApprove && (
          <Tooltip title="Phê duyệt" placement="top">
            <Button
              size={size}
              type="text"
              onClick={onApprove}
              disabled={disabled || !onApprove}
              style={{ color: "var(--primary)" }}
              icon={<CheckOutlined style={{ color: "var(--primary)" }} />}
            />
          </Tooltip>
        )}

        {canDelete && onDelete && (
          <Tooltip title="Xóa" placement="top">
            <Button
              size={size}
              type="text"
              icon={<DeleteOutlined />}
              onClick={onDelete}
              danger
              disabled={disabled || !onDelete}
            />
          </Tooltip>
        )}

        {/* Render any extra custom actions */}
        {extraActions.map((a, i) =>
          a.can === false ? null : (
            <Tooltip key={`${a.title}-${i}`} title={a.title} placement="top">
              <Button
                size={size}
                type="text"
                icon={a.icon}
                onClick={a.onClick}
                disabled={disabled || !a.onClick}
              >
                {a.title}
              </Button>
            </Tooltip>
          )
        )}
      </Space>
    </div>
  );
};

export default TableActions;
