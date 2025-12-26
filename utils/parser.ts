import { InputNumberProps } from "antd";

type Parser = NonNullable<InputNumberProps['parser']>;
export const parser: Parser = (value) => {
  // `value` is the string displayed in the input (may be undefined)
  // return a string (not undefined) so it matches InputNumber's ValueType
  if (!value) return '';
  // example: strip currency and commas, return numeric string
  return value.replace(/\$\s?|(,*)/g, '');
};
