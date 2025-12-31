/* eslint-disable @typescript-eslint/no-explicit-any */
import { FilterField } from "@/types";
import { DeleteOutlined } from "@ant-design/icons";
import {
  Button,
  DatePicker,
  Form,
  Input,
  Select,
} from "antd";
import { FormInstance } from "antd/lib";

interface FilterListProps {
  fields: FilterField[];
  onApplyFilter: (arr: { key: string; value: any }[]) => void;
  onReset?: () => void;
  form: FormInstance<any>;
  isMobile: boolean;
}

export const FilterList: React.FC<FilterListProps> = ({
  fields,
  onApplyFilter,
  onReset,
  isMobile,
  form,
}) => {
  // Auto apply filter khi giá trị thay đổi
  const handleValueChange = (changedValues: Record<string, any>) => {
    const payload: { key: string; value: any }[] = [];
    const allValues = form.getFieldsValue();
    
    Object.entries(allValues).forEach(([key, value]) => {
      payload.push({ key, value: value ?? "" });
    });
    
    onApplyFilter(payload);
  };

  const handleReset = () => {
    form.resetFields();
    if (onReset) {
      onReset();
    }
  };

  // Đếm số filter đang active
  const activeCount = Object.values(form.getFieldsValue() || {}).filter(v => {
    if (Array.isArray(v)) return v.length > 0;
    if (typeof v === 'string') return v.trim() !== '';
    return v !== undefined && v !== null;
  }).length;

  const renderField = (field: FilterField) => {
    const size = isMobile ? "middle" : "middle";
    const style = { minWidth: isMobile ? 140 : 160 };

    switch (field.type) {
      case "input":
        return (
          <Form.Item
            key={field.name}
            name={field.name}
            className="mb-0"
          >
            <Input 
              placeholder={field.placeholder || field.label} 
              allowClear 
              size={size}
              style={style}
            />
          </Form.Item>
        );

      case "select":
        return (
          <Form.Item
            key={field.name}
            name={field.name}
            className="mb-0"
          >
            <Select
              mode={field.isMultiple ? "multiple" : undefined}
              options={field.options || []}
              placeholder={field.placeholder || field.label}
              allowClear
              size={size}
              style={style}
              showSearch
              filterOption={(input, option) =>
                (option?.label ?? '').toString().toLowerCase().includes(input.toLowerCase())
              }
              maxTagCount={1}
            />
          </Form.Item>
        );

      case "date":
        return (
          <Form.Item
            key={field.name}
            name={field.name}
            className="mb-0"
          >
            <DatePicker
              placeholder={field.placeholder || field.label}
              size={size}
              style={style}
              inputReadOnly={isMobile}
            />
          </Form.Item>
        );

      case "dateRange":
        return (
          <Form.Item
            key={field.name}
            name={field.name}
            className="mb-0"
          >
            <DatePicker.RangePicker 
              size={size}
              style={{ minWidth: isMobile ? 200 : 240 }}
              inputReadOnly={isMobile}
              placeholder={["Từ ngày", "Đến ngày"]}
            />
          </Form.Item>
        );

      default:
        return null;
    }
  };

  if (fields.length === 0) {
    return null;
  }

  return (
    <Form 
      form={form} 
      layout="inline" 
      onValuesChange={handleValueChange}
      className="w-full"
    >
      <div className={`flex gap-2 items-center ${isMobile ? 'overflow-x-auto pb-1 -mx-1 px-1 scrollbar-thin' : 'flex-wrap'}`}>
        {fields.map((field) => renderField(field))}
        
        {onReset && activeCount > 0 && (
          <Button
            onClick={handleReset}
            icon={<DeleteOutlined />}
            danger
            type="text"
            size="middle"
          >
            {!isMobile && "Xóa lọc"}
          </Button>
        )}
      </div>
    </Form>
  );
};
