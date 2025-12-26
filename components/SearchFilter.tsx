'use client';

import { useState } from 'react';

interface SearchFilterProps {
  searchValue: string;
  onSearchChange: (value: string) => void;
  filterContent?: React.ReactNode;
  placeholder?: string;
  actionButton?: React.ReactNode;
}

export default function SearchFilter({ 
  searchValue, 
  onSearchChange, 
  filterContent,
  placeholder = 'Tìm kiếm...',
  actionButton
}: SearchFilterProps) {
  const [showFilter, setShowFilter] = useState(false);

  return (
    <div className="mb-4 space-y-3">
      <div className="flex gap-3 items-center">
        {/* Search Box - Ngắn lại */}
        <div className="w-80 relative">
          <input
            type="text"
            value={searchValue}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={placeholder}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
            🔍
          </span>
        </div>

        {/* Filter Toggle Button */}
        {filterContent && (
          <button
            onClick={() => setShowFilter(!showFilter)}
            className={`px-4 py-2 border rounded-lg transition-colors ${
              showFilter 
                ? 'bg-blue-600 text-white border-blue-600' 
                : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
            }`}
          >
            <span className="mr-2">🔽</span>
            Lọc
          </button>
        )}

        {/* Spacer */}
        <div className="flex-1" />

        {/* Action Button (Thêm mới, etc.) */}
        {actionButton}
      </div>

      {/* Filter Panel */}
      {showFilter && filterContent && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          {filterContent}
        </div>
      )}
    </div>
  );
}
