'use client'

import _, { get } from 'lodash';
import { useState } from 'react';


export type IParams = {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    [key: string]: any;
    page?: string | number;
    sort?: string;
    limit?: string;
};

export type IPagination = {
    current: number;
    limit: number;
    total?: number;
};

const searchKey = 'search';

const useFilter =(initQuery: IParams = {}) => {
    const [query, setQuery] = useState<IParams>(initQuery);
    const [pagination, setPagination] = useState({ current: 1, limit: 10 });

    const reset = () => {
        setQuery(initQuery);
        setPagination({ current: 1, limit: 10 });
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updateQuery = (key: string, value: any, resetPage = true) => {
        const validateParams = _.omitBy({ ...query, [key]: value }, (value) =>
            value === undefined || value === '' || value === null || value === 'all' || (Array.isArray(value) && value.length === 0)
        );
        setQuery(validateParams);
        // Reset về trang 1 khi thay đổi filter (trừ khi đang thay đổi page/limit)
        if (resetPage && key !== 'page' && key !== 'limit') {
            setPagination(prev => ({ ...prev, current: 1 }));
        }
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updateQueries = (params: { key: string; value: any }[], resetPage = true) => {
        const newQuery = { ...query };
        params.forEach(({ key, value }) => {
            newQuery[key] = value;
        });
        const validateParams = _.omitBy(newQuery, (value) =>
            value === undefined || value === '' || value === null || value === 'all' || (Array.isArray(value) && value.length === 0)
        );
        setQuery(validateParams);
        // Reset về trang 1 khi thay đổi filter (trừ khi chỉ thay đổi page/limit)
        const isOnlyPageChange = params.every(p => p.key === 'page' || p.key === 'limit');
        if (resetPage && !isOnlyPageChange) {
            setPagination(prev => ({ ...prev, current: 1 }));
        }
    };

    const handlePageChange = (page: number, pageSize?: number) => {
        const newPageSize = pageSize || pagination.limit;
        setPagination({ current: page,  limit: newPageSize });
        updateQuery('page', page);
        updateQuery('limit', newPageSize);
    };

    const applyFilter = <T extends object>(data: T[]) => {
        if(!data) return [];
        return data.filter(item => {
            return Object.entries(query).every(([key, value]) => {
                if(key === 'page' || key === 'limit' || key === 'sort') return true;
                const isSearchKey = key.includes(searchKey);


                // Date handling:
                // - Range: value = { from?: string|Date|number, to?: string|Date|number }
                // - Exact date: value = string|Date|number -> match same calendar day
                const isRangeObj = (() => {
                    if (!value || typeof value !== 'object') return false;
                    const obj = value as Record<string, unknown>;
                    return 'from' in obj || 'to' in obj;
                })();
                const isDateLike = (v: unknown): boolean =>
                    v instanceof Date || (typeof v === 'number' && !isNaN(v as number)) || (typeof v === 'string' && !isNaN(Date.parse(v as string)));

                if (isRangeObj) {

                    const itemVal = get(item, key);

                    if (!itemVal) return true;
                    const itemDate = new Date(itemVal);
                    if (isNaN(itemDate.getTime())) return false;

                    const from = (value.from !== undefined && value.from !== null) ? new Date(value.from) : null;
                    const to = (value.to !== undefined && value.to !== null) ? new Date(value.to) : null;

                    if (from && isNaN(from.getTime())) return false;
                    if (to && isNaN(to.getTime())) return false;
                    if (from && to) {

                        return itemDate.getTime() >= from.getTime() && itemDate.getTime() <= to.getTime();
                    }
                    if (from) return itemDate.getTime() >= from.getTime();
                    if (to) return itemDate.getTime() <= to.getTime();

                    return true;
                }

                if (isDateLike(value)) {
                    const itemVal = get(item, key);
                    if (!itemVal) return false;
                    const itemDate = new Date(itemVal);
                    if (isNaN(itemDate.getTime())) return false;

                    const target = new Date(value as string | number | Date);
                    // match same calendar day (local)
                    const start = new Date(target.getFullYear(), target.getMonth(), target.getDate(), 0, 0, 0, 0).getTime();
                    const end = new Date(target.getFullYear(), target.getMonth(), target.getDate(), 23, 59, 59, 999).getTime();
                    return itemDate.getTime() >= start && itemDate.getTime() <= end;
                }

                // If filter value is an array -> treat as multiple acceptable tokens
                if (Array.isArray(value)) {
                    if (isSearchKey) {
                        const searchFields = key.split(',').slice(1);
                        return searchFields.some(field =>
                            value.some(v =>
                                String(get(item, field) ?? '')
                                    .toLowerCase()
                                    .includes(String(v).toLowerCase())
                            )
                        );
                    }

                    const fieldVal = get(item, key);
                    // if the item's field is an array, check intersection
                    if (Array.isArray(fieldVal)) {
                        return value.some(v => fieldVal.includes(v));
                    }
                    // otherwise check if any token matches (partial match)
                    return value.some(v =>
                        String(fieldVal ?? '')
                            .toLowerCase()
                            .includes(String(v).toLowerCase())
                    );
                }

                if (isSearchKey) {
                    const searchFields = key.split(',').slice(1);
                    return searchFields.some(field =>
                        String(get(item, field) ?? '')
                            .toLowerCase()
                            .includes(String(value).toLowerCase())
                    );
                }

                return String(get(item, key) ?? '')
                    .toLowerCase()
                    .includes(String(value).toLowerCase());
            });
        });
    };

    // Reset chỉ pagination về trang 1 (dùng cho local filter state)
    const resetPage = () => {
        setPagination(prev => ({ ...prev, current: 1 }));
    };

    return { query, pagination, updateQuery, updateQueries, reset, applyFilter, handlePageChange, resetPage };
};

export default useFilter;
