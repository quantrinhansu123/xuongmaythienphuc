import { CheckOutlined } from "@ant-design/icons";
import { theme } from "antd";
import React from "react";

const ItemColorTheme = ({
  themeColor,
  isChecked,
  title
}: {
  themeColor: string;
  isChecked: boolean;
  title: string;
}) => {
  const { token } = theme.useToken();

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
      }}
    >
      <span className="flex items-center">
        <span
          style={{
            display: "inline-block",
            width: 16,
            height: 16,
            borderRadius: "50%",
            backgroundColor: themeColor,
            marginRight: 8,
            border: "2px solid rgba(0,0,0,0.1)",
          }}
        />
        <span>{title}</span>
      </span>
      {isChecked && <CheckOutlined style={{ color: token.colorPrimary }} />}
    </div>
  );
};

export default ItemColorTheme;
