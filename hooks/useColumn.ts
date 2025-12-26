'use client';

import { ColumnSetting } from '@/types';
import { TableColumnsType } from 'antd';
import { useState } from 'react';

interface UseColumnOptions {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  defaultColumns: TableColumnsType<any>;
}

const useColumn = ({ defaultColumns }: UseColumnOptions) => {
  const [columnsCheck, setColumnsCheck] = useState<ColumnSetting[]>(defaultColumns.map(col => ({
    key: col.key?.toString() || '',
    title: typeof col.title === 'string' ? col.title : '',
    visible: true,
  })));

  const updateColumns = (newColumns: ColumnSetting[]) => {
    setColumnsCheck(newColumns);
  };

  const toggleColumn = (key: string) => {
    setColumnsCheck((prev) =>
      prev.map((col) =>
        col.key === key ? { ...col, visible: !col.visible } : col
      )
    );
  };


  const resetColumns = () => {
    setColumnsCheck(defaultColumns.map(col => ({
      key: col.key?.toString() || '',
      title: typeof col.title === 'string' ? col.title : '',
      visible: true,
    })));
  };

  const getVisibleColumns = () => {
    return defaultColumns.filter((col) => {
      const setting = columnsCheck.find((c) => c.key === col.key);
      return setting?.visible ?? true;
    });
  };

  return {
    columnsCheck,
    updateColumns,
    toggleColumn,
    resetColumns,
    getVisibleColumns,
  };
};

export default useColumn;
