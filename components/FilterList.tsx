/* eslint-disable @typescript-eslint/no-explicit-any */
import { FilterField } from "@/types";
import {
  Button,
  Card,
  DatePicker,
  Divider,
  Empty,
  Form,
  Input,
  Select,
} from "antd";
import { FormInstance } from "antd/lib";

interface FilterListProps {
  fields: FilterField[];
  onApplyFilter: (arr: { key: string; value: any }[]) => void;
  onReset?: () => void;
  onCancel?: () => void;
  form: FormInstance<any>;
  isMobile: boolean;
}

export const FilterList: React.FC<FilterListProps> = ({
  fields,
  onApplyFilter,
  onReset,
  onCancel = () => {},
  isMobile,
  form,
}) => {
  const handleReset = () => {
    form.resetFields();
    if (onReset) {
      onReset();
    }
  };

  const handleFinish = (values: Record<string, any>) => {
    const payload: {
      key: string;
      value: any;
    }[] = [];
    Object.entries(values).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== "") {
        payload.push({ key, value });
      }
    });
    onApplyFilter(payload);
    onCancel();
  };

  const renderField = (field: FilterField) => {
    switch (field.type) {
      case "input":
        return (
          <Form.Item
            key={field.name}
            name={field.name}
            label={field.label}
            className=" mb-4"
          >
            <Input placeholder={field.placeholder || field.label} allowClear />
          </Form.Item>
        );

      case "select":
        return (
          <Form.Item
            key={field.name}
            name={field.name}
            label={field.label}
            className=" mb-4"
          >
            <Select
              mode={field.isMultiple ? "multiple" : undefined}
              options={field.options || []}
              placeholder={field.placeholder || `Chọn ${field.label}`}
              allowClear
            />
          </Form.Item>
        );

      case "date":
        return (
          <Form.Item
            key={field.name}
            name={field.name}
            label={field.label}
            className=" mb-4"
          >
            <DatePicker
              className=" w-full"
              placeholder={field.placeholder || field.label}
            />
          </Form.Item>
        );

      case "dateRange":
        return (
          <Form.Item
            key={field.name}
            name={field.name}
            label={field.label}
            className=" mb-4"
          >
            <DatePicker.RangePicker className=" w-full" />
          </Form.Item>
        );

      default:
        return null;
    }
  };

  if (fields.length === 0) {
    return <Empty description="Không có bộ lọc nào" />;
  }

  return (
    <Card>
      <div className=" flex  justify-between  items-center">
        <h3 className=" font-medium  mb-0">Bộ lọc</h3>
        {isMobile && (
          <Button
            type="link"
            onClick={handleReset}
            className="text-blue-600 hover:text-blue-800 p-0 h-auto"
          >
            Đặt lại
          </Button>
        )}
      </div>
      <Divider className=" my-2" />
      <Form layout="vertical" form={form} onFinish={handleFinish}>
        <div className={isMobile ? "" : "grid grid-cols-2 gap-x-4 w"}>
          {fields.map((field) => renderField(field))}
        </div>

        <div className="flex justify-end gap-2 mt-2">
          <Button type="primary" htmlType="submit">
            Áp dụng
          </Button>
        </div>
      </Form>
    </Card>
  );
};
