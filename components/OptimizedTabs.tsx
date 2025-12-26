'use client';

import { ReactNode, useEffect, useState } from 'react';

interface Tab {
  key: string;
  label: string;
  icon?: ReactNode;
  children: ReactNode;
}

interface OptimizedTabsProps {
  tabs: Tab[];
  defaultActiveKey?: string;
  onChange?: (key: string) => void;
  className?: string;
}

/**
 * Component Tabs tối ưu - giữ lại DOM của các tab đã render
 * Giúp chuyển tab nhanh hơn vì không cần re-render lại
 */
export default function OptimizedTabs({ 
  tabs, 
  defaultActiveKey, 
  onChange,
  className = '' 
}: OptimizedTabsProps) {
  const [activeKey, setActiveKey] = useState(defaultActiveKey || tabs[0]?.key);
  const [renderedTabs, setRenderedTabs] = useState<Set<string>>(new Set([activeKey]));

  useEffect(() => {
    // Đánh dấu tab hiện tại đã được render
    setRenderedTabs(prev => new Set([...prev, activeKey]));
  }, [activeKey]);

  const handleTabChange = (key: string) => {
    setActiveKey(key);
    onChange?.(key);
  };

  return (
    <div className={`optimized-tabs ${className}`}>
      {/* Tab Headers */}
      <div className="bg-white rounded-t-lg shadow">
        <div className="border-b border-gray-200">
          <nav className="flex -mb-px">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => handleTabChange(tab.key)}
                className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                  activeKey === tab.key
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab.icon && <span className="mr-2">{tab.icon}</span>}
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Tab Content - Giữ lại DOM của các tab đã render */}
      <div className="bg-white rounded-b-lg shadow">
        {tabs.map((tab) => (
          <div
            key={tab.key}
            style={{ display: activeKey === tab.key ? 'block' : 'none' }}
            className="p-6"
          >
            {/* Chỉ render nội dung nếu tab đã được active ít nhất 1 lần */}
            {renderedTabs.has(tab.key) && tab.children}
          </div>
        ))}
      </div>
    </div>
  );
}
